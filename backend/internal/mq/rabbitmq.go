package mq

import (
	"fmt"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

var Conn *amqp.Connection
var Channel *amqp.Channel

// Queue names
const (
	QueueBuyLeadEvents     = "buylead_events"
	QueueSellerActivity    = "seller_activity_events"
	QueueScoringEvents     = "scoring_events"
	QueueRecommendation    = "recommendation_events"
	QueueIntervention      = "intervention_events"
)

func InitRabbitMQ() error {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://marketplace:marketplace123@localhost:5672/"
	}

	var err error
	for i := 0; i < 30; i++ {
		Conn, err = amqp.Dial(url)
		if err == nil {
			break
		}
		log.Printf("[MQ] Waiting for RabbitMQ... attempt %d/30", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	Channel, err = Conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare all queues
	queues := []string{
		QueueBuyLeadEvents,
		QueueSellerActivity,
		QueueScoringEvents,
		QueueRecommendation,
		QueueIntervention,
	}

	for _, q := range queues {
		_, err := Channel.QueueDeclare(q, true, false, false, false, nil)
		if err != nil {
			return fmt.Errorf("failed to declare queue %s: %w", q, err)
		}
		log.Printf("[MQ] Queue declared: %s", q)
	}

	log.Println("[MQ] Connected to RabbitMQ")
	return nil
}

// Publish publishes a message to a queue
func Publish(queue string, body []byte) error {
	return Channel.Publish(
		"",    // exchange
		queue, // routing key
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
		},
	)
}

// Consume starts consuming from a queue
func Consume(queue string) (<-chan amqp.Delivery, error) {
	return Channel.Consume(
		queue,
		"",    // consumer tag
		false, // auto-ack (manual ack for reliability)
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
}

// GetQueueDepth returns the number of messages in a queue
func GetQueueDepth(queue string) (int, error) {
	q, err := Channel.QueueInspect(queue)
	if err != nil {
		return 0, err
	}
	return q.Messages, nil
}
