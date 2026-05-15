import numpy as np


def compute_churn_risk(conn):
    """Recalculate churn risk for all sellers based on behavioral signals"""
    cur = conn.cursor()
    cur.execute("""
        SELECT s.seller_id, s.last_active_days_ago, s.avg_weekly_lead_consumption,
               s.avg_weekly_leads, s.avg_response_time_mins, s.avg_response_rate,
               s.notification_open_rate,
               COALESCE(b.engagement_score, s.engagement_score) as engagement,
               COALESCE(b.health_score, s.seller_health_score) as health,
               COALESCE(b.quota_utilization, 0) as quota_util
        FROM sellers s
        LEFT JOIN seller_behavior_state b ON s.seller_id = b.seller_id
    """)
    rows = cur.fetchall()
    results = []

    for row in rows:
        (sid, last_active, consumption, weekly_leads, resp_time,
         resp_rate, notif_rate, engagement, health, quota_util) = row

        # Inactivity factor (0-1, higher = more risk)
        inactivity = min((last_active or 0) / 30.0, 1.0)

        # Consumption decline
        consumption_rate = 0.5
        if weekly_leads and weekly_leads > 0:
            consumption_rate = 1.0 - min((consumption or 0) / weekly_leads, 1.0)

        # Response degradation
        resp_degradation = min((resp_time or 60) / 120.0, 1.0)

        # Engagement decay
        eng_decay = 1.0 - min((engagement or 50) / 100.0, 1.0)

        # Notification ignore
        notif_ignore = 1.0 - min((notif_rate or 50) / 100.0, 1.0)

        risk_score = (
            0.30 * inactivity +
            0.25 * consumption_rate +
            0.20 * resp_degradation +
            0.15 * eng_decay +
            0.10 * notif_ignore
        )

        risk_score = float(np.clip(risk_score, 0, 1))

        if risk_score > 0.55:
            churn_label = "High"
        elif risk_score > 0.25:
            churn_label = "Medium"
        else:
            churn_label = "Low"

        cur.execute(
            "UPDATE seller_behavior_state SET churn_risk = %s, last_updated = NOW() WHERE seller_id = %s",
            (churn_label, sid)
        )
        results.append({"seller_id": sid, "churn_risk": churn_label, "risk_score": risk_score})

    conn.commit()
    cur.close()
    return results
