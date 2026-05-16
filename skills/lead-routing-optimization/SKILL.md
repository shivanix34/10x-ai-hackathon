---
skill_id: lead-routing-optimization
skill_name: Lead Routing & Prioritization Engine
version: 1.0
category: marketplace-intelligence
tags: [lead-routing, matching, prioritization, roi-optimization]
---

# Lead Routing & Prioritization Engine

## Activation Description

**Use this skill when you need to:**
- Route high-quality leads to best-fit sellers
- Prioritize leads by conversion potential (ROI, intent, urgency)
- Match seller capabilities with lead requirements
- Maximize lead conversion rate and seller satisfaction
- Recommend high-ROI lead opportunities to at-risk sellers

**Key triggering terms:**
`lead routing` | `lead allocation` | `lead matching` | `lead priority` | `lead quality` | `best-fit seller` | `lead conversion` | `roi optimization`

## Problem Statement

Marketplace leads go to wrong sellers:
- Generic geographic/category matching leaves 40-50% conversion potential on table
- No consideration of seller response capacity, historical conversion rates, or engagement quality
- High-value leads routed equally as low-value leads
- At-risk sellers miss best-ROI opportunities to recover engagement
- Revenue leakage from poor lead-seller alignment

## Solution

**Lead Priority Score** = (Intent × 0.25) + (Quality × 0.20) + (Urgency × 0.15) + (OrderValue × 0.15) + (BuyerEngagement × 0.10) + (GSTVerified × 0.10) + (MatchScore × 0.05)

**Seller Suitability** = Lead Category Match + Seller Response Capacity + Historical Conversion Rate + Current Engagement Level

**Smart Routing:**
1. Score all active leads by ROI potential
2. Identify best 3-5 seller matches per lead
3. Allocate leads to maximize conversion probability
4. Recommend "best lead" to at-risk sellers within 10-min response window

## Key Inputs

- Lead attributes: intent_score, quality, urgency, order_value, buyer_engagement, gst_verified
- Lead history: response_rate by seller category, historical conversion patterns
- Seller profile: primary_category, response_capacity, conversion_rate_history, current_engagement
- Historical lead-seller matches: conversion outcomes, seller feedback

## Key Outputs

```json
{
  "lead_id": "LEAD-44521",
  "priority_score": 82,
  "priority_band": "HOT",
  "recommended_sellers": [
    {
      "seller_id": "SEL-89234",
      "match_score": 0.94,
      "expected_conversion": 0.62,
      "reason": "high_intent_match + optimal_response_time"
    }
  ],
  "expected_order_value": 12500,
  "optimal_response_window_mins": 10,
  "roi_impact": "₹7750 expected revenue"
}
```

## Predicted Business Impact

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Lead Conversion | 12% | 18-20% | +50-67% |
| Lead Response Time | 8 hrs avg | 45 mins avg | 90% faster |
| Seller Satisfaction | 65% | 85% | +30% |
| Lead Allocation Accuracy | 60% | 88% | +47% |
| Revenue per Lead | ₹1500 | ₹2400 | +60% |

## Implementation References

**Source Code:**
- [lead_priority.py](../../ai-services/scoring/lead_priority.py) - Lead scoring algorithm
- [routing_engine.go](../../backend/internal/routing/engine.go) - Real-time routing logic

**API Integration:**
- GraphQL: `query getLeadPriority(leadId)` → returns priority score
- REST: `POST /api/leads/route` → allocates leads to sellers

**Database:**
- leads table: lead_id, intent_score, lead_quality, urgency, order_value_rs
- lead_seller_matching: historical conversion patterns

## Validation Rules

✓ Lead ID must exist in active inventory
✓ Order value must be positive and realistic (<₹500K cap)
✓ Seller response capacity cannot exceed 100%
✓ Match score between 0-1 normalized
✓ Recommended sellers must be active and eligible

## Error Handling

| Issue | Solution |
|-------|----------|
| No eligible sellers | Use category fallback; notify ops |
| Stale conversion data | Use plan-tier average benchmark |
| API timeout | Return cached last-known priority |

---
**Status**: ✅ PRODUCTION | **Implementation**: [Lead Routing Code](../../ai-services/scoring/lead_priority.py)
