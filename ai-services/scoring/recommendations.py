import os
import json
import urllib.request
import urllib.error
from datetime import datetime

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.5-flash-lite"


def _call_openrouter(system_prompt, user_prompt, max_tokens=150):
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


def generate_claude_recommendation(conn, seller_id):
    """
    Generate an AI recommendation for a single seller using OpenRouter LLM.
    Falls back to rule-based logic if the API call fails.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT s.company_name, s.persona_type, s.service_name,
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

    company, persona, service, health, engagement, churn, response_eff, quota_util = row

    prompt = f"""You are an AI Seller Success Coach for IndiaMART, a B2B marketplace. Provide a short, actionable recommendation (1-2 sentences max) for this seller:

Company: {company}
Persona: {persona}
Subscription: {service}
Health Score: {health}/100
Engagement Score: {engagement}/100
Response Efficiency: {response_eff}/100
Quota Utilization: {quota_util}%
Churn Risk: {churn}

Start with an emoji. Be specific and actionable. No greetings."""

    system = "You are an expert B2B marketplace seller success coach. Give direct, specific, actionable advice in 1-2 sentences."

    recommendation = _call_openrouter(system, prompt)
    if not recommendation:
        recommendation = fallback_recommendation(churn, engagement, response_eff, quota_util, service)

    # Persist to DB
    cur.execute(
        "UPDATE seller_behavior_state SET recommendation = %s, last_updated = NOW() WHERE seller_id = %s",
        (recommendation, seller_id),
    )
    conn.commit()
    cur.close()
    return recommendation


def generate_sales_insights(conn):
    """
    Generate AI-powered platform-wide insights for the Sales Console.
    """
    cur = conn.cursor()

    # Gather aggregate stats
    cur.execute("""
        SELECT
            COUNT(*) AS total,
            AVG(health_score) AS avg_health,
            AVG(engagement_score) AS avg_engagement,
            SUM(CASE WHEN churn_risk = 'High' THEN 1 ELSE 0 END) AS high_risk,
            SUM(CASE WHEN churn_risk = 'Medium' THEN 1 ELSE 0 END) AS med_risk,
            AVG(quota_utilization) AS avg_quota
        FROM seller_behavior_state
    """)
    stats = cur.fetchone()
    total, avg_health, avg_engagement, high_risk, med_risk, avg_quota = stats

    cur.execute("""
        SELECT COUNT(*) FROM interventions WHERE status = 'PENDING'
    """)
    pending_interventions = cur.fetchone()[0]

    cur.close()

    prompt = f"""You are a Sales Intelligence AI for IndiaMART's B2B marketplace. Provide 3 concise, actionable bullet-point insights for the sales team based on these platform metrics:

Total Active Sellers: {total}
Average Health Score: {avg_health:.1f}/100
Average Engagement Score: {avg_engagement:.1f}/100
High Risk (Churning) Sellers: {high_risk}
Medium Risk Sellers: {med_risk}
Average Quota Utilization: {avg_quota:.1f}%
Pending Interventions: {pending_interventions}

Format each insight as: emoji + bold action + brief explanation. Keep each bullet under 20 words. Focus on what the sales team should do RIGHT NOW."""

    system = "You are a sales analytics AI. Provide exactly 3 actionable bullet-point insights. Be concise and data-driven."

    insights = _call_openrouter(system, prompt, max_tokens=250)
    if not insights:
        insights = fallback_sales_insights(high_risk, avg_health, avg_quota, pending_interventions)

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


def fallback_sales_insights(high_risk, avg_health, avg_quota, pending):
    lines = []
    if high_risk > 0:
        lines.append(f"🚨 **Prioritize outreach** to {int(high_risk)} high-risk sellers before they churn.")
    if avg_health < 50:
        lines.append(f"💚 **Health alert**: Average health is {avg_health:.0f}/100 — schedule engagement campaigns.")
    else:
        lines.append(f"💚 **Platform health** is stable at {avg_health:.0f}/100 — maintain current engagement.")
    if avg_quota < 40:
        lines.append(f"📈 **Quota under-utilized** at {avg_quota:.0f}% — educate sellers on lead consumption benefits.")
    else:
        lines.append(f"📈 **Quota utilization** is healthy at {avg_quota:.0f}% — focus on upsell opportunities.")
    if pending > 0:
        lines.append(f"🎯 **{int(pending)} pending interventions** need resolution — assign to account managers.")
    return "\n".join(lines[:3])
