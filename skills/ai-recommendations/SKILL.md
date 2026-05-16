---
skill_id: ai-recommendations
skill_name: AI-Powered Seller Recommendations
version: 1.0.0
category: marketplace-operations
tags: [recommendations, ai-generated, seller-actions, intervention-suggestions, personalization, llm-powered]
---

# AI-Powered Seller Recommendations Skill

## Activation Description

**Use this skill when you need to:**
- Generate personalized intervention recommendations for sellers
- Create AI-powered action suggestions based on behavioral analysis
- Recommend optimal actions to prevent churn or accelerate growth
- Suggest high-ROI leads tailored to seller capability
- Generate messaging angles and communication strategies
- Recommend multi-channel engagement sequences
- Create seller-specific operational improvement suggestions

**Key triggering terms:**
`recommendations` | `suggested actions` | `intervention strategy` | `seller recommendations` | `personalized actions` | `optimization suggestions` | `AI recommendations` | `action generation`

## Problem Statement

Current intervention approaches are generic and reactive:

- **One-size-fits-all messaging**: All at-risk sellers get same template email (low relevance, poor engagement)
- **Manual recommendation creation**: Sales teams spend hours crafting personalized outreach (inefficient, inconsistent)
- **No contextual insights**: Recommendations don't reference seller-specific metrics or behavioral signals
- **Limited action options**: Standard playbook doesn't adapt to unique seller situations
- **Poor timing optimization**: Outreach scheduled without considering seller's peak engagement windows
- **No ROI prediction**: Can't estimate likelihood of recommendation acceptance or revenue impact

## Solution

**LLM-powered recommendation engine** (Gemini 2.5 Flash) that:
1. **Analyzes seller context** (current health, churn risk, behavioral patterns, historical interventions)
2. **Identifies leverage points** (what specific actions drive engagement for this seller?)
3. **Generates multi-type recommendations** (retention, growth, operational, lead optimization)
4. **Personalizes messaging** (context-aware angles, seller-specific language)
5. **Optimizes sequencing** (in-app notification → email → phone with timing)
6. **Estimates success probability** (confidence that seller will respond/convert)

## Key Outputs

**Adaptive Seller Recommendations**
```json
{
  "seller_id": "SEL-89234",
  "recommendations": [
    {
      "type": "immediate_outreach",
      "priority": "P0",
      "suggested_action": "personal_account_checkup",
      "messaging_angle": "quota_exhaustion_support",
      "context": "Seller at 95% quota utilization with high engagement; likely needs immediate support",
      "suggested_messaging": "Hi [Seller Name]! We noticed you're crushing it with lead responses (95% quota used). Let's talk about expanding your quota to keep this momentum going!",
      "confidence": 0.87,
      "estimated_response_probability": 0.82
    },
    {
      "type": "high_roi_lead_recommendation",
      "priority": "P0",
      "suggested_action": "respond_to_high_roi_lead",
      "best_lead_id": "LEAD-44521",
      "lead_value": 12500,
      "lead_description": "Premium buyer, immediate need for Machinery components, high budget",
      "optimal_response_window_mins": 10,
      "messaging_angle": "high_conversion_opportunity",
      "suggested_messaging": "New high-value lead just came in from a premium buyer in your category - they need immediate response and have a ₹12.5L order value.",
      "confidence": 0.94,
      "estimated_conversion_probability": 0.87
    },
    {
      "type": "operational_optimization",
      "priority": "P2",
      "suggested_action": "lead_response_workflow_review",
      "current_metric": "avg_response_latency_hours: 18",
      "benchmark_metric": "avg_response_latency_hours: 4",
      "gap_severity": "HIGH",
      "improvement_opportunity": "Response time 4.5x above category benchmark",
      "suggested_messaging": "We analyzed your response patterns and found an opportunity: your avg response time is 18 hours vs 4-hour benchmark. Let's optimize your response workflow.",
      "confidence": 0.68
    },
    {
      "type": "upsell_opportunity",
      "priority": "P1",
      "suggested_action": "plan_upgrade_consultation",
      "current_plan": "MINI_DYNAMIC_CATALOG",
      "recommended_plan": "MAXIMISER_PRO",
      "revenue_uplift": 25000,
      "upgrade_rationale": "Seller at quota limit; annual plan upgrade could increase lead allocation by 3x with minimal effort increase",
      "confidence": 0.71
    }
  ],
  "multi_channel_engagement_sequence": [
    {
      "channel": "in_app_notification",
      "timing": "immediate",
      "message_type": "high_roi_lead_alert",
      "priority_signal": "CRITICAL"
    },
    {
      "channel": "email",
      "timing": "6_hours",
      "message_type": "personalized_recommendation_summary",
      "priority_signal": "HIGH"
    },
    {
      "channel": "phone",
      "timing": "24_hours",
      "message_type": "account_manager_follow_up",
      "priority_signal": "MEDIUM"
    }
  ],
  "recommendation_timestamp": "2026-05-16T14:23:45Z",
  "seller_context_summary": "High-performing seller at risk of quota exhaustion; ready for upgrade and additional lead volume"
}
```

**Recommendation Batch Generation**
```json
{
  "batch_id": "REC-BATCH-2026-05-16",
  "generation_timestamp": "2026-05-16T14:25:00Z",
  "sellers_analyzed": 1250,
  "recommendations_generated": 1847,
  "breakdown": {
    "immediate_outreach": 284,
    "high_roi_lead_recommendations": 567,
    "operational_optimizations": 412,
    "upsell_opportunities": 384,
    "growth_acceleration": 200
  },
  "total_estimated_revenue_impact": 18500000,
  "avg_recommendation_confidence": 0.81
}
```

## Business Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Recommendation Personalization | Generic templates | Context-aware LLM | 100% personalized |
| Recommendation Creation Time | 30 min per seller | <1 min automated | 98% time saved |
| Seller Engagement Rate | 18% | 45-55% | +150% open rate |
| Recommendation Acceptance Rate | 20% | 45%+ | +125% conversion |
| Sales Team Productivity | 40 hrs/week on recs | 2 hrs/week | 95% time saved |
| Revenue Impact per Recommendation | ₹8K avg | ₹15K+ avg | +87% |

## Architecture

**LLM Prompt Engineering:**
```
System Context:
- Seller current health score, churn risk, engagement metrics
- Recent behavioral changes (trends, anomalies, momentum)
- Seller segment (plan tier, category, geography)
- Historical interventions and seller responses
- Current marketplace situation (quota status, category trends)

User Query:
"Analyze this seller's situation and generate 3-5 personalized recommendations"

LLM Output:
- Situation analysis (what's happening with this seller)
- Root cause analysis (why are they at risk/opportunity)
- Specific recommendations (exact actions, messaging, timing)
- Success probability estimates (confidence in recommendation)
```

**Recommendation Scoring:**
```
Confidence = 
  0.40 * behavioral_signal_quality +
  0.30 * seller_history_relevance +
  0.20 * peer_cohort_success_rate +
  0.10 * contextual_alignment
```

## Integration Points

**Code References:**
- Recommendation generation: `ai-services/scoring/recommendations.py`
- LLM calls (OpenRouter/Gemini): `ai-services/scoring/recommendations.py`
- Seller context enrichment: `backend/internal/db/postgres.go`
- Recommendation storage: `backend/internal/api/handlers.go`

**Data Flow:**
```
Seller Analysis → Context Enrichment → LLM Prompt → Recommendation Generation
→ Confidence Scoring → Multi-channel Sequencing → Publishing
```

## Validation Rules

- LLM responses validated for factual accuracy (no hallucinated metrics)
- Recommendations must reference actual seller state (don't recommend impossible actions)
- Confidence scores calibrated against actual seller response rates
- Messaging tone must match seller segment and communication preferences
- Revenue impact estimates must be conservative (±20% margin)

## Success Metrics

✅ Recommendation acceptance rate >40%
✅ LLM response quality validated by human review (>0.85 score)
✅ Seller engagement lift from personalized recs +100-150%
✅ Revenue conversion from recommendations >₹12K per accepted rec
✅ Recommendation generation latency <5 seconds per seller

## Positive Triggers

1. "Generate personalized outreach strategies for each of our at-risk sellers."
2. "I need AI to recommend specific actions for sellers to prevent churn."
3. "Create intelligent recommendations that tell sellers exactly what to do to succeed."

## Negative Triggers

1. "Write a generic seller onboarding email template." (generic, not intelligent)
2. "List all seller support tickets." (data retrieval, not recommendations)

---

**Status**: ✅ PRODUCTION-READY | **Last Updated**: 2026-05-16
