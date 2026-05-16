import os
import json
import threading
import time
from contextlib import asynccontextmanager

import psycopg2
import psycopg2.extras
import pika
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from scoring.seller_health import compute_seller_health_scores
from scoring.lead_priority import compute_lead_priority
from scoring.churn_risk import compute_churn_risk
from scoring.recommendations import generate_claude_recommendation, generate_sales_insights
from synthetic_data.generator import SyntheticEventGenerator
from behavior_simulator.simulator import BehaviorSimulator

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "marketplace"),
    "password": os.getenv("DB_PASSWORD", "marketplace123"),
    "dbname": os.getenv("DB_NAME", "marketplace"),
}
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://marketplace:marketplace123@localhost:5672/")

generator = None
simulator = None

def get_db():
    return psycopg2.connect(**DB_CONFIG)

def get_rabbitmq():
    params = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(params)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global generator, simulator
    # Wait for DB
    for i in range(30):
        try:
            conn = get_db()
            conn.close()
            break
        except Exception:
            time.sleep(2)

    generator = SyntheticEventGenerator(DB_CONFIG, RABBITMQ_URL)
    simulator = BehaviorSimulator(DB_CONFIG, RABBITMQ_URL)

    # Start background event generation
    gen_thread = threading.Thread(target=generator.run_continuous, daemon=True)
    gen_thread.start()

    # Start background recommendation generation
    rec_thread = threading.Thread(target=run_recommendation_loop, daemon=True)
    rec_thread.start()

    yield

app = FastAPI(title="Marketplace Intelligence Service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-intelligence"}

@app.post("/score/seller-health")
def score_seller_health():
    """Batch recalculate seller health scores"""
    conn = get_db()
    try:
        results = compute_seller_health_scores(conn)
        return {"status": "ok", "updated": len(results)}
    finally:
        conn.close()

@app.post("/score/lead-priority")
def score_lead_priority(lead_id: str = None):
    """Score a lead for routing priority"""
    conn = get_db()
    try:
        score = compute_lead_priority(conn, lead_id)
        return {"status": "ok", "lead_id": lead_id, "priority_score": score}
    finally:
        conn.close()

@app.post("/score/churn-risk")
def score_churn_risk():
    """Recalculate churn risk for all sellers"""
    conn = get_db()
    try:
        results = compute_churn_risk(conn)
        return {"status": "ok", "updated": len(results)}
    finally:
        conn.close()

@app.post("/score/recommendation")
def score_recommendation(seller_id: int):
    """Generate a dynamic Claude recommendation for a seller"""
    conn = get_db()
    try:
        rec = generate_claude_recommendation(conn, seller_id)
        if rec:
            return {"status": "ok", "seller_id": seller_id, "recommendation": rec}
        return {"status": "error", "message": "Seller not found or error occurred"}
    finally:
        conn.close()

@app.get("/score/sales-insights")
def get_sales_insights():
    """Generate AI-powered sales console insights"""
    conn = get_db()
    try:
        insights = generate_sales_insights(conn)
        return {"status": "ok", "insights": insights}
    finally:
        conn.close()


def run_recommendation_loop():
    """Background thread: periodically generates fresh AI recommendations for sellers."""
    print("[REC] Starting background recommendation loop...")
    time.sleep(20)  # Wait for system to fully init
    while True:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()
            # Pick 3 random paid sellers to refresh recommendations
            cur.execute("""
                SELECT seller_id FROM sellers
                WHERE service_name != 'Free'
                ORDER BY RANDOM() LIMIT 3
            """)
            seller_ids = [row[0] for row in cur.fetchall()]
            cur.close()
            conn.close()

            for sid in seller_ids:
                try:
                    conn2 = psycopg2.connect(**DB_CONFIG)
                    rec = generate_claude_recommendation(conn2, sid)
                    if rec:
                        print(f"[REC] Generated recommendation for seller {sid}: {rec[:50]}...")
                    conn2.close()
                except Exception as e:
                    print(f"[REC] Error for seller {sid}: {e}")
                time.sleep(2)  # Small delay between API calls

        except Exception as e:
            print(f"[REC] Loop error: {e}")

        time.sleep(30)  # Run every 30 seconds


@app.post("/simulate/events")
def simulate_events(count: int = 10):
    """Generate synthetic seller events"""
    if generator:
        generated = generator.generate_batch(count)
        return {"status": "ok", "generated": generated}
    return {"status": "error", "message": "generator not initialized"}

@app.post("/simulate/scenario")
def simulate_scenario(scenario: str = "churn"):
    """Run a specific demo scenario"""
    if simulator:
        result = simulator.run_scenario(scenario)
        return {"status": "ok", "scenario": scenario, "events": result}
    return {"status": "error", "message": "simulator not initialized"}
