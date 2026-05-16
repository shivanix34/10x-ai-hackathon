---
skill_id: realtime-seller-intelligence
skill_name: Realtime Seller Intelligence & Churn Prediction
version: 1.0
tags: [seller-churn, behavioral-analytics, recommendations, lead-routing]
---

# Realtime Seller Intelligence Skill

## When to Use
- Predict seller churn risk
- Identify at-risk sellers for intervention
- Generate personalized recommendations
- Recommend high-ROI leads to sellers
- Estimate revenue-at-risk

## Problem
Marketplaces lose 25-35% of sellers annually. Current detection takes 14-21 days (manual). No real-time intelligence linking seller behavior → churn → actions.

## Solution
AI system that:
1. **Analyzes behavioral signals** (inactivity, response delays, engagement drop)
2. **Predicts churn risk** with 78%+ accuracy (30/60/90-day horizons)
3. **Recommends interventions** (outreach, plan upgrade, operational support)
4. **Suggests best-ROI leads** with 10-min response window for conversion
5. **Prioritizes sellers** for sales team action (P0/P1/P2 urgency)

## Key Outputs

**Churn Risk Assessment**
```json
{
  "seller_id": "SEL-89234",
  "churn_risk": 0.78,
  "risk_band": "HIGH",
  "revenue_at_risk": 4200,
  "30_day_churn_prob": 0.34,
  "intervention_urgency": "CRITICAL"
}
```

**Seller Recommendations**
```json
{
  "seller_id": "SEL-89234",
  "recommendations": [
    {
      "type": "immediate_outreach",
      "priority": "P0",
      "action": "account_checkup"
    },
    {
      "type": "high_roi_lead",
      "priority": "P0",
      "lead_id": "LEAD-44521",
      "lead_value": 12500,
      "response_window_mins": 10
    }
  ]
}
```

**Intervention Priority Queue**
```json
{
  "p0_sellers": [
    {
      "seller_id": "SEL-89234",
      "intervention": "URGENT_RETENTION",
      "revenue_at_risk": 4200,
      "urgency": "CRITICAL"
    }
  ]
}
```

## Predicted Business Impact

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Churn Detection | 14-21 days | 2-4 hours | 70% faster |
| Seller Retention | 82% | 89% | +7% |
| Sales Time | 160 hrs/mo | 40 hrs/mo | 75% savings |
| Revenue Protected | $0 | ₹25Cr+ | 3-5x ROI |
| Intervention Success | 1.8x payback | 3.2x payback | +78% |

## Architecture

**Data Flow:**
RabbitMQ (events) → Python AI Services (scoring) → PostgreSQL (storage) → Redis (cache) → Go Backend → React Dashboard

**Key Components:**
- **Churn Risk Engine**: Multi-factor behavioral scoring (inactivity, consumption, response time, engagement decay)
- **Lead Priority Scoring**: Real-time lead quality ranking (intent, urgency, order value, buyer engagement)
- **Recommendation Engine**: LLM-powered (Gemini 2.5) personalized intervention suggestions
- **Dashboard**: Real-time seller activity, churn alerts, intervention queue, revenue-at-risk

## Behavioral Signals

- Last active days
- Lead consumption rate
- Response time (avg minutes)
- Response rate (%)
- Notification open rate (%)
- Engagement score
- Quota utilization

## Seller Lifecycle Phases

EMERGING → ENGAGED → MAINTAINING → DISENGAGING → AT_RISK → DORMANT

## Intervention Types

| Type | Trigger | Action |
|------|---------|--------|
| URGENT_RETENTION | Churn risk >0.80 + MRR >$2000 | Account manager call |
| PROACTIVE_ENGAGEMENT | Multiple decline signals | Outreach + resources |
| PLAN_UPGRADE | Quota exhaustion (>95%) | Upgrade recommendation |
| OPERATIONAL_SUPPORT | Response latency 4x+ benchmark | Process improvement help |
| LEAD_RECOMMENDATION | Engagement gap | High-ROI lead suggestion |

## Scaling

- Handles: 50K → 500K → 2M+ sellers
- Events/sec: 50 → 500 → 5K+
- Compute: 2-3 nodes → 5-10 nodes → 20+ nodes (k8s)
- Latency: <200ms p95 for churn scoring

## EStimated Success Criteria

✅ Intervention execution <2 hrs (P0), <24 hrs (P1)
✅ Seller response rate >35%
✅ Intervention ROI >2.5x
✅ Dashboard latency <5 sec

## Deployment

**Phase 1:** Event ingestion + churn model (Week 1-2)
**Phase 2:** Recommendation engine + queue (Week 2-3)
**Phase 3:** Dashboard + real-time publishing (Week 3-4)
**Phase 4:** Sales team integration (Week 4-5)
**Phase 5:** Monitoring & optimization (Week 5+)

## Error Handling

| Failure | Solution |
|---------|----------|
| Redis down | Fallback to PostgreSQL read-only |
| RabbitMQ backlog | Increase consumer parallelism |
| Infrastructure outage | Suppress churn alerts for 24 hrs |
| Low confidence predictions | Route to manual review |
| Duplicate events | Deduplicate by fingerprint + timestamp |

## Extensibility

Framework reusable for:
- Customer lifecycle intelligence
- Fraud pattern detection
- Seller quality scoring
- Support ticket prioritization
- Dynamic workflow orchestration

---

