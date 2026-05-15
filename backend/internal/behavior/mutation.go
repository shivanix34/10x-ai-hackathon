package behavior

import (
	"encoding/json"
	"math"
	"time"

	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/models"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/quota"
)

// MutateSellerState recalculates and updates seller intelligence based on an event
func MutateSellerState(sellerID int64, eventType string, eventValue float64) (*models.SellerBehaviorState, error) {
	// Get current state
	var state models.SellerBehaviorState
	err := db.DB.QueryRow(`
		SELECT seller_id, health_score, engagement_score, churn_risk,
		       response_efficiency, quota_utilization, routing_priority,
		       recommendation, intervention_status
		FROM seller_behavior_state WHERE seller_id = $1
	`, sellerID).Scan(
		&state.SellerID, &state.HealthScore, &state.EngagementScore,
		&state.ChurnRisk, &state.ResponseEfficiency, &state.QuotaUtilization,
		&state.RoutingPriority, &state.Recommendation, &state.InterventionStatus,
	)
	if err != nil {
		return nil, err
	}

	// Get seller master data for context
	var seller models.Seller
	db.DB.QueryRow(`
		SELECT seller_id, avg_response_rate, avg_response_time_mins,
		       catalog_quality_score, seller_rating, notification_open_rate,
		       service_name, persona_type
		FROM sellers WHERE seller_id = $1
	`, sellerID).Scan(
		&seller.SellerID, &seller.AvgResponseRate, &seller.AvgResponseTimeMins,
		&seller.CatalogQualityScore, &seller.SellerRating,
		&seller.NotificationOpenRate, &seller.ServiceName, &seller.PersonaType,
	)

	// Apply behavioral mutation based on event type
	switch eventType {
	case "lead_consumed", "LEAD_CONSUMED":
		state.EngagementScore = clamp(state.EngagementScore+3, 0, 100)
		state.HealthScore = clamp(state.HealthScore+2, 0, 100)
		state.ResponseEfficiency = clamp(state.ResponseEfficiency+1, 0, 100)
	case "response_sent", "RESPONSE_SENT":
		if eventValue < 15 {
			state.ResponseEfficiency = clamp(state.ResponseEfficiency+5, 0, 100)
			state.HealthScore = clamp(state.HealthScore+3, 0, 100)
			state.EngagementScore = clamp(state.EngagementScore+2, 0, 100)
		} else if eventValue < 30 {
			state.ResponseEfficiency = clamp(state.ResponseEfficiency+2, 0, 100)
			state.HealthScore = clamp(state.HealthScore+1, 0, 100)
		} else {
			state.ResponseEfficiency = clamp(state.ResponseEfficiency-2, 0, 100)
		}
	case "login", "LOGIN":
		state.EngagementScore = clamp(state.EngagementScore+1, 0, 100)
	case "missed_lead", "MISSED_LEAD":
		state.EngagementScore = clamp(state.EngagementScore-3, 0, 100)
		state.HealthScore = clamp(state.HealthScore-2, 0, 100)
	case "notification_opened", "NOTIFICATION_OPENED":
		state.EngagementScore = clamp(state.EngagementScore+1, 0, 100)
	case "catalog_updated", "CATALOG_UPDATED":
		state.HealthScore = clamp(state.HealthScore+2, 0, 100)
	case "inactivity_detected", "INACTIVITY_DETECTED":
		state.EngagementScore = clamp(state.EngagementScore-5, 0, 100)
		state.HealthScore = clamp(state.HealthScore-3, 0, 100)
	case "support_ticket", "SUPPORT_TICKET":
		state.EngagementScore = clamp(state.EngagementScore-1, 0, 100)
	case "product_added", "PRODUCT_ADDED":
		state.HealthScore = clamp(state.HealthScore+1, 0, 100)
	case "quotation_sent", "QUOTATION_SENT":
		state.EngagementScore = clamp(state.EngagementScore+2, 0, 100)
		state.ResponseEfficiency = clamp(state.ResponseEfficiency+2, 0, 100)
	}

	// Recalculate quota utilization
	state.QuotaUtilization = quota.GetQuotaUtilization(sellerID)

	oldChurnRisk := state.ChurnRisk
	oldHealthScore := state.HealthScore
	oldEngagementScore := state.EngagementScore

	// Recalculate churn risk
	state.ChurnRisk = calculateChurnRisk(state)

	// Recalculate routing priority
	state.RoutingPriority = calculateRoutingPriority(state, seller)

	// Check if recommendation update is needed (thresholds)
	needsNewRecommendation := false
	if oldChurnRisk != state.ChurnRisk {
		needsNewRecommendation = true
	} else if math.Abs(oldHealthScore-state.HealthScore) >= 5 {
		needsNewRecommendation = true
	} else if math.Abs(oldEngagementScore-state.EngagementScore) >= 10 {
		needsNewRecommendation = true
	}

	if needsNewRecommendation {
		evt, _ := json.Marshal(map[string]interface{}{
			"type":      "RECOMMENDATION_NEEDED",
			"seller_id": sellerID,
			"timestamp": time.Now(),
		})
		mq.Publish(mq.QueueRecommendation, evt)
	}

	// Check if intervention needed
	if state.ChurnRisk == "High" && state.InterventionStatus == "NONE" {
		state.InterventionStatus = "PENDING"
		createIntervention(sellerID, state)
	}

	// Update state in database
	state.LastUpdated = time.Now()
	_, err = db.DB.Exec(`
		UPDATE seller_behavior_state SET
			health_score = $2, engagement_score = $3, churn_risk = $4,
			response_efficiency = $5, quota_utilization = $6, routing_priority = $7,
			recommendation = $8, intervention_status = $9, last_updated = $10
		WHERE seller_id = $1
	`, sellerID, state.HealthScore, state.EngagementScore, state.ChurnRisk,
		state.ResponseEfficiency, state.QuotaUtilization, state.RoutingPriority,
		state.Recommendation, state.InterventionStatus, state.LastUpdated,
	)
	if err != nil {
		return nil, err
	}

	// Emit scoring event
	evt, _ := json.Marshal(map[string]interface{}{
		"type": "SCORE_UPDATED", "seller_id": sellerID,
		"health_score": state.HealthScore, "engagement_score": state.EngagementScore,
		"churn_risk": state.ChurnRisk, "routing_priority": state.RoutingPriority,
		"timestamp": time.Now(),
	})
	mq.Publish(mq.QueueScoringEvents, evt)

	return &state, nil
}

func calculateChurnRisk(state models.SellerBehaviorState) string {
	riskScore := 0.0
	if state.EngagementScore < 20 {
		riskScore += 0.4
	} else if state.EngagementScore < 40 {
		riskScore += 0.2
	}
	if state.HealthScore < 30 {
		riskScore += 0.3
	} else if state.HealthScore < 50 {
		riskScore += 0.15
	}
	if state.ResponseEfficiency < 30 {
		riskScore += 0.2
	}
	if state.QuotaUtilization < 10 {
		riskScore += 0.1
	}
	if riskScore > 0.55 {
		return "High"
	} else if riskScore > 0.25 {
		return "Medium"
	}
	return "Low"
}

func calculateRoutingPriority(state models.SellerBehaviorState, seller models.Seller) float64 {
	priority := (state.HealthScore * 0.35) +
		(state.EngagementScore * 0.25) +
		(state.ResponseEfficiency * 0.2) +
		(seller.SellerRating * 4.0) // scale 0-5 to 0-20
	churnPenalty := 0.0
	switch state.ChurnRisk {
	case "High":
		churnPenalty = 15
	case "Medium":
		churnPenalty = 5
	}
	return clamp(priority-churnPenalty, 0, 100)
}

func generateRecommendation(state models.SellerBehaviorState, seller models.Seller) string {
	if state.ChurnRisk == "High" {
		if state.EngagementScore < 20 {
			return "🚨 Critical: Re-engage immediately. Log in and respond to pending leads to prevent account degradation."
		}
		return "⚠️ Your activity is declining. Consume leads and respond within 10 minutes to improve your score."
	}
	if state.ResponseEfficiency < 40 {
		return "⏱️ Improve response time: Respond within 10 minutes to high-intent buyers for better lead quality."
	}
	if state.EngagementScore < 40 {
		return "📈 Increase engagement: Log in daily, update catalog, and consume available leads consistently."
	}
	if state.QuotaUtilization < 30 && seller.ServiceName != "Free" {
		return "💡 You're under-utilizing your quota. Consume more leads to maximize your subscription value."
	}
	if state.HealthScore > 75 && state.EngagementScore > 70 {
		return "🌟 Excellent performance! Maintain consistency. Consider upgrading for more lead allocation."
	}
	if state.HealthScore > 60 {
		return "👍 Good performance. Focus on faster responses and catalog quality to reach top-tier status."
	}
	return "📊 Stay active: Regular engagement and quick responses improve your lead routing priority."
}

func createIntervention(sellerID int64, state models.SellerBehaviorState) {
	reason := "High churn risk detected"
	iType := "ENGAGEMENT_CALL"
	priority := "HIGH"
	if state.EngagementScore < 20 {
		iType = "URGENT_OUTREACH"
		reason = "Critical engagement drop — immediate outreach needed"
		priority = "CRITICAL"
	}
	db.DB.Exec(`
		INSERT INTO interventions (seller_id, intervention_type, reason, priority, status)
		VALUES ($1, $2, $3, $4, 'PENDING')
	`, sellerID, iType, reason, priority)

	evt, _ := json.Marshal(map[string]interface{}{
		"type": "INTERVENTION_TRIGGERED", "seller_id": sellerID,
		"intervention_type": iType, "reason": reason, "timestamp": time.Now(),
	})
	mq.Publish(mq.QueueIntervention, evt)
}

func GetBehaviorState(sellerID int64) (*models.SellerBehaviorState, error) {
	var s models.SellerBehaviorState
	err := db.DB.QueryRow(`
		SELECT seller_id, health_score, engagement_score, churn_risk,
		       response_efficiency, quota_utilization, routing_priority,
		       recommendation, intervention_status, last_updated
		FROM seller_behavior_state WHERE seller_id = $1
	`, sellerID).Scan(
		&s.SellerID, &s.HealthScore, &s.EngagementScore, &s.ChurnRisk,
		&s.ResponseEfficiency, &s.QuotaUtilization, &s.RoutingPriority,
		&s.Recommendation, &s.InterventionStatus, &s.LastUpdated,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func clamp(val, min, max float64) float64 {
	return math.Max(min, math.Min(max, val))
}
