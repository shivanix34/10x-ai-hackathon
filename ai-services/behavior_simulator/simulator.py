import json
import random
import time
import uuid
from datetime import datetime

import pika
import psycopg2


class BehaviorSimulator:
    def __init__(self, db_config, rabbitmq_url):
        self.db_config = db_config
        self.rabbitmq_url = rabbitmq_url

    def _get_db(self):
        return psycopg2.connect(**self.db_config)

    def _publish_events(self, events):
        params = pika.URLParameters(self.rabbitmq_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.queue_declare(queue="seller_activity_events", durable=True)
        for event in events:
            channel.basic_publish(
                exchange="", routing_key="seller_activity_events",
                body=json.dumps(event),
                properties=pika.BasicProperties(delivery_mode=2),
            )
        connection.close()
        return len(events)

    def run_scenario(self, scenario):
        if scenario == "churn":
            return self._simulate_churn()
        elif scenario == "power":
            return self._simulate_power_seller()
        elif scenario == "recovery":
            return self._simulate_recovery()
        elif scenario == "demand_spike":
            return self._simulate_demand_spike()
        return 0

    def _simulate_churn(self):
        """Simulate a seller churning: declining activity, missed leads"""
        conn = self._get_db()
        cur = conn.cursor()
        cur.execute("SELECT seller_id, company_name FROM sellers WHERE persona_type = 'Churning Seller' LIMIT 1")
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return 0

        sid, company = row
        events = []
        for i in range(10):
            events.append({
                "type": "missed_lead", "seller_id": sid, "company_name": company,
                "event_value": random.randint(1, 5),
                "metadata": {"reason": "inactive", "lead_quality": "Hot"},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
            if i % 3 == 0:
                events.append({
                    "type": "support_ticket", "seller_id": sid, "company_name": company,
                    "event_value": 1, "metadata": {"issue": "billing"},
                    "timestamp": datetime.now().isoformat(),
                    "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
                })
        return self._publish_events(events)

    def _simulate_power_seller(self):
        """Simulate a power seller: fast responses, high consumption"""
        conn = self._get_db()
        cur = conn.cursor()
        cur.execute("SELECT seller_id, company_name FROM sellers WHERE persona_type = 'Power Seller' LIMIT 1")
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return 0

        sid, company = row
        events = []
        for _ in range(10):
            events.append({
                "type": "response_sent", "seller_id": sid, "company_name": company,
                "event_value": random.randint(3, 10),
                "metadata": {"response_time_mins": random.randint(3, 10), "platform": "App"},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
            events.append({
                "type": "lead_consumed", "seller_id": sid, "company_name": company,
                "event_value": 1, "metadata": {"category": "Electronics"},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
        return self._publish_events(events)

    def _simulate_recovery(self):
        """Simulate a lazy seller recovering"""
        conn = self._get_db()
        cur = conn.cursor()
        cur.execute("SELECT seller_id, company_name FROM sellers WHERE persona_type = 'Lazy Seller' LIMIT 1")
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return 0

        sid, company = row
        events = []
        for _ in range(8):
            events.append({
                "type": "login", "seller_id": sid, "company_name": company,
                "event_value": 1, "metadata": {"platform": "App"},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
            events.append({
                "type": "response_sent", "seller_id": sid, "company_name": company,
                "event_value": random.randint(10, 25),
                "metadata": {"response_time_mins": random.randint(10, 25)},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
        return self._publish_events(events)

    def _simulate_demand_spike(self):
        """Generate many events across multiple sellers"""
        conn = self._get_db()
        cur = conn.cursor()
        cur.execute("SELECT seller_id, company_name, persona_type FROM sellers WHERE service_name != 'Free' LIMIT 20")
        sellers = cur.fetchall()
        cur.close()
        conn.close()

        events = []
        for sid, company, persona in sellers:
            events.append({
                "type": "lead_consumed", "seller_id": sid, "company_name": company,
                "event_value": 1, "metadata": {"category": "Electronics", "demand": "spike"},
                "timestamp": datetime.now().isoformat(),
                "event_id": f"SIM-{uuid.uuid4().hex[:8]}",
            })
        return self._publish_events(events)
