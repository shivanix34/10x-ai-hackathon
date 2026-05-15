import json
import random
import time
import uuid
from datetime import datetime

import pika
import psycopg2
from faker import Faker

fake = Faker("en_IN")

PERSONA_EVENT_PROFILES = {
    "Power Seller": {
        "events": ["login", "lead_consumed", "response_sent", "quotation_sent", "notification_opened", "catalog_updated"],
        "weights": [0.15, 0.25, 0.25, 0.15, 0.10, 0.10],
        "response_time_range": (3, 15),
        "activity_level": 0.9,
    },
    "Premium Stable Seller": {
        "events": ["login", "lead_consumed", "response_sent", "notification_opened", "product_added"],
        "weights": [0.20, 0.20, 0.25, 0.20, 0.15],
        "response_time_range": (10, 30),
        "activity_level": 0.75,
    },
    "New Seller": {
        "events": ["login", "lead_consumed", "response_sent", "notification_opened", "catalog_updated"],
        "weights": [0.25, 0.15, 0.20, 0.25, 0.15],
        "response_time_range": (15, 45),
        "activity_level": 0.6,
    },
    "Lazy Seller": {
        "events": ["login", "missed_lead", "notification_opened", "support_ticket"],
        "weights": [0.30, 0.35, 0.20, 0.15],
        "response_time_range": (60, 120),
        "activity_level": 0.3,
    },
    "Churning Seller": {
        "events": ["missed_lead", "support_ticket", "login"],
        "weights": [0.50, 0.30, 0.20],
        "response_time_range": (90, 180),
        "activity_level": 0.15,
    },
    "Free Active Seller": {
        "events": ["login", "notification_opened", "catalog_updated", "product_added"],
        "weights": [0.35, 0.30, 0.20, 0.15],
        "response_time_range": (30, 60),
        "activity_level": 0.4,
    },
}

EVENT_SOURCES = ["seller_portal", "buyer_platform", "notification_engine", "crm_system", "mobile_app"]


class SyntheticEventGenerator:
    def __init__(self, db_config, rabbitmq_url):
        self.db_config = db_config
        self.rabbitmq_url = rabbitmq_url
        self.sellers = []
        self._load_sellers()

    def _load_sellers(self):
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()
            cur.execute("SELECT seller_id, company_name, persona_type, service_name, city FROM sellers")
            self.sellers = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[SYNTH] Error loading sellers: {e}")

    def _get_rabbitmq_channel(self):
        params = pika.URLParameters(self.rabbitmq_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.queue_declare(queue="seller_activity_events", durable=True)
        return connection, channel

    def generate_event(self, seller=None):
        if not self.sellers:
            self._load_sellers()
            if not self.sellers:
                return None

        if seller is None:
            seller = random.choice(self.sellers)

        sid, company, persona, service, city = seller
        profile = PERSONA_EVENT_PROFILES.get(persona, PERSONA_EVENT_PROFILES["New Seller"])

        # Check activity level - inactive sellers generate fewer events
        if random.random() > profile["activity_level"]:
            return None

        event_type = random.choices(profile["events"], weights=profile["weights"], k=1)[0]
        resp_min, resp_max = profile["response_time_range"]

        event_value = random.randint(1, 100)
        metadata = {}

        if event_type == "response_sent":
            resp_time = random.randint(resp_min, resp_max)
            event_value = resp_time
            metadata = {"response_time_mins": resp_time, "platform": random.choice(["App", "Desktop", "Mobile Site"])}
        elif event_type == "lead_consumed":
            metadata = {"intent_score": random.randint(40, 100), "category": fake.random_element(["Electronics", "Machinery", "Chemicals", "Garments", "Furniture", "Agriculture", "Leather", "Packaging"])}
        elif event_type == "missed_lead":
            metadata = {"reason": random.choice(["timeout", "inactive", "quota_full"]), "lead_quality": random.choice(["Hot", "Warm", "Cold"])}
        elif event_type == "login":
            metadata = {"platform": random.choice(["Desktop", "App", "Mobile Site"])}
        elif event_type in ("catalog_updated", "product_added"):
            metadata = {"products_count": random.randint(1, 10)}
        elif event_type == "notification_opened":
            metadata = {"notification_type": random.choice(["lead_alert", "promotion", "reminder"])}
        elif event_type == "support_ticket":
            metadata = {"issue": random.choice(["billing", "lead_quality", "technical", "account"])}

        event = {
            "type": event_type,
            "seller_id": sid,
            "company_name": company,
            "persona_type": persona,
            "service_name": service,
            "event_value": event_value,
            "event_source": random.choice(EVENT_SOURCES),
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "event_id": f"SYN-{uuid.uuid4().hex[:8]}",
        }
        return event

    def generate_batch(self, count=10):
        connection = None
        try:
            connection, channel = self._get_rabbitmq_channel()
            generated = 0
            for _ in range(count):
                event = self.generate_event()
                if event:
                    channel.basic_publish(
                        exchange="",
                        routing_key="seller_activity_events",
                        body=json.dumps(event),
                        properties=pika.BasicProperties(delivery_mode=2),
                    )
                    generated += 1
            return generated
        except Exception as e:
            print(f"[SYNTH] Batch error: {e}")
            return 0
        finally:
            if connection and connection.is_open:
                connection.close()

    def run_continuous(self, interval=2.0):
        """Continuously generate events, publishing to RabbitMQ"""
        print("[SYNTH] Starting continuous event generation...")
        time.sleep(10)  # Wait for system to initialize

        while True:
            try:
                connection, channel = self._get_rabbitmq_channel()
                while True:
                    # Generate 2-5 events per cycle
                    count = random.randint(2, 5)
                    for _ in range(count):
                        event = self.generate_event()
                        if event:
                            channel.basic_publish(
                                exchange="",
                                routing_key="seller_activity_events",
                                body=json.dumps(event),
                                properties=pika.BasicProperties(delivery_mode=2),
                            )
                    time.sleep(interval)
            except Exception as e:
                print(f"[SYNTH] Connection error: {e}, reconnecting...")
                time.sleep(5)
