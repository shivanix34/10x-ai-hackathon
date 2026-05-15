package consumption

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"marketplace-orchestrator/internal/cache"
	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/quota"
)

type ConsumeResult struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	LeadID   string `json:"lead_id"`
	SellerID int64  `json:"seller_id"`
}

func ConsumeLead(ctx context.Context, leadID string, sellerID int64) (*ConsumeResult, error) {
	lockKey := fmt.Sprintf("lead_consume:%s", leadID)
	acquired, err := cache.AcquireLock(ctx, lockKey, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("lock error: %w", err)
	}
	if !acquired {
		return &ConsumeResult{false, "Lead is being consumed by another seller", leadID, sellerID}, nil
	}
	defer cache.ReleaseLock(ctx, lockKey)
	cache.RDB.Incr(ctx, "metrics:lock_acquisitions")

	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRow(`SELECT status FROM leads WHERE lead_id = $1 FOR UPDATE`, leadID).Scan(&currentStatus)
	if err != nil {
		return nil, fmt.Errorf("lead not found: %w", err)
	}
	if currentStatus == "CONSUMED" {
		return &ConsumeResult{false, "Lead already consumed", leadID, sellerID}, nil
	}

	var routingID int
	err = tx.QueryRow(`SELECT id FROM lead_routing WHERE lead_id = $1 AND seller_id = $2 AND status = 'PENDING' FOR UPDATE`, leadID, sellerID).Scan(&routingID)
	if err != nil {
		return &ConsumeResult{false, "No active routing found", leadID, sellerID}, nil
	}

	eligible, err := quota.IsEligible(sellerID)
	if err != nil {
		return nil, err
	}
	if !eligible {
		return &ConsumeResult{false, "Quota exhausted", leadID, sellerID}, nil
	}
	if err := quota.DecrementQuota(tx, sellerID); err != nil {
		return &ConsumeResult{false, err.Error(), leadID, sellerID}, nil
	}

	now := time.Now()
	tx.Exec(`UPDATE leads SET status='CONSUMED', consumed_by=$1, consumed_at=$2 WHERE lead_id=$3`, sellerID, now, leadID)
	tx.Exec(`UPDATE lead_routing SET status='CONSUMED', consumed_at=$1 WHERE id=$2`, now, routingID)
	tx.Exec(`UPDATE lead_routing SET status='EXPIRED' WHERE lead_id=$1 AND seller_id!=$2 AND status='PENDING'`, leadID, sellerID)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	cache.RDB.Incr(ctx, "metrics:leads_consumed")
	evt, _ := json.Marshal(map[string]interface{}{"type": "LEAD_CONSUMED", "lead_id": leadID, "seller_id": sellerID, "timestamp": now})
	mq.Publish(mq.QueueSellerActivity, evt)
	exp, _ := json.Marshal(map[string]interface{}{"type": "LEAD_EXPIRED", "lead_id": leadID, "consumed_by": sellerID, "timestamp": now})
	mq.Publish(mq.QueueBuyLeadEvents, exp)

	log.Printf("[CONSUME] Lead %s consumed by seller %d", leadID, sellerID)
	return &ConsumeResult{true, "Lead consumed successfully", leadID, sellerID}, nil
}

func GetAffectedSellers(leadID string) ([]int64, error) {
	rows, err := db.DB.Query(`SELECT seller_id FROM lead_routing WHERE lead_id = $1`, leadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sellers []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			sellers = append(sellers, id)
		}
	}
	return sellers, nil
}
