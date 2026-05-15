import numpy as np
import math


def compute_lead_priority(conn, lead_id=None):
    """Compute lead priority score for routing"""
    cur = conn.cursor()
    if lead_id:
        cur.execute("""
            SELECT lead_id, intent_score, lead_quality, urgency, order_value_rs,
                   buyer_engagement_score, gst_verified
            FROM leads WHERE lead_id = %s
        """, (lead_id,))
    else:
        cur.execute("""
            SELECT lead_id, intent_score, lead_quality, urgency, order_value_rs,
                   buyer_engagement_score, gst_verified
            FROM leads WHERE status = 'ACTIVE' AND routed = false
            LIMIT 100
        """)

    rows = cur.fetchall()
    results = []

    for row in rows:
        lid, intent, quality, urgency, order_val, buyer_eng, gst = row

        intent_norm = min((intent or 0) / 100.0, 1.0)

        quality_map = {"Hot": 1.0, "Warm": 0.6, "Cold": 0.3}
        quality_w = quality_map.get(quality, 0.3)

        urgency_map = {"Immediate": 1.0, "Within Week": 0.6, "Within Month": 0.3, "Flexible": 0.15}
        urgency_w = urgency_map.get(urgency, 0.3)

        order_norm = min(math.log10(max(order_val or 1, 1)) / 7.0, 1.0)
        buyer_eng_norm = min((buyer_eng or 0) / 100.0, 1.0)
        gst_w = 1.0 if gst else 0.5

        priority = (
            0.25 * intent_norm +
            0.20 * quality_w +
            0.15 * urgency_w +
            0.15 * order_norm +
            0.10 * buyer_eng_norm +
            0.10 * gst_w +
            0.05 * 0.5  # default match score placeholder
        ) * 100

        priority = float(np.clip(priority, 0, 100))
        results.append({"lead_id": lid, "priority_score": priority})

    cur.close()
    return results[0]["priority_score"] if lead_id and results else results
