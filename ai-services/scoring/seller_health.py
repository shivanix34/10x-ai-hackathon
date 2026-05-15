import numpy as np


def compute_seller_health_scores(conn):
    """Batch compute seller health scores using weighted scoring"""
    cur = conn.cursor()
    cur.execute("""
        SELECT s.seller_id, s.engagement_score, s.avg_response_rate,
               s.avg_response_time_mins, s.catalog_quality_score,
               s.seller_rating, s.notification_open_rate,
               COALESCE(b.quota_utilization, 0)
        FROM sellers s
        LEFT JOIN seller_behavior_state b ON s.seller_id = b.seller_id
    """)
    rows = cur.fetchall()
    results = []

    for row in rows:
        sid, engagement, resp_rate, resp_time, catalog, rating, notif, quota_util = row

        engagement_norm = min((engagement or 0) / 100.0, 1.0)
        resp_rate_norm = min((resp_rate or 0) / 100.0, 1.0)
        resp_time_norm = max(0, 1.0 - min((resp_time or 60) / 120.0, 1.0))
        catalog_norm = min((catalog or 0) / 100.0, 1.0)
        rating_norm = min((rating or 0) / 5.0, 1.0)
        notif_norm = min((notif or 0) / 100.0, 1.0)
        consumption_norm = min((quota_util or 0) / 100.0, 1.0)

        health = (
            0.20 * engagement_norm +
            0.20 * resp_rate_norm +
            0.15 * resp_time_norm +
            0.15 * catalog_norm +
            0.10 * rating_norm +
            0.10 * notif_norm +
            0.10 * consumption_norm
        ) * 100

        health = np.clip(health, 0, 100)

        cur.execute(
            "UPDATE seller_behavior_state SET health_score = %s, last_updated = NOW() WHERE seller_id = %s",
            (float(health), sid)
        )
        results.append({"seller_id": sid, "health_score": float(health)})

    conn.commit()
    cur.close()
    return results
