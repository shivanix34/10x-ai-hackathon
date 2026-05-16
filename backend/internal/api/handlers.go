package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"marketplace-orchestrator/internal/behavior"
	"marketplace-orchestrator/internal/cache"
	"marketplace-orchestrator/internal/consumption"
	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/events"
	"marketplace-orchestrator/internal/models"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/quota"
	"marketplace-orchestrator/internal/routing"
	ws "marketplace-orchestrator/internal/websocket"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func NewRouter(hub *ws.Hub) http.Handler {
	r := mux.NewRouter()

	// Health
	r.HandleFunc("/api/health", healthHandler).Methods("GET")

	// Sellers
	r.HandleFunc("/api/sellers", listSellersHandler).Methods("GET")
	r.HandleFunc("/api/sellers/{id}", getSellerHandler).Methods("GET")
	r.HandleFunc("/api/sellers/{id}/leads", getSellerLeadsHandler).Methods("GET")
	r.HandleFunc("/api/sellers/{id}/quota", getSellerQuotaHandler).Methods("GET")
	r.HandleFunc("/api/sellers/{id}/events", getSellerEventsHandler).Methods("GET")
	r.HandleFunc("/api/sellers/{id}/behavior", getSellerBehaviorHandler).Methods("GET")

	// Leads
	r.HandleFunc("/api/leads", listLeadsHandler).Methods("GET")
	r.HandleFunc("/api/leads/{id}", getLeadHandler).Methods("GET")
	r.HandleFunc("/api/leads/{id}/consume", makeConsumeHandler(hub)).Methods("POST")

	// Dashboard
	r.HandleFunc("/api/dashboard/sales", salesDashboardHandler).Methods("GET")
	r.HandleFunc("/api/dashboard/monitoring", makeMonitoringHandler(hub)).Methods("GET")

	// Interventions
	r.HandleFunc("/api/interventions", listInterventionsHandler).Methods("GET")
	r.HandleFunc("/api/interventions/{id}/resolve", resolveInterventionHandler).Methods("POST")
	r.HandleFunc("/api/interventions/{id}/unbookmark", unbookmarkInterventionHandler).Methods("POST")

	// Bookmark (creates intervention from sales console)
	r.HandleFunc("/api/sellers/{id}/bookmark", bookmarkSellerHandler).Methods("POST")

	// Churn Analysis
	r.HandleFunc("/api/dashboard/churn-analysis", churnAnalysisHandler).Methods("GET")
	r.HandleFunc("/api/dashboard/churn-sellers", churnSellersHandler).Methods("GET")

	// Recommendation tracker
	r.HandleFunc("/api/sellers/{id}/track-recommendation", trackRecommendationHandler).Methods("POST")

	// Simulation
	r.HandleFunc("/api/simulate/event", makeSimulateEventHandler(hub)).Methods("POST")
	r.HandleFunc("/api/simulate/lead", makeSimulateLeadHandler(hub)).Methods("POST")

	// WebSocket
	r.HandleFunc("/ws", hub.HandleWS)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	return c.Handler(r)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, 200, map[string]string{"status": "ok", "service": "marketplace-orchestrator"})
}

func listSellersHandler(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 5000 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	persona := r.URL.Query().Get("persona")
	category := r.URL.Query().Get("category")

	query := `SELECT s.seller_id, s.company_name, s.city, s.state, s.service_name,
	           s.persona_type, s.primary_category, s.seller_rating,
	           COALESCE(b.health_score,0), COALESCE(b.engagement_score,0),
	           COALESCE(b.churn_risk,'Medium'), COALESCE(b.routing_priority,50)
	          FROM sellers s
	          LEFT JOIN seller_behavior_state b ON s.seller_id = b.seller_id
	          WHERE 1=1`
	args := []interface{}{}
	argIdx := 1
	if persona != "" {
		query += ` AND s.persona_type = $` + strconv.Itoa(argIdx)
		args = append(args, persona)
		argIdx++
	}
	if category != "" {
		query += ` AND s.primary_category = $` + strconv.Itoa(argIdx)
		args = append(args, category)
		argIdx++
	}
	query += ` ORDER BY COALESCE(b.routing_priority, 50) DESC LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type SellerSummary struct {
		SellerID        int64   `json:"seller_id"`
		CompanyName     string  `json:"company_name"`
		City            string  `json:"city"`
		State           string  `json:"state"`
		ServiceName     string  `json:"service_name"`
		PersonaType     string  `json:"persona_type"`
		PrimaryCategory string  `json:"primary_category"`
		SellerRating    float64 `json:"seller_rating"`
		HealthScore     float64 `json:"health_score"`
		EngagementScore float64 `json:"engagement_score"`
		ChurnRisk       string  `json:"churn_risk"`
		RoutingPriority float64 `json:"routing_priority"`
	}
	var sellers []SellerSummary
	for rows.Next() {
		var s SellerSummary
		rows.Scan(&s.SellerID, &s.CompanyName, &s.City, &s.State, &s.ServiceName,
			&s.PersonaType, &s.PrimaryCategory, &s.SellerRating,
			&s.HealthScore, &s.EngagementScore, &s.ChurnRisk, &s.RoutingPriority)
		sellers = append(sellers, s)
	}

	var total int
	db.DB.QueryRow("SELECT COUNT(*) FROM sellers").Scan(&total)
	respondJSON(w, 200, map[string]interface{}{"sellers": sellers, "total": total})
}

func getSellerHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	var s models.Seller
	err := db.DB.QueryRow(`SELECT seller_id, company_name, city, state, business_type,
		years_active, service_name, weekly_bl_allocation, revenue_band, persona_type,
		catalog_quality_score, total_products, active_categories,
		avg_weekly_leads, avg_weekly_lead_consumption, avg_response_rate,
		avg_response_time_mins, preferred_platform, seller_rating,
		engagement_score, seller_health_score, churn_risk, upsell_probability,
		last_active_days_ago, notification_open_rate, support_ticket_count,
		preferred_market, primary_category, secondary_categories
		FROM sellers WHERE seller_id = $1`, id).Scan(
		&s.SellerID, &s.CompanyName, &s.City, &s.State, &s.BusinessType,
		&s.YearsActive, &s.ServiceName, &s.WeeklyBLAllocation, &s.RevenueBand,
		&s.PersonaType, &s.CatalogQualityScore, &s.TotalProducts, &s.ActiveCategories,
		&s.AvgWeeklyLeads, &s.AvgWeeklyLeadConsumption, &s.AvgResponseRate,
		&s.AvgResponseTimeMins, &s.PreferredPlatform, &s.SellerRating,
		&s.EngagementScore, &s.SellerHealthScore, &s.ChurnRisk, &s.UpsellProbability,
		&s.LastActiveDaysAgo, &s.NotificationOpenRate, &s.SupportTicketCount,
		&s.PreferredMarket, &s.PrimaryCategory, &s.SecondaryCategories,
	)
	if err != nil {
		respondJSON(w, 404, map[string]string{"error": "seller not found"})
		return
	}

	bs, _ := behavior.GetBehaviorState(id)
	q, _ := quota.GetQuota(id)
	leads, _ := routing.GetRoutedLeadsForSeller(id)

	respondJSON(w, 200, map[string]interface{}{
		"seller": s, "behavior_state": bs, "quota": q, "active_leads": leads,
	})
}

func getSellerLeadsHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	leads, err := routing.GetRoutedLeadsForSeller(id)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	if leads == nil {
		leads = []models.LeadPacket{}
	}
	respondJSON(w, 200, map[string]interface{}{"leads": leads, "count": len(leads)})
}

func getSellerQuotaHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	q, err := quota.GetQuota(id)
	if err != nil {
		respondJSON(w, 404, map[string]string{"error": "quota not found"})
		return
	}
	respondJSON(w, 200, q)
}

func getSellerEventsHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}
	rows, err := db.DB.Query(`
		SELECT event_id, timestamp, seller_id, company_name, persona_type,
		       service_name, city, event_type, event_source, event_value, metadata
		FROM seller_events WHERE seller_id = $1
		ORDER BY timestamp DESC LIMIT $2
	`, id, limit)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	var evts []models.SellerEvent
	for rows.Next() {
		var e models.SellerEvent
		rows.Scan(&e.EventID, &e.Timestamp, &e.SellerID, &e.CompanyName,
			&e.PersonaType, &e.ServiceName, &e.City, &e.EventType,
			&e.EventSource, &e.EventValue, &e.Metadata)
		evts = append(evts, e)
	}
	respondJSON(w, 200, map[string]interface{}{"events": evts, "count": len(evts)})
}

func getSellerBehaviorHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)
	bs, err := behavior.GetBehaviorState(id)
	if err != nil {
		respondJSON(w, 404, map[string]string{"error": "behavior state not found"})
		return
	}
	respondJSON(w, 200, bs)
}

func listLeadsHandler(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	status := r.URL.Query().Get("status")
	query := `SELECT lead_id, timestamp, buyer_city, buyer_state, product_name,
	           category, subcategory, quantity, order_value_rs, buyer_type,
	           intent_score, lead_quality, urgency, status FROM leads WHERE 1=1`
	args := []interface{}{}
	idx := 1
	if status != "" {
		query += ` AND status = $` + strconv.Itoa(idx)
		args = append(args, status)
		idx++
	}
	query += ` ORDER BY timestamp DESC LIMIT $` + strconv.Itoa(idx)
	args = append(args, limit)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type LeadSummary struct {
		LeadID      string    `json:"lead_id"`
		Timestamp   time.Time `json:"timestamp"`
		BuyerCity   string    `json:"buyer_city"`
		BuyerState  string    `json:"buyer_state"`
		ProductName string    `json:"product_name"`
		Category    string    `json:"category"`
		Subcategory string    `json:"subcategory"`
		Quantity    int       `json:"quantity"`
		OrderValue  float64   `json:"order_value_rs"`
		BuyerType   string    `json:"buyer_type"`
		IntentScore float64   `json:"intent_score"`
		LeadQuality string    `json:"lead_quality"`
		Urgency     string    `json:"urgency"`
		Status      string    `json:"status"`
	}
	var leads []LeadSummary
	for rows.Next() {
		var l LeadSummary
		rows.Scan(&l.LeadID, &l.Timestamp, &l.BuyerCity, &l.BuyerState,
			&l.ProductName, &l.Category, &l.Subcategory, &l.Quantity,
			&l.OrderValue, &l.BuyerType, &l.IntentScore, &l.LeadQuality,
			&l.Urgency, &l.Status)
		leads = append(leads, l)
	}
	respondJSON(w, 200, map[string]interface{}{"leads": leads, "count": len(leads)})
}

func getLeadHandler(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	lead, routings, err := routing.GetLeadWithRouting(id)
	if err != nil {
		respondJSON(w, 404, map[string]string{"error": "lead not found"})
		return
	}
	respondJSON(w, 200, map[string]interface{}{"lead": lead, "routings": routings})
}

func makeConsumeHandler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		leadID := mux.Vars(r)["id"]
		var body struct {
			SellerID int64 `json:"seller_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			respondJSON(w, 400, map[string]string{"error": "invalid request"})
			return
		}

		result, err := consumption.ConsumeLead(r.Context(), leadID, body.SellerID)
		if err != nil {
			respondJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		if result.Success {
			// Push WebSocket updates
			hub.BroadcastToSeller(body.SellerID, ws.Message{
				Type: "LEAD_CONSUMED_SUCCESS",
				Data: result,
			})
			// Trigger behavioral mutation for the consuming seller
			behavior.MutateSellerState(body.SellerID, "LEAD_CONSUMED", 1)
			respondJSON(w, 200, result)
		} else {
			respondJSON(w, 409, result)
		}
	}
}

func salesDashboardHandler(w http.ResponseWriter, r *http.Request) {
	// High risk sellers
	var highRisk []models.SellerBehaviorState
	rows, _ := db.DB.Query(`
		SELECT b.seller_id, b.health_score, b.engagement_score, b.churn_risk,
		       b.response_efficiency, b.quota_utilization, b.routing_priority,
		       b.recommendation, b.intervention_status, b.last_updated
		FROM seller_behavior_state b
		WHERE b.churn_risk = 'High'
		ORDER BY b.health_score ASC LIMIT 20
	`)
	if rows != nil {
		for rows.Next() {
			var s models.SellerBehaviorState
			rows.Scan(&s.SellerID, &s.HealthScore, &s.EngagementScore, &s.ChurnRisk,
				&s.ResponseEfficiency, &s.QuotaUtilization, &s.RoutingPriority,
				&s.Recommendation, &s.InterventionStatus, &s.LastUpdated)
			highRisk = append(highRisk, s)
		}
		rows.Close()
	}

	// Segmentation
	seg := make(map[string]int)
	segRows, _ := db.DB.Query(`SELECT persona_type, COUNT(*) FROM sellers GROUP BY persona_type`)
	if segRows != nil {
		for segRows.Next() {
			var pt string
			var c int
			segRows.Scan(&pt, &c)
			seg[pt] = c
		}
		segRows.Close()
	}

	// Interventions
	var interventions []models.Intervention
	iRows, _ := db.DB.Query(`
		SELECT i.id, i.seller_id, COALESCE(s.company_name,''), i.intervention_type,
		       i.reason, i.priority, i.status, i.created_at
		FROM interventions i
		LEFT JOIN sellers s ON i.seller_id = s.seller_id
		WHERE i.status = 'PENDING' ORDER BY i.created_at DESC LIMIT 20
	`)
	if iRows != nil {
		for iRows.Next() {
			var inv models.Intervention
			iRows.Scan(&inv.ID, &inv.SellerID, &inv.CompanyName, &inv.InterventionType,
				&inv.Reason, &inv.Priority, &inv.Status, &inv.CreatedAt)
			interventions = append(interventions, inv)
		}
		iRows.Close()
	}

	var lazyCount, churningCount, totalActive int
	var avgHealth float64
	db.DB.QueryRow(`SELECT COUNT(*) FROM sellers WHERE persona_type='Lazy Seller'`).Scan(&lazyCount)
	db.DB.QueryRow(`SELECT COUNT(*) FROM sellers WHERE persona_type='Churning Seller'`).Scan(&churningCount)
	db.DB.QueryRow(`SELECT COUNT(*) FROM sellers WHERE service_name != 'Free'`).Scan(&totalActive)
	db.DB.QueryRow(`SELECT COALESCE(AVG(health_score),0) FROM seller_behavior_state`).Scan(&avgHealth)

	// Recent activity
	var activity []models.SellerEvent
	aRows, _ := db.DB.Query(`SELECT event_id, timestamp, seller_id, company_name,
		persona_type, service_name, city, event_type, event_source, event_value, metadata
		FROM seller_events ORDER BY timestamp DESC LIMIT 20`)
	if aRows != nil {
		for aRows.Next() {
			var e models.SellerEvent
			aRows.Scan(&e.EventID, &e.Timestamp, &e.SellerID, &e.CompanyName,
				&e.PersonaType, &e.ServiceName, &e.City, &e.EventType,
				&e.EventSource, &e.EventValue, &e.Metadata)
			activity = append(activity, e)
		}
		aRows.Close()
	}

	respondJSON(w, 200, models.SalesDashboardData{
		HighRiskSellers:    highRisk,
		LazySellerCount:    lazyCount,
		ChurningCount:      churningCount,
		Interventions:      interventions,
		SellerSegmentation: seg,
		TotalActiveSellers: totalActive,
		AvgHealthScore:     avgHealth,
		RecentActivity:     activity,
	})
}

func makeMonitoringHandler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		queueNames := []string{mq.QueueBuyLeadEvents, mq.QueueSellerActivity, mq.QueueScoringEvents, mq.QueueRecommendation, mq.QueueIntervention}
		depths := make(map[string]int)
		for _, q := range queueNames {
			d, _ := mq.GetQueueDepth(q)
			depths[q] = d
		}

		lockAcq, _ := cache.RDB.Get(ctx, "metrics:lock_acquisitions").Int64()
		leadsConsumed, _ := cache.RDB.Get(ctx, "metrics:leads_consumed").Int64()
		leadsRouted, _ := cache.RDB.Get(ctx, "metrics:leads_routed").Int64()

		respondJSON(w, 200, models.MonitoringData{
			QueueDepths:      depths,
			WSConnections:    hub.GetConnectionCount(),
			EventsProcessed:  atomic.LoadInt64(&events.EventsProcessed),
			LeadsRouted:      leadsRouted,
			LeadsConsumed:    leadsConsumed,
			ActiveConsumers:  5,
			MutationCount:    atomic.LoadInt64(&events.MutationCount),
			LockAcquisitions: lockAcq,
		})
	}
}

func listInterventionsHandler(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "PENDING"
	}
	rows, err := db.DB.Query(`
		SELECT i.id, i.seller_id, COALESCE(s.company_name,''), i.intervention_type,
		       i.reason, i.priority, i.status, i.created_at
		FROM interventions i
		LEFT JOIN sellers s ON i.seller_id = s.seller_id
		WHERE i.status = $1 ORDER BY i.created_at DESC LIMIT 50
	`, status)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []models.Intervention
	for rows.Next() {
		var inv models.Intervention
		rows.Scan(&inv.ID, &inv.SellerID, &inv.CompanyName, &inv.InterventionType,
			&inv.Reason, &inv.Priority, &inv.Status, &inv.CreatedAt)
		list = append(list, inv)
	}
	respondJSON(w, 200, map[string]interface{}{"interventions": list, "count": len(list)})
}

func resolveInterventionHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])
	var sellerID int64
	err := db.DB.QueryRow(`UPDATE interventions SET status='RESOLVED', resolved_at=NOW() WHERE id=$1 RETURNING seller_id`, id).Scan(&sellerID)
	if err == sql.ErrNoRows {
		respondJSON(w, 404, map[string]string{"error": "intervention not found"})
		return
	}
	// Update seller behavior state
	db.DB.Exec(`UPDATE seller_behavior_state SET intervention_status='RESOLVED' WHERE seller_id=$1`, sellerID)
	behavior.MutateSellerState(sellerID, "INTERVENTION_RESOLVED", 1)
	respondJSON(w, 200, map[string]string{"status": "resolved"})
}

func unbookmarkInterventionHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(mux.Vars(r)["id"])
	_, err := db.DB.Exec(`DELETE FROM interventions WHERE id=$1`, id)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, 200, map[string]string{"status": "removed"})
}

func bookmarkSellerHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)

	var body struct {
		Reason string `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "Bookmarked by sales team for review"
	}

	var intID int
	err := db.DB.QueryRow(`
		INSERT INTO interventions (seller_id, intervention_type, reason, priority, status)
		VALUES ($1, 'SALES_REVIEW', $2, 'HIGH', 'PENDING')
		RETURNING id
	`, id, body.Reason).Scan(&intID)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, 200, map[string]interface{}{"status": "bookmarked", "intervention_id": intID})
}

func churnAnalysisHandler(w http.ResponseWriter, r *http.Request) {
	type ChurnFactor struct {
		Factor     string  `json:"factor"`
		Count      int     `json:"count"`
		Percentage float64 `json:"percentage"`
	}

	// Query churning sellers (persona_type='Churning Seller') with all relevant scores
	// This ensures total_high_risk matches the Churning count on the dashboard
	rows, err := db.DB.Query(`
		SELECT bs.seller_id, COALESCE(s.catalog_quality_score,50),
		       COALESCE(bs.engagement_score,50), COALESCE(bs.response_efficiency,50),
		       COALESCE(bs.quota_utilization,50), COALESCE(s.support_ticket_count,0)
		FROM seller_behavior_state bs
		JOIN sellers s ON s.seller_id = bs.seller_id
		WHERE s.persona_type='Churning Seller'
	`)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	counts := map[string]int{
		"low_catalog":   0,
		"low_engagement": 0,
		"low_response":  0,
		"low_quota":     0,
		"high_tickets":  0,
	}
	totalHR := 0

	for rows.Next() {
		var sellerID int64
		var catalogScore, engScore, respEff, quotaUtil float64
		var ticketCount int
		rows.Scan(&sellerID, &catalogScore, &engScore, &respEff, &quotaUtil, &ticketCount)

		if catalogScore < 40 {
			counts["low_catalog"]++
			totalHR++
		}
		if engScore < 30 {
			counts["low_engagement"]++
			totalHR++
		}
		if respEff < 30 {
			counts["low_response"]++
			totalHR++
		}
		if quotaUtil < 20 {
			counts["low_quota"]++
			totalHR++
		}
		if ticketCount > 3 {
			counts["high_tickets"]++
			totalHR++
		}
	}

	if totalHR == 0 {
		totalHR = 1 // prevent div by 0 in percentage
	}

	pct := func(n int) float64 { return float64(n) / float64(totalHR) * 100 }

	factors := []ChurnFactor{
		{"Low Catalog Score (<40)", counts["low_catalog"], pct(counts["low_catalog"])},
		{"Low Engagement (<30)", counts["low_engagement"], pct(counts["low_engagement"])},
		{"Poor Response Rate (<30%)", counts["low_response"], pct(counts["low_response"])},
		{"Low Buylead Consumption (<20%)", counts["low_quota"], pct(counts["low_quota"])},
		{"High Support Tickets (>3)", counts["high_tickets"], pct(counts["high_tickets"])},
	}

	respondJSON(w, 200, map[string]interface{}{
		"total_high_risk": totalHR,
		"factors":         factors,
	})
}

func estimateServiceRevenue(serviceName string) float64 {
	// Annual subscription revenue from updated_service_revenue_dataset_hackathon.csv (annual_price_1_year_rs)
	switch serviceName {
	case "Free":
		return 0
	case "Mini Dynamic Catalog (Monthly)":
		return 48000
	case "Mini Dynamic Catalog (Annual)":
		return 32000
	case "Trustseal Pro":
		return 50000
	case "Maximiser Pro":
		return 75000
	case "IM Star Pro":
		return 100000
	case "IM Leader Pro":
		return 200000
	case "IM IL":
		return 750000
	default:
		return 0
	}
}

func churnSellersHandler(w http.ResponseWriter, r *http.Request) {
	factor := r.URL.Query().Get("factor")
	if factor == "" {
		respondJSON(w, 400, map[string]string{"error": "factor param required"})
		return
	}

	// All queries now also fetch service_name and revenue_band
	baseSelect := `SELECT bs.seller_id, COALESCE(s.company_name,''), bs.health_score, bs.engagement_score,
		s.catalog_quality_score, s.service_name, s.revenue_band
		FROM seller_behavior_state bs JOIN sellers s ON s.seller_id = bs.seller_id`

	var query string
	switch factor {
	case "low_catalog":
		query = baseSelect + ` WHERE bs.churn_risk='High' AND s.catalog_quality_score < 40
			ORDER BY s.catalog_quality_score ASC LIMIT 50`
	case "low_engagement":
		query = baseSelect + ` WHERE bs.churn_risk='High' AND bs.engagement_score < 30
			ORDER BY bs.engagement_score ASC LIMIT 50`
	case "low_response":
		query = baseSelect + ` WHERE bs.churn_risk='High' AND bs.response_efficiency < 30
			ORDER BY bs.response_efficiency ASC LIMIT 50`
	case "low_quota":
		query = baseSelect + ` WHERE bs.churn_risk='High' AND bs.quota_utilization < 20
			ORDER BY bs.quota_utilization ASC LIMIT 50`
	case "high_tickets":
		query = baseSelect + ` WHERE bs.churn_risk='High' AND s.support_ticket_count > 3
			ORDER BY s.support_ticket_count DESC LIMIT 50`
	default:
		respondJSON(w, 400, map[string]string{"error": "unknown factor"})
		return
	}

	rows, err := db.DB.Query(query)
	if err != nil {
		respondJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type FactorSeller struct {
		SellerID       int64   `json:"seller_id"`
		CompanyName    string  `json:"company_name"`
		HealthScore    float64 `json:"health_score"`
		Engagement     float64 `json:"engagement_score"`
		CatalogScore   float64 `json:"catalog_score"`
		ServiceName    string  `json:"service_name"`
		RevenueBand    string  `json:"revenue_band"`
		EstRevenueLoss float64 `json:"est_revenue_loss"`
	}

	var sellers []FactorSeller
	var totalRevenueLoss float64
	for rows.Next() {
		var s FactorSeller
		rows.Scan(&s.SellerID, &s.CompanyName, &s.HealthScore, &s.Engagement,
			&s.CatalogScore, &s.ServiceName, &s.RevenueBand)
		s.EstRevenueLoss = estimateServiceRevenue(s.ServiceName)
		totalRevenueLoss += s.EstRevenueLoss
		sellers = append(sellers, s)
	}
	respondJSON(w, 200, map[string]interface{}{
		"sellers":            sellers,
		"count":              len(sellers),
		"total_revenue_loss": totalRevenueLoss,
	})
}

func trackRecommendationHandler(w http.ResponseWriter, r *http.Request) {
	sellerID, _ := strconv.ParseInt(mux.Vars(r)["id"], 10, 64)

	// Get leads consumed by this seller and their total value
	var consumedCount int
	var totalRevenue float64
	db.DB.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(l.order_value_rs), 0)
		FROM leads l WHERE l.consumed_by = $1 AND l.status = 'consumed'
	`, sellerID).Scan(&consumedCount, &totalRevenue)

	// Get seller's baseline weekly lead value for comparison
	var avgWeeklyLeads float64
	var avgConsumption float64
	db.DB.QueryRow(`
		SELECT COALESCE(avg_weekly_leads, 0), COALESCE(avg_weekly_lead_consumption, 0)
		FROM sellers WHERE seller_id = $1
	`, sellerID).Scan(&avgWeeklyLeads, &avgConsumption)

	// Performance improvement: ratio of actual consumption to average
	perfImprove := 0.0
	if avgConsumption > 0 {
		perfImprove = (float64(consumedCount) / avgConsumption - 1.0) * 100
		if perfImprove < 0 {
			perfImprove = 0
		}
		if perfImprove > 200 {
			perfImprove = 200
		}
	} else if consumedCount > 0 {
		perfImprove = float64(consumedCount) * 15 // 15% per lead consumed from zero baseline
	}

	respondJSON(w, 200, map[string]interface{}{
		"leads_consumed":         consumedCount,
		"total_revenue":          totalRevenue,
		"performance_improvement": perfImprove,
	})
}

func makeSimulateEventHandler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			SellerID  int64   `json:"seller_id"`
			EventType string  `json:"event_type"`
			Value     float64 `json:"event_value"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			respondJSON(w, 400, map[string]string{"error": "invalid request"})
			return
		}
		// Publish to RabbitMQ for processing
		evt, _ := json.Marshal(map[string]interface{}{
			"type": body.EventType, "seller_id": body.SellerID,
			"event_value": body.Value, "timestamp": time.Now(),
		})
		mq.Publish(mq.QueueSellerActivity, evt)
		respondJSON(w, 200, map[string]string{"status": "event published"})
	}
}
func makeSimulateLeadHandler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			LeadID string `json:"lead_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			respondJSON(w, 400, map[string]string{"error": "invalid request"})
			return
		}

		// If no LeadID provided, pick a random unrouted one
		if body.LeadID == "" {
			ids, _ := routing.GetUnroutedLeads(1)
			if len(ids) > 0 {
				body.LeadID = ids[0]
			}
		}

		if body.LeadID == "" {
			respondJSON(w, 404, map[string]string{"error": "no leads to simulate"})
			return
		}

		routings, err := routing.RouteLeadToSellers(body.LeadID)
		if err != nil {
			respondJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		if len(routings) == 0 {
			respondJSON(w, 200, map[string]string{"status": "lead skipped (no matches)"})
			return
		}

		// Broadcast to sellers
		lead, _, _ := routing.GetLeadWithRouting(body.LeadID)
		for _, r := range routings {
			hub.BroadcastToSeller(r.SellerID, ws.Message{
				Type: "NEW_LEAD",
				Data: map[string]interface{}{
					"lead":          lead,
					"routing_id":    r.ID,
					"routing_score": r.RoutingScore,
					"seller_id":     r.SellerID,
				},
			})
		}

		respondJSON(w, 200, map[string]interface{}{"status": "lead routed", "sellers_count": len(routings)})
	}
}
