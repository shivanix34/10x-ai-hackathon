import os
import anthropic
from datetime import datetime

# Initialize Anthropic client
client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", "")
)

def generate_claude_recommendation(conn, seller_id):
    """
    Generate an AI recommendation using Claude based on the seller's state.
    Returns the new recommendation string.
    """
    cur = conn.cursor()
    # Get seller state
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

    company, persona, service, health, engagement, churn, response, quota = row
    
    # Check if API key is provided
    if not client.api_key:
        # Fallback if no API key
        return fallback_recommendation(churn, engagement, response, quota, service)

    prompt = f"""You are an AI Seller Success Coach for a B2B marketplace. Provide a short, actionable, and encouraging recommendation (1-2 sentences maximum) for a seller with the following profile:

Company: {company}
Persona: {persona}
Subscription: {service}
Health Score: {health}/100
Engagement Score: {engagement}/100
Response Efficiency: {response}/100
Quota Utilization: {quota}%
Churn Risk: {churn}

Do not use formal greetings or closings. Just give the recommendation. Use an appropriate emoji at the start."""

    try:
        response_msg = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            temperature=0.7,
            system="You are an expert B2B marketplace seller success coach providing direct, actionable advice.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        recommendation = response_msg.content[0].text.strip()
        
        # Update database with new recommendation
        cur.execute(
            "UPDATE seller_behavior_state SET recommendation = %s, last_updated = NOW() WHERE seller_id = %s",
            (recommendation, seller_id)
        )
        conn.commit()
        cur.close()
        return recommendation
        
    except Exception as e:
        print(f"[CLAUDE ERROR] Failed to generate recommendation: {e}")
        cur.close()
        return fallback_recommendation(churn, engagement, response, quota, service)


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
