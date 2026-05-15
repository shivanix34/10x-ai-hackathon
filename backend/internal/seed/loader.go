package seed

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/models"
)

func LoadAllDatasets() error {
	datasetPath := os.Getenv("DATASET_PATH")
	if datasetPath == "" {
		datasetPath = "./datasets"
	}

	// Check if data is already seeded
	var count int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM sellers").Scan(&count)
	if err == nil && count > 0 {
		log.Printf("[SEED] Data already seeded (%d sellers). Skipping.", count)
		return nil
	}

	log.Println("[SEED] Starting data load...")

	if err := loadSellers(filepath.Join(datasetPath, "seller_master_dataset_hackathon.csv")); err != nil {
		return fmt.Errorf("loading sellers: %w", err)
	}
	if err := loadLeads(filepath.Join(datasetPath, "leads_dataset_hackathon.csv")); err != nil {
		return fmt.Errorf("loading leads: %w", err)
	}
	if err := loadSellerEvents(filepath.Join(datasetPath, "seller_events_dataset_hackathon.csv")); err != nil {
		return fmt.Errorf("loading events: %w", err)
	}
	if err := loadLeadSellerMatches(filepath.Join(datasetPath, "lead_seller_matching_dataset.csv")); err != nil {
		return fmt.Errorf("loading matches: %w", err)
	}
	if err := initBehaviorState(); err != nil {
		return fmt.Errorf("init behavior state: %w", err)
	}
	if err := initQuotas(); err != nil {
		return fmt.Errorf("init quotas: %w", err)
	}

	log.Println("[SEED] All datasets loaded successfully!")
	return nil
}

func loadSellers(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// Skip header
	if _, err := reader.Read(); err != nil {
		return err
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO sellers (
		seller_id, company_name, city, state, business_type, years_active,
		service_name, weekly_bl_allocation, revenue_band, persona_type,
		catalog_quality_score, total_products, active_categories,
		avg_weekly_leads, avg_weekly_lead_consumption, avg_response_rate,
		avg_response_time_mins, preferred_platform, seller_rating,
		engagement_score, seller_health_score, churn_risk, upsell_probability,
		last_active_days_ago, notification_open_rate, support_ticket_count,
		preferred_market, primary_category, secondary_categories
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
	ON CONFLICT (seller_id) DO NOTHING`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	count := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("[SEED] Skipping seller row: %v", err)
			continue
		}
		if len(record) < 29 {
			continue
		}

		sellerID, _ := strconv.ParseInt(strings.TrimSpace(record[0]), 10, 64)
		yearsActive, _ := strconv.Atoi(strings.TrimSpace(record[5]))
		weeklyAlloc, _ := strconv.Atoi(strings.TrimSpace(record[7]))
		catalogScore, _ := strconv.ParseFloat(strings.TrimSpace(record[10]), 64)
		totalProducts, _ := strconv.Atoi(strings.TrimSpace(record[11]))
		activeCats, _ := strconv.Atoi(strings.TrimSpace(record[12]))
		avgWeeklyLeads, _ := strconv.ParseFloat(strings.TrimSpace(record[13]), 64)
		avgWeeklyConsumption, _ := strconv.ParseFloat(strings.TrimSpace(record[14]), 64)
		avgResponseRate, _ := strconv.ParseFloat(strings.TrimSpace(record[15]), 64)
		avgResponseTime, _ := strconv.ParseFloat(strings.TrimSpace(record[16]), 64)
		sellerRating, _ := strconv.ParseFloat(strings.TrimSpace(record[18]), 64)
		engagementScore, _ := strconv.ParseFloat(strings.TrimSpace(record[19]), 64)
		healthScore, _ := strconv.ParseFloat(strings.TrimSpace(record[20]), 64)
		upsellProb, _ := strconv.ParseFloat(strings.TrimSpace(record[22]), 64)
		lastActive, _ := strconv.Atoi(strings.TrimSpace(record[23]))
		notifRate, _ := strconv.ParseFloat(strings.TrimSpace(record[24]), 64)
		supportTickets, _ := strconv.Atoi(strings.TrimSpace(record[25]))

		_, err = stmt.Exec(
			sellerID, strings.TrimSpace(record[1]), strings.TrimSpace(record[2]),
			strings.TrimSpace(record[3]), strings.TrimSpace(record[4]), yearsActive,
			strings.TrimSpace(record[6]), weeklyAlloc, strings.TrimSpace(record[8]),
			strings.TrimSpace(record[9]), catalogScore, totalProducts, activeCats,
			avgWeeklyLeads, avgWeeklyConsumption, avgResponseRate,
			avgResponseTime, strings.TrimSpace(record[17]), sellerRating,
			engagementScore, healthScore, strings.TrimSpace(record[21]),
			upsellProb, lastActive, notifRate, supportTickets,
			strings.TrimSpace(record[26]), strings.TrimSpace(record[27]),
			strings.TrimSpace(record[28]),
		)
		if err != nil {
			log.Printf("[SEED] Error inserting seller %d: %v", sellerID, err)
			continue
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("[SEED] Loaded %d sellers", count)
	return nil
}

func loadLeads(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	if _, err := reader.Read(); err != nil {
		return err
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO leads (
		lead_id, timestamp, buyer_city, buyer_state, product_name,
		category, subcategory, quantity, order_value_rs, buyer_type,
		intent_score, lead_quality, urgency, budget_range, requirement_type,
		buyer_engagement_score, gst_verified, preferred_contact, lead_source,
		status, routed
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'ACTIVE',false)
	ON CONFLICT (lead_id) DO NOTHING`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	count := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) < 19 {
			continue
		}

		ts := parseTimestamp(strings.TrimSpace(record[1]))
		qty, _ := strconv.Atoi(strings.TrimSpace(record[7]))
		orderVal, _ := strconv.ParseFloat(strings.TrimSpace(record[8]), 64)
		intentScore, _ := strconv.ParseFloat(strings.TrimSpace(record[10]), 64)
		buyerEngagement, _ := strconv.ParseFloat(strings.TrimSpace(record[15]), 64)
		gstVerified := strings.TrimSpace(strings.ToLower(record[16])) == "yes" || strings.TrimSpace(strings.ToLower(record[16])) == "true"

		_, err = stmt.Exec(
			strings.TrimSpace(record[0]), ts,
			strings.TrimSpace(record[2]), strings.TrimSpace(record[3]),
			strings.TrimSpace(record[4]), strings.TrimSpace(record[5]),
			strings.TrimSpace(record[6]), qty, orderVal,
			strings.TrimSpace(record[9]), intentScore,
			strings.TrimSpace(record[11]), strings.TrimSpace(record[12]),
			strings.TrimSpace(record[13]), strings.TrimSpace(record[14]),
			buyerEngagement, gstVerified,
			strings.TrimSpace(record[17]), strings.TrimSpace(record[18]),
		)
		if err != nil {
			continue
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("[SEED] Loaded %d leads", count)
	return nil
}

func loadSellerEvents(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	if _, err := reader.Read(); err != nil {
		return err
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO seller_events (
		event_id, timestamp, seller_id, company_name, persona_type,
		service_name, city, event_type, event_source, event_value, metadata
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	ON CONFLICT (event_id) DO NOTHING`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	count := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) < 11 {
			continue
		}

		ts := parseTimestamp(strings.TrimSpace(record[1]))
		sellerID, _ := strconv.ParseInt(strings.TrimSpace(record[2]), 10, 64)
		eventVal, _ := strconv.ParseFloat(strings.TrimSpace(record[9]), 64)

		// Map hot_lead_missed to missed_lead
		eventType := strings.TrimSpace(record[7])
		if strings.ToLower(eventType) == "hot_lead_missed" {
			eventType = "missed_lead"
		}

		// Convert Python dict-style metadata to JSON
		metadata := strings.TrimSpace(record[10])
		metadata = strings.ReplaceAll(metadata, "'", "\"")
		if metadata == "" {
			metadata = "{}"
		}

		_, err = stmt.Exec(
			strings.TrimSpace(record[0]), ts, sellerID,
			strings.TrimSpace(record[3]), strings.TrimSpace(record[4]),
			strings.TrimSpace(record[5]), strings.TrimSpace(record[6]),
			eventType, strings.TrimSpace(record[8]),
			eventVal, metadata,
		)
		if err != nil {
			continue
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("[SEED] Loaded %d seller events", count)
	return nil
}

func loadLeadSellerMatches(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	if _, err := reader.Read(); err != nil {
		return err
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO lead_seller_matches (
		lead_id, seller_id, company_name, seller_category,
		service_name, seller_health_score, match_score
	) VALUES ($1,$2,$3,$4,$5,$6,$7)
	ON CONFLICT (lead_id, seller_id) DO NOTHING`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	count := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) < 7 {
			continue
		}

		sellerID, _ := strconv.ParseInt(strings.TrimSpace(record[1]), 10, 64)
		healthScore, _ := strconv.ParseFloat(strings.TrimSpace(record[5]), 64)
		matchScore, _ := strconv.ParseFloat(strings.TrimSpace(record[6]), 64)

		_, err = stmt.Exec(
			strings.TrimSpace(record[0]), sellerID,
			strings.TrimSpace(record[2]), strings.TrimSpace(record[3]),
			strings.TrimSpace(record[4]), healthScore, matchScore,
		)
		if err != nil {
			continue
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("[SEED] Loaded %d lead-seller matches", count)
	return nil
}

func initBehaviorState() error {
	_, err := db.DB.Exec(`
		INSERT INTO seller_behavior_state (
			seller_id, health_score, engagement_score, churn_risk,
			response_efficiency, quota_utilization, routing_priority,
			recommendation, intervention_status
		)
		SELECT
			seller_id,
			seller_health_score,
			engagement_score,
			churn_risk,
			CASE WHEN avg_response_time_mins > 0
				THEN GREATEST(0, 100 - avg_response_time_mins)
				ELSE 50 END,
			CASE WHEN weekly_bl_allocation > 0
				THEN (avg_weekly_lead_consumption / weekly_bl_allocation) * 100
				ELSE 0 END,
			(seller_health_score * 0.4 + engagement_score * 0.3 + avg_response_rate * 0.3),
			CASE
				WHEN churn_risk = 'High' THEN 'Immediate re-engagement needed'
				WHEN engagement_score < 30 THEN 'Increase platform activity'
				WHEN avg_response_rate < 50 THEN 'Improve response consistency'
				ELSE 'Maintain current performance'
			END,
			CASE WHEN churn_risk = 'High' THEN 'PENDING' ELSE 'NONE' END
		FROM sellers
		ON CONFLICT (seller_id) DO NOTHING
	`)
	if err != nil {
		return err
	}
	log.Println("[SEED] Initialized seller behavior states")
	return nil
}

func initQuotas() error {
	for serviceName, tier := range models.SubscriptionTiers {
		_, err := db.DB.Exec(`
			INSERT INTO seller_quotas (seller_id, service_name, weekly_allocation, daily_bonus, week_start_date)
			SELECT seller_id, $1, $2, $3, CURRENT_DATE
			FROM sellers WHERE service_name = $4
			ON CONFLICT (seller_id) DO NOTHING
		`, serviceName, tier.WeeklyAllocation, tier.DailyBonus, serviceName)
		if err != nil {
			return err
		}
	}
	log.Println("[SEED] Initialized seller quotas")
	return nil
}

func parseTimestamp(s string) time.Time {
	layouts := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 3:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02",
		time.RFC3339,
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t
		}
	}
	return time.Now()
}

func CheckSeeded() bool {
	var count int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM sellers").Scan(&count)
	return err == nil && count > 0
}

func GetSeedStats() map[string]int {
	stats := make(map[string]int)
	tables := []string{"sellers", "leads", "seller_events", "lead_seller_matches", "seller_behavior_state", "seller_quotas"}
	for _, table := range tables {
		var count int
		query := fmt.Sprintf("SELECT COUNT(*) FROM %s", table)
		if err := db.DB.QueryRow(query).Scan(&count); err == nil {
			stats[table] = count
		}
	}
	return stats
}
