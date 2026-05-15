package routing

import (
	"database/sql"
	"encoding/json"
	"log"
	"math"
	"sort"
	"time"

	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/models"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/quota"
)

const MaxSellersPerLead = 5

type ScoredSeller struct {
	SellerID       int64
	CompanyName    string
	MatchScore     float64
	HealthScore    float64
	EngagementScore float64
	ResponseRate   float64
	ResponseTime   float64
	ChurnRisk      string
	ServiceName    string
	RoutingPriority float64
	CompositeScore float64
}

// RouteLeadToSellers finds top 5 eligible sellers for a lead and creates routing entries
func RouteLeadToSellers(leadID string) ([]models.LeadRouting, error) {
	start := time.Now()

	// Get candidate sellers from match table with behavior state
	rows, err := db.DB.Query(`
		SELECT
			m.seller_id, m.company_name, m.match_score,
			COALESCE(b.health_score, s.seller_health_score) as health_score,
			COALESCE(b.engagement_score, s.engagement_score) as engagement_score,
			s.avg_response_rate, s.avg_response_time_mins,
			COALESCE(b.churn_risk, s.churn_risk) as churn_risk,
			s.service_name,
			COALESCE(b.routing_priority, 50) as routing_priority
		FROM lead_seller_matches m
		JOIN sellers s ON m.seller_id = s.seller_id
		LEFT JOIN seller_behavior_state b ON m.seller_id = b.seller_id
		WHERE m.lead_id = $1
		  AND s.service_name != 'Free'
		ORDER BY m.match_score DESC
		LIMIT 50
	`, leadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []ScoredSeller
	for rows.Next() {
		var ss ScoredSeller
		err := rows.Scan(
			&ss.SellerID, &ss.CompanyName, &ss.MatchScore,
			&ss.HealthScore, &ss.EngagementScore,
			&ss.ResponseRate, &ss.ResponseTime,
			&ss.ChurnRisk, &ss.ServiceName, &ss.RoutingPriority,
		)
		if err != nil {
			continue
		}
		candidates = append(candidates, ss)
	}

	// Filter by quota eligibility
	var eligible []ScoredSeller
	for _, c := range candidates {
		ok, err := quota.IsEligible(c.SellerID)
		if err != nil || !ok {
			continue
		}
		eligible = append(eligible, c)
	}

	if len(eligible) == 0 {
		// Mark as routed/skipped so simulator doesn't get stuck in a loop
		db.DB.Exec(`UPDATE leads SET routed = true, status = 'SKIPPED' WHERE lead_id = $1`, leadID)
		return nil, nil
	}

	// Compute composite routing score
	for i := range eligible {
		eligible[i].CompositeScore = computeRoutingScore(eligible[i])
	}

	// Sort by composite score descending
	sort.Slice(eligible, func(i, j int) bool {
		return eligible[i].CompositeScore > eligible[j].CompositeScore
	})

	// Select top 5
	topN := MaxSellersPerLead
	if len(eligible) < topN {
		topN = len(eligible)
	}
	selected := eligible[:topN]

	// Create routing entries in DB
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var routings []models.LeadRouting
	for _, s := range selected {
		var routingID int
		err := tx.QueryRow(`
			INSERT INTO lead_routing (lead_id, seller_id, routing_score, status)
			VALUES ($1, $2, $3, 'PENDING')
			ON CONFLICT (lead_id, seller_id) DO NOTHING
			RETURNING id
		`, leadID, s.SellerID, s.CompositeScore).Scan(&routingID)
		if err != nil {
			continue
		}

		routings = append(routings, models.LeadRouting{
			ID:           routingID,
			LeadID:       leadID,
			SellerID:     s.SellerID,
			RoutingScore: s.CompositeScore,
			RoutedAt:     time.Now(),
			Status:       "PENDING",
		})
	}

	// Mark lead as routed
	_, err = tx.Exec(`UPDATE leads SET routed = true, status = 'ROUTED' WHERE lead_id = $1`, leadID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Emit routing event to RabbitMQ
	routingEvent := map[string]interface{}{
		"type":          "ROUTING_COMPLETED",
		"lead_id":       leadID,
		"seller_count":  len(routings),
		"routing_time_ms": time.Since(start).Milliseconds(),
		"timestamp":     time.Now(),
	}
	if data, err := json.Marshal(routingEvent); err == nil {
		mq.Publish(mq.QueueScoringEvents, data)
	}

	log.Printf("[ROUTING] Lead %s routed to %d sellers in %v", leadID, len(routings), time.Since(start))
	return routings, nil
}

// computeRoutingScore calculates the composite routing score for a seller
func computeRoutingScore(s ScoredSeller) float64 {
	// Normalize scores to 0-1 range
	matchNorm := s.MatchScore / 100.0
	healthNorm := s.HealthScore / 100.0
	engagementNorm := s.EngagementScore / 100.0
	responseRateNorm := s.ResponseRate / 100.0
	priorityNorm := s.RoutingPriority / 100.0

	// Response time: lower is better (cap at 120 mins)
	responseTimeNorm := 1.0 - math.Min(s.ResponseTime/120.0, 1.0)

	// Churn risk penalty
	churnPenalty := 0.0
	switch s.ChurnRisk {
	case "High":
		churnPenalty = 0.3
	case "Medium":
		churnPenalty = 0.1
	case "Low":
		churnPenalty = 0.0
	}

	// Subscription tier bonus
	tierBonus := subscriptionTierBonus(s.ServiceName)

	composite := (0.25 * matchNorm) +
		(0.20 * healthNorm) +
		(0.15 * engagementNorm) +
		(0.15 * responseRateNorm) +
		(0.10 * responseTimeNorm) +
		(0.10 * priorityNorm) +
		(0.05 * tierBonus) -
		(churnPenalty * 0.15)

	return math.Max(0, math.Min(composite*100, 100))
}

func subscriptionTierBonus(serviceName string) float64 {
	switch serviceName {
	case "IM IL":
		return 1.0
	case "IM Leader Pro":
		return 0.85
	case "IM Star Pro":
		return 0.7
	case "Maximiser Pro":
		return 0.55
	case "Trustseal Pro":
		return 0.4
	case "Mini Dynamic Catalog (Annual)":
		return 0.25
	case "Mini Dynamic Catalog (Monthly)":
		return 0.15
	default:
		return 0.0
	}
}

// GetUnroutedLeads returns leads not yet routed, for the continuous routing simulator
func GetUnroutedLeads(limit int) ([]string, error) {
	rows, err := db.DB.Query(`
		SELECT lead_id FROM leads
		WHERE routed = false AND status = 'ACTIVE'
		ORDER BY timestamp ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leadIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			leadIDs = append(leadIDs, id)
		}
	}
	return leadIDs, nil
}

// GetRoutedLeadsForSeller returns active routed leads for a seller
func GetRoutedLeadsForSeller(sellerID int64) ([]models.LeadPacket, error) {
	rows, err := db.DB.Query(`
		SELECT r.id, r.lead_id, r.routing_score, r.status,
		       l.timestamp, l.buyer_city, l.buyer_state, l.product_name,
		       l.category, l.subcategory, l.quantity, l.order_value_rs,
		       l.buyer_type, l.intent_score, l.lead_quality, l.urgency,
		       l.budget_range, l.requirement_type, l.buyer_engagement_score,
		       l.gst_verified, l.preferred_contact, l.lead_source,
		       COALESCE(m.match_score, 0) as match_score,
		       COALESCE(b.recommendation, '') as recommendation
		FROM lead_routing r
		JOIN leads l ON r.lead_id = l.lead_id
		LEFT JOIN lead_seller_matches m ON r.lead_id = m.lead_id AND r.seller_id = m.seller_id
		LEFT JOIN seller_behavior_state b ON r.seller_id = b.seller_id
		WHERE r.seller_id = $1 AND r.status = 'PENDING'
		ORDER BY r.routing_score DESC
		LIMIT 20
	`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var packets []models.LeadPacket
	for rows.Next() {
		var p models.LeadPacket
		var l models.Lead
		err := rows.Scan(
			&p.RoutingID, &l.LeadID, &p.RoutingScore, &p.Lead.Status,
			&l.Timestamp, &l.BuyerCity, &l.BuyerState, &l.ProductName,
			&l.Category, &l.Subcategory, &l.Quantity, &l.OrderValueRs,
			&l.BuyerType, &l.IntentScore, &l.LeadQuality, &l.Urgency,
			&l.BudgetRange, &l.RequirementType, &l.BuyerEngagementScore,
			&l.GSTVerified, &l.PreferredContact, &l.LeadSource,
			&p.MatchScore, &p.Recommendation,
		)
		if err != nil {
			continue
		}
		l.Status = "PENDING"
		p.Lead = l
		p.SellerID = sellerID
		packets = append(packets, p)
	}
	return packets, nil
}

// GetLeadWithRouting returns a lead with its routing information
func GetLeadWithRouting(leadID string) (*models.Lead, []models.LeadRouting, error) {
	var lead models.Lead
	var consumedBy sql.NullInt64
	var consumedAt sql.NullTime

	err := db.DB.QueryRow(`
		SELECT lead_id, timestamp, buyer_city, buyer_state, product_name,
		       category, subcategory, quantity, order_value_rs, buyer_type,
		       intent_score, lead_quality, urgency, budget_range, requirement_type,
		       buyer_engagement_score, gst_verified, preferred_contact, lead_source,
		       status, consumed_by, consumed_at, routed
		FROM leads WHERE lead_id = $1
	`, leadID).Scan(
		&lead.LeadID, &lead.Timestamp, &lead.BuyerCity, &lead.BuyerState,
		&lead.ProductName, &lead.Category, &lead.Subcategory, &lead.Quantity,
		&lead.OrderValueRs, &lead.BuyerType, &lead.IntentScore, &lead.LeadQuality,
		&lead.Urgency, &lead.BudgetRange, &lead.RequirementType,
		&lead.BuyerEngagementScore, &lead.GSTVerified, &lead.PreferredContact,
		&lead.LeadSource, &lead.Status, &consumedBy, &consumedAt, &lead.Routed,
	)
	if err != nil {
		return nil, nil, err
	}
	if consumedBy.Valid {
		lead.ConsumedBy = &consumedBy.Int64
	}
	if consumedAt.Valid {
		lead.ConsumedAt = &consumedAt.Time
	}

	rows, err := db.DB.Query(`
		SELECT id, lead_id, seller_id, routing_score, routed_at, status
		FROM lead_routing WHERE lead_id = $1
		ORDER BY routing_score DESC
	`, leadID)
	if err != nil {
		return &lead, nil, nil
	}
	defer rows.Close()

	var routings []models.LeadRouting
	for rows.Next() {
		var r models.LeadRouting
		if err := rows.Scan(&r.ID, &r.LeadID, &r.SellerID, &r.RoutingScore, &r.RoutedAt, &r.Status); err == nil {
			routings = append(routings, r)
		}
	}

	return &lead, routings, nil
}
