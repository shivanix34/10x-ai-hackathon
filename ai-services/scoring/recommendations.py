import os
import json
import urllib.request
import urllib.error
from datetime import datetime

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-flash-lite"


def _call_openrouter(system_prompt, user_prompt, max_tokens=250):
    """Call OpenRouter API using stdlib only (no extra deps)."""
    if not OPENROUTER_API_KEY:
        return None

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_BASE_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://marketplace-os.indiamart.com",
            "X-Title": "MarketplaceOS Intelligence",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[LLM ERROR] OpenRouter call failed: {e}")
        return None


def generate_claude_recommendation(conn, seller_id, leads_data=None):
    """
    Generate a seller-specific AI recommendation using OpenRouter LLM.
    If leads_data is provided, also suggests the best ROI lead.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT s.company_name, s.persona_type, s.service_name,
               s.primary_category, s.years_active, s.catalog_quality_score,
               s.avg_response_time_mins, s.total_products,
               b.health_score, b.engagement_score, b.churn_risk,
               b.response_efficiency, b.quota_utilization
        FROM sellers s
        JOIN seller_behavior_state b ON s.seller_id = b.seller_id
        WHERE s.seller_id = %s
    """, (seller_id,))
    row = cur.fetchone()

    if not row:
        cur.close()
        return None

    (company, persona, service, category, years, catalog_score,
     avg_resp_time, total_products, health, engagement, churn,
     response_eff, quota_util) = row

    # Get recent activity summary
    cur.execute("""
        SELECT event_type, COUNT(*) as cnt
        FROM seller_events WHERE seller_id = %s
        GROUP BY event_type ORDER BY cnt DESC LIMIT 8
    """, (seller_id,))
    activity_summary = {r[0]: r[1] for r in cur.fetchall()}

    leads_section = ""
    if leads_data and len(leads_data) > 0:
        leads_info = []
        for l in leads_data[:5]:
            lead = l.get("lead", l)
            leads_info.append(
                f"- {lead.get('product_name','?')}: ₹{lead.get('order_value_rs',0)}, "
                f"{lead.get('quantity',0)} units, {lead.get('buyer_city','?')}, "
                f"Score: {l.get('routing_score', l.get('match_score',0)):.0f}"
            )
        leads_section = f"""

Available BuyLeads for this seller:
{chr(10).join(leads_info)}

IMPORTANT: Identify the BEST ROI lead (highest order value + most recent) and recommend it specifically.
Tell the seller within how many minutes they should respond for the best conversion chance.
"""

    prompt = f"""You are an AI Success Coach for {company} on IndiaMART.

Seller Profile:
- Category: {category} | Years on IndiaMART: {years} | Products: {total_products}
- Subscription: {service} | Persona: {persona}
- Catalog Score: {catalog_score}/100 | Engagement: {engagement}/100
- Response Efficiency: {response_eff}/100 | Avg Response Time: {avg_resp_time:.0f} mins
- Quota Utilization: {quota_util}% | Churn Risk: {churn}

Recent Activity: {json.dumps(activity_summary)}
{leads_section}
Give a personalized, actionable recommendation (2-3 sentences max).
Start with an emoji. Be specific to THIS seller's data — mention their numbers.
If leads are available, highlight the best one and the optimal response time."""

    system = "You are IndiaMART's AI seller coach. Give specific, data-driven advice personalized to each seller. Never be generic."

    recommendation = _call_openrouter(system, prompt, max_tokens=200)
    if not recommendation:
        recommendation = fallback_recommendation(churn, engagement, response_eff, quota_util, service)

    cur.execute(
        "UPDATE seller_behavior_state SET recommendation = %s, last_updated = NOW() WHERE seller_id = %s",
        (recommendation, seller_id),
    )
    conn.commit()
    cur.close()
    return recommendation


def generate_seller_analysis(conn, seller_id):
    """
    Generate comprehensive AI analysis for the Sales team's review of a seller.
    Returns structured analysis with trend, churn probability, reasons, and interventions.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT s.company_name, s.persona_type, s.service_name,
               s.primary_category, s.years_active, s.catalog_quality_score,
               s.avg_response_time_mins, s.total_products, s.seller_rating,
               s.avg_weekly_leads, s.avg_weekly_lead_consumption,
               s.avg_response_rate, s.last_active_days_ago,
               s.support_ticket_count, s.notification_open_rate,
               b.health_score, b.engagement_score, b.churn_risk,
               b.response_efficiency, b.quota_utilization
        FROM sellers s
        JOIN seller_behavior_state b ON s.seller_id = b.seller_id
        WHERE s.seller_id = %s
    """, (seller_id,))
    row = cur.fetchone()

    if not row:
        cur.close()
        return None

    (company, persona, service, category, years, catalog_score,
     avg_resp_time, total_products, rating,
     avg_weekly_leads, avg_weekly_consumption, avg_response_rate,
     last_active_days, support_tickets, notif_open_rate,
     health, engagement, churn, response_eff, quota_util) = row

    # Get recent event distribution
    cur.execute("""
        SELECT event_type, COUNT(*) as cnt
        FROM seller_events WHERE seller_id = %s
        GROUP BY event_type ORDER BY cnt DESC
    """, (seller_id,))
    event_dist = {r[0]: r[1] for r in cur.fetchall()}

    # Get missed leads count
    missed = event_dist.get("missed_lead", 0)
    logins = event_dist.get("login", 0)
    responses = event_dist.get("response_sent", 0)

    prompt = f"""Analyze this IndiaMART seller for the sales team. Return a JSON object (no markdown, just raw JSON):

Seller: {company} (ID: {seller_id})
Category: {category} | Years: {years} | Subscription: {service} | Persona: {persona}
Products: {total_products} | Rating: {rating} | Catalog Score: {catalog_score}/100
Health: {health}/100 | Engagement: {engagement}/100 | Response Efficiency: {response_eff}/100
Avg Response Time: {avg_resp_time:.0f} mins | Avg Response Rate: {avg_response_rate}%
Quota Utilization: {quota_util}% | Last Active: {last_active_days} days ago
Support Tickets: {support_tickets} | Notification Open Rate: {notif_open_rate}%
Event Distribution: Logins={logins}, Missed Leads={missed}, Responses={responses}
Current Churn Risk: {churn}

Return ONLY this JSON format:
{{"trend":"declining/stable/improving","churn_probability":75,"reasons":["Reason 1 with specific data","Reason 2"],"interventions":["Specific action 1 for sales team","Specific action 2"]}}"""

    system = "You are a sales analytics AI. Return ONLY valid JSON, no markdown. Be specific with data points from the seller profile."

    result = _call_openrouter(system, prompt, max_tokens=300)

    if result:
        try:
            # Clean up potential markdown wrapping
            result = result.strip()
            if result.startswith("```"):
                result = result.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            parsed = json.loads(result)
            cur.close()
            return parsed
        except json.JSONDecodeError:
            print(f"[LLM] Failed to parse JSON: {result[:100]}")

    # Fallback
    cur.close()
    return fallback_seller_analysis(
        company, health, engagement, response_eff, quota_util,
        catalog_score, missed, last_active_days, support_tickets, churn
    )


def generate_sales_insights(conn):
    """Generate AI-powered platform-wide insights for the Sales Console."""
    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*), AVG(health_score), AVG(engagement_score),
               SUM(CASE WHEN churn_risk = 'High' THEN 1 ELSE 0 END),
               SUM(CASE WHEN churn_risk = 'Medium' THEN 1 ELSE 0 END),
               AVG(quota_utilization)
        FROM seller_behavior_state
    """)
    stats = cur.fetchone()
    total, avg_health, avg_engagement, high_risk, med_risk, avg_quota = stats

    cur.execute("SELECT COUNT(*) FROM interventions WHERE status = 'PENDING'")
    pending = cur.fetchone()[0]
    cur.close()

    prompt = f"""Platform metrics for IndiaMART sales team:
Total Sellers: {total}, Avg Health: {avg_health:.1f}/100, Avg Engagement: {avg_engagement:.1f}/100
High Risk: {high_risk}, Medium Risk: {med_risk}, Avg Quota: {avg_quota:.1f}%, Pending Interventions: {pending}

Give 3 bullet-point insights. Format: emoji + bold action + brief explanation. Under 20 words each."""

    system = "Sales analytics AI. 3 actionable bullet points. Concise and data-driven."
    insights = _call_openrouter(system, prompt, max_tokens=200)
    if not insights:
        insights = fallback_sales_insights(high_risk, avg_health, avg_quota, pending)
    return insights


def fallback_recommendation(churn, engagement, response, quota, service):
    if churn == "High":
        if engagement < 20:
            return "🚨 Critical: Re-engage immediately. Log in and respond to pending leads to prevent account degradation."
        return "⚠️ Your activity is declining. Consume leads and respond within 10 minutes to improve your score."
    if response < 40:
        return "⏱️ Improve response time: Respond within 10 minutes to high-intent buyers for better lead quality."
    if engagement < 40:
        return "📈 Increase engagement: Log in daily, update catalog, and consume available leads consistently."
    if quota < 30 and service != "Free":
        return "💡 You're under-utilizing your quota. Consume more leads to maximize your subscription value."
    return "📊 Stay active: Regular engagement and quick responses improve your lead routing priority."


def fallback_seller_analysis(company, health, engagement, response_eff, quota_util,
                              catalog_score, missed_leads, last_active, tickets, churn):
    reasons = []
    if catalog_score < 40:
        reasons.append(f"Catalog quality score is critically low at {catalog_score:.0f}/100")
    if engagement < 30:
        reasons.append(f"Engagement score dropped to {engagement:.0f}/100")
    if missed_leads > 5:
        reasons.append(f"Missed {missed_leads} leads — indicating disengagement")
    if last_active > 5:
        reasons.append(f"Last active {last_active} days ago")
    if tickets > 3:
        reasons.append(f"Filed {tickets} support tickets — possible dissatisfaction")
    if not reasons:
        reasons.append("Multiple low-level indicators suggest gradual disengagement")

    interventions = []
    if engagement < 30:
        interventions.append("Schedule an immediate re-engagement call")
    if catalog_score < 40:
        interventions.append("Offer catalog optimization assistance")
    if missed_leads > 5:
        interventions.append("Review lead quality match for this seller's category")
    interventions.append("Set up a 1-on-1 account review meeting")

    prob = min(95, max(20, int(100 - health)))
    trend = "declining" if churn == "High" else ("stable" if churn == "Medium" else "improving")

    return {
        "trend": trend,
        "churn_probability": prob,
        "reasons": reasons[:3],
        "interventions": interventions[:3],
    }


def fallback_sales_insights(high_risk, avg_health, avg_quota, pending):
    lines = []
    if high_risk and high_risk > 0:
        lines.append(f"🚨 **Prioritize outreach** to {int(high_risk)} high-risk sellers before they churn.")
    if avg_health and avg_health < 50:
        lines.append(f"💚 **Health alert**: Average is {avg_health:.0f}/100 — schedule engagement campaigns.")
    else:
        lines.append(f"💚 **Platform health** stable at {avg_health:.0f}/100 — maintain engagement.")
    if avg_quota and avg_quota < 40:
        lines.append(f"📈 **Quota under-utilized** at {avg_quota:.0f}% — educate sellers on lead consumption.")
    else:
        lines.append(f"📈 **Quota healthy** at {avg_quota:.0f}% — focus on upsell opportunities.")
    return "\n".join(lines[:3])
