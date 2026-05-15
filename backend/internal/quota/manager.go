package quota

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/models"
)

// CheckAndResetWeekly resets quotas if a new week has started
func CheckAndResetWeekly() {
	_, err := db.DB.Exec(`
		UPDATE seller_quotas
		SET weekly_consumed = 0, daily_bonus_consumed = 0,
		    week_start_date = CURRENT_DATE, last_reset = NOW()
		WHERE week_start_date < CURRENT_DATE - INTERVAL '7 days'
	`)
	if err != nil {
		log.Printf("[QUOTA] Error resetting weekly quotas: %v", err)
	}
}

// IsEligible checks if a seller can consume more leads
func IsEligible(sellerID int64) (bool, error) {
	var q models.SellerQuota
	err := db.DB.QueryRow(`
		SELECT seller_id, service_name, weekly_allocation, daily_bonus,
		       weekly_consumed, daily_bonus_consumed
		FROM seller_quotas WHERE seller_id = $1
	`, sellerID).Scan(&q.SellerID, &q.ServiceName, &q.WeeklyAllocation,
		&q.DailyBonus, &q.WeeklyConsumed, &q.DailyBonusConsumed)

	if err == sql.ErrNoRows {
		return false, nil // No quota record = not eligible (Free tier with 0 allocation)
	}
	if err != nil {
		return false, err
	}

	// Free tier sellers cannot consume
	if q.WeeklyAllocation == 0 {
		return false, nil
	}

	totalAvailable := q.WeeklyAllocation + q.DailyBonus
	totalConsumed := q.WeeklyConsumed + q.DailyBonusConsumed

	return totalConsumed < totalAvailable, nil
}

// DecrementQuota atomically decrements quota after lead consumption
func DecrementQuota(tx *sql.Tx, sellerID int64) error {
	var weeklyAlloc, weeklyConsumed, dailyBonus, dailyBonusConsumed int
	err := tx.QueryRow(`
		SELECT weekly_allocation, weekly_consumed, daily_bonus, daily_bonus_consumed
		FROM seller_quotas WHERE seller_id = $1 FOR UPDATE
	`, sellerID).Scan(&weeklyAlloc, &weeklyConsumed, &dailyBonus, &dailyBonusConsumed)
	if err != nil {
		return fmt.Errorf("quota lookup failed: %w", err)
	}

	if weeklyConsumed < weeklyAlloc {
		// Consume from weekly allocation
		_, err = tx.Exec(`UPDATE seller_quotas SET weekly_consumed = weekly_consumed + 1 WHERE seller_id = $1`, sellerID)
	} else if dailyBonusConsumed < dailyBonus {
		// Consume from daily bonus
		_, err = tx.Exec(`UPDATE seller_quotas SET daily_bonus_consumed = daily_bonus_consumed + 1 WHERE seller_id = $1`, sellerID)
	} else {
		return fmt.Errorf("quota exhausted for seller %d", sellerID)
	}

	return err
}

// GetQuota returns the current quota state for a seller
func GetQuota(sellerID int64) (*models.SellerQuota, error) {
	var q models.SellerQuota
	var weekStart time.Time
	err := db.DB.QueryRow(`
		SELECT seller_id, service_name, weekly_allocation, daily_bonus,
		       weekly_consumed, daily_bonus_consumed, week_start_date
		FROM seller_quotas WHERE seller_id = $1
	`, sellerID).Scan(&q.SellerID, &q.ServiceName, &q.WeeklyAllocation,
		&q.DailyBonus, &q.WeeklyConsumed, &q.DailyBonusConsumed, &weekStart)
	if err != nil {
		return nil, err
	}
	q.WeekStartDate = weekStart
	q.Remaining = (q.WeeklyAllocation + q.DailyBonus) - (q.WeeklyConsumed + q.DailyBonusConsumed)
	if q.Remaining < 0 {
		q.Remaining = 0
	}
	return &q, nil
}

// GetQuotaUtilization returns the utilization percentage
func GetQuotaUtilization(sellerID int64) float64 {
	q, err := GetQuota(sellerID)
	if err != nil || q.WeeklyAllocation == 0 {
		return 0
	}
	total := float64(q.WeeklyAllocation + q.DailyBonus)
	consumed := float64(q.WeeklyConsumed + q.DailyBonusConsumed)
	return (consumed / total) * 100
}
