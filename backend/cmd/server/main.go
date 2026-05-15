package main

import (
	"log"
	"net/http"
	"os"

	"marketplace-orchestrator/internal/api"
	"marketplace-orchestrator/internal/cache"
	"marketplace-orchestrator/internal/db"
	"marketplace-orchestrator/internal/events"
	"marketplace-orchestrator/internal/mq"
	"marketplace-orchestrator/internal/seed"
	ws "marketplace-orchestrator/internal/websocket"
)

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)
	log.Println("============================================")
	log.Println("  Marketplace Orchestrator Platform Starting")
	log.Println("============================================")

	// Initialize PostgreSQL
	if err := db.InitPostgres(); err != nil {
		log.Fatalf("[FATAL] PostgreSQL: %v", err)
	}

	// Initialize Redis
	if err := cache.InitRedis(); err != nil {
		log.Fatalf("[FATAL] Redis: %v", err)
	}

	// Initialize RabbitMQ
	if err := mq.InitRabbitMQ(); err != nil {
		log.Fatalf("[FATAL] RabbitMQ: %v", err)
	}

	// Seed data from CSV datasets
	if err := seed.LoadAllDatasets(); err != nil {
		log.Printf("[WARN] Seed error: %v", err)
	}

	stats := seed.GetSeedStats()
	for table, count := range stats {
		log.Printf("[SEED] %s: %d rows", table, count)
	}

	// Start WebSocket hub
	hub := ws.NewHub()
	go hub.Run()
	log.Println("[WS] WebSocket hub started")

	// Start event processors
	events.StartEventProcessors(hub)

	// Create HTTP router
	router := api.NewRouter(hub)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("[SERVER] Starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
