package events

import (
	"context"
	"encoding/json"
	"log"
	"sync/atomic"
	"time"

	"marketplace-orchestrator/internal/behavior"
	"marketplace-orchestrator/internal/cache"
	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/routing"
	ws "marketplace-orchestrator/internal/websocket"
	"net/http"
	"os"
	"strconv"
)

var (
	EventsProcessed int64
	LeadsRouted     int64
	MutationCount   int64
)

// StartEventProcessors starts all RabbitMQ consumer goroutines
func StartEventProcessors(hub *ws.Hub) {
	go processSellerActivityEvents(hub)
	go processBuyLeadEvents(hub)
	go processScoringEvents(hub)
	go processInterventionEvents(hub)
	go processRecommendationEvents(hub)
	go startLeadArrivalSimulator(hub)
	log.Println("[EVENTS] All event processors started")
}

func processSellerActivityEvents(hub *ws.Hub) {
	msgs, err := mq.Consume(mq.QueueSellerActivity)
	if err != nil {
		log.Printf("[EVENTS] Failed to consume seller_activity: %v", err)
		return
	}
	for msg := range msgs {
		var event map[string]interface{}
		if err := json.Unmarshal(msg.Body, &event); err != nil {
			msg.Ack(false)
			continue
		}
		atomic.AddInt64(&EventsProcessed, 1)

		eventType, _ := event["type"].(string)
		sellerIDFloat, _ := event["seller_id"].(float64)
		sellerID := int64(sellerIDFloat)
		eventValue, _ := event["event_value"].(float64)

		if sellerID > 0 {
			// Mutate seller behavior state
			newState, err := behavior.MutateSellerState(sellerID, eventType, eventValue)
			if err == nil && newState != nil {
				atomic.AddInt64(&MutationCount, 1)
				// Push state update via WebSocket
				hub.BroadcastToSeller(sellerID, ws.Message{
					Type: "STATE_UPDATE",
					Data: newState,
				})
				// Also push to sales dashboard
				hub.BroadcastToChannel("sales", ws.Message{
					Type: "SELLER_STATE_CHANGE",
					Data: map[string]interface{}{
						"seller_id":   sellerID,
						"state":       newState,
						"event_type":  eventType,
						"timestamp":   time.Now(),
					},
				})
			}
		}

		// Push to monitoring
		hub.BroadcastToChannel("monitoring", ws.Message{
			Type: "EVENT_PROCESSED",
			Data: map[string]interface{}{
				"event_type":       eventType,
				"seller_id":        sellerID,
				"events_processed": atomic.LoadInt64(&EventsProcessed),
				"mutation_count":   atomic.LoadInt64(&MutationCount),
				"timestamp":        time.Now(),
			},
		})
		msg.Ack(false)
	}
}

func processBuyLeadEvents(hub *ws.Hub) {
	msgs, err := mq.Consume(mq.QueueBuyLeadEvents)
	if err != nil {
		log.Printf("[EVENTS] Failed to consume buylead_events: %v", err)
		return
	}
	for msg := range msgs {
		var event map[string]interface{}
		if err := json.Unmarshal(msg.Body, &event); err != nil {
			msg.Ack(false)
			continue
		}
		atomic.AddInt64(&EventsProcessed, 1)
		eventType, _ := event["type"].(string)

		if eventType == "LEAD_EXPIRED" {
			leadID, _ := event["lead_id"].(string)
			consumedBy, _ := event["consumed_by"].(float64)
			// Notify all affected sellers that lead is no longer available
			sellers, _ := db.DB.Query(`SELECT seller_id FROM lead_routing WHERE lead_id=$1 AND seller_id!=$2`, leadID, int64(consumedBy))
			if sellers != nil {
				for sellers.Next() {
					var sid int64
					sellers.Scan(&sid)
					hub.BroadcastToSeller(sid, ws.Message{
						Type: "LEAD_UNAVAILABLE",
						Data: map[string]interface{}{"lead_id": leadID, "consumed_by": int64(consumedBy)},
					})
				}
				sellers.Close()
			}
		}
		msg.Ack(false)
	}
}

func processScoringEvents(hub *ws.Hub) {
	msgs, err := mq.Consume(mq.QueueScoringEvents)
	if err != nil {
		log.Printf("[EVENTS] Failed to consume scoring_events: %v", err)
		return
	}
	for msg := range msgs {
		atomic.AddInt64(&EventsProcessed, 1)
		hub.BroadcastToChannel("monitoring", ws.Message{
			Type: "SCORING_EVENT",
			Data: json.RawMessage(msg.Body),
		})
		msg.Ack(false)
	}
}

func processInterventionEvents(hub *ws.Hub) {
	msgs, err := mq.Consume(mq.QueueIntervention)
	if err != nil {
		log.Printf("[EVENTS] Failed to consume intervention_events: %v", err)
		return
	}
	for msg := range msgs {
		atomic.AddInt64(&EventsProcessed, 1)
		hub.BroadcastToChannel("sales", ws.Message{
			Type: "NEW_INTERVENTION",
			Data: json.RawMessage(msg.Body),
		})
		msg.Ack(false)
	}
}

func processRecommendationEvents(hub *ws.Hub) {
	msgs, err := mq.Consume(mq.QueueRecommendation)
	if err != nil {
		log.Printf("[EVENTS] Failed to consume recommendation_events: %v", err)
		return
	}

	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8081"
	}

	for msg := range msgs {
		var event map[string]interface{}
		if err := json.Unmarshal(msg.Body, &event); err != nil {
			msg.Ack(false)
			continue
		}
		
		sellerIDFloat, _ := event["seller_id"].(float64)
		sellerID := int64(sellerIDFloat)

		// Make HTTP request to AI service
		url := aiServiceURL + "/score/recommendation?seller_id=" + strconv.FormatInt(sellerID, 10)
		resp, err := http.Post(url, "application/json", nil)
		if err == nil {
			resp.Body.Close()
			// Fetch the updated behavior state
			if newState, err := behavior.GetBehaviorState(sellerID); err == nil {
				// Broadcast updated recommendation
				hub.BroadcastToSeller(sellerID, ws.Message{
					Type: "STATE_UPDATE",
					Data: newState,
				})
			}
		} else {
			log.Printf("[EVENTS] Failed to fetch Claude recommendation: %v", err)
		}
		
		msg.Ack(false)
	}
}

// startLeadArrivalSimulator continuously routes unrouted leads every second
func startLeadArrivalSimulator(hub *ws.Hub) {
	log.Println("[SIMULATOR] Lead arrival simulator starting in 5 seconds...")
	time.Sleep(5 * time.Second)

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	ctx := context.Background()

	for range ticker.C {
		// Get 1-3 unrouted leads per tick
		leadIDs, err := routing.GetUnroutedLeads(2)
		if err != nil || len(leadIDs) == 0 {
			continue
		}

		for _, leadID := range leadIDs {
			routings, err := routing.RouteLeadToSellers(leadID)
			if err != nil || len(routings) == 0 {
				continue
			}
			atomic.AddInt64(&LeadsRouted, 1)

			// Get lead details for the packet
			lead, _, _ := routing.GetLeadWithRouting(leadID)
			if lead == nil {
				continue
			}

			// Push lead packet to each routed seller via WebSocket
			for _, r := range routings {
				packet := map[string]interface{}{
					"lead":          lead,
					"routing_id":    r.ID,
					"routing_score": r.RoutingScore,
					"seller_id":     r.SellerID,
				}
				hub.BroadcastToSeller(r.SellerID, ws.Message{
					Type: "NEW_LEAD",
					Data: packet,
				})
			}

			// Push to monitoring dashboard
			hub.BroadcastToChannel("monitoring", ws.Message{
				Type: "LEAD_ROUTED",
				Data: map[string]interface{}{
					"lead_id":      leadID,
					"seller_count": len(routings),
					"leads_routed": atomic.LoadInt64(&LeadsRouted),
					"timestamp":    time.Now(),
				},
			})

			// Increment Redis counter
			cache.RDB.Incr(ctx, "metrics:leads_routed")
		}
	}
}
