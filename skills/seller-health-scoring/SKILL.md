---
skill_id: seller-health-scoring
skill_name: Seller Health Scoring & Monitoring
version: 1.0.0
category: marketplace-operations
tags: [seller-health, engagement-scoring, seller-quality, performance-monitoring, seller-metrics]
---

# Seller Health Scoring & Monitoring Skill

## Activation Description

**Use this skill when you need to:**
- Calculate overall seller health scores across engagement dimensions
- Monitor seller performance trends and identify degradation
- Benchmark sellers against peer groups in same category/tier
- Detect sellers approaching critical thresholds (quota exhaustion, response delays)
- Segment sellers by health status for targeted interventions
- Forecast seller performance and capability changes
- Identify high-performing seller cohorts

**Key triggering terms:**
`seller health` | `seller performance` | `engagement score` | `seller quality` | `performance monitoring` | `seller metrics` | `benchmark sellers` | `seller capability`

## Problem Statement

Without unified seller health monitoring, marketplaces can't proactively identify underperforming sellers or recognize quality degradation until revenue impact is severe. Current challenges:

- **Fragmented metrics**: Health scattered across catalogs, response logs, transaction history (no unified view)
- **Reactive monitoring**: Sellers discovered underperforming only after complaints or churn (too late)
- **No peer benchmarking**: Sellers compared against unrealistic standards; no category-specific context
- **Manual scoring**: Health assessment requires manual dashboard checking by operations (20+ hours/week)
- **Lost visibility**: Can't identify improvement opportunities or at-risk transitions before happening

## Solution

**Unified seller health scoring system** that:
1. **Aggregates metrics** across catalog, engagement, response, transaction dimensions
2. **Normalizes scores** (0-100) with peer benchmarking by category + tier
3. **Tracks trends** (1-day, 7-day, 30-day momentum) to detect degradation early
4. **Flags thresholds** (quota >95%, response >4x benchmark, engagement drop >50%)
5. **Generates alerts** for health status changes (EXCELLENT→GOOD, GOOD→AT_RISK)

## Key Outputs

**Seller Health Score**
```json
{
  "seller_id": "SEL-89234",
  "overall_health_score": 78,
  "health_status": "GOOD",
  "health_trend": "STABLE",
  "dimension_scores": {
    "catalog_freshness": 85,
    "response_responsiveness": 72,
    "engagement_participation": 68,
    "quota_utilization": 92,
    "transaction_quality": 81
  },
  "peer_benchmark": {
    "category": "Machinery",
    "tier": "PREMIUM",
    "peer_avg_score": 75,
    "percentile_rank": 72
  },
  "health_assessment_ts": "2026-05-16T14:23:45Z"
}
```

**Health Status Alert**
```json
{
  "seller_id": "SEL-56234",
  "alert_type": "HEALTH_DEGRADATION",
  "severity": "MEDIUM",
  "previous_status": "GOOD",
  "current_status": "AT_RISK",
  "contributing_factors": [
    "Response time degraded 250% (18 hrs vs 4-hr benchmark)",
    "Lead consumption rate dropped 45% week-over-week",
    "Notification engagement dropped from 68% to 28%"
  ],
  "recommended_action": "Operational support consultation",
  "alert_ts": "2026-05-16T14:15:00Z"
}
```

**Seller Cohort Benchmark Report**
```json
{
  "cohort": "PREMIUM_MACHINERY_SELLERS",
  "seller_count": 234,
  "health_distribution": {
    "EXCELLENT": 45,
    "GOOD": 89,
    "AT_RISK": 78,
    "CRITICAL": 22
  },
  "performance_metrics": {
    "avg_catalog_freshness": 82,
    "avg_response_time": 4.2,
    "avg_response_rate": 0.78,
    "avg_engagement_score": 71,
    "avg_quota_utilization": 0.88
  }
}
```

## Predict Business Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Health Monitoring Frequency | Weekly (manual) | Real-time | Continuous visibility |
| Problem Detection Latency | 7-14 days | 2-4 hours | 90% faster |
| Operational Overhead | 20 hrs/week | 2 hrs/week | 90% reduction |
| At-Risk Seller Interventions | 30% miss rate | 95% capture rate | 3x more caught |
| Seller Performance Uplift | — | 15-25% → target threshold | +15-25% |

## Architecture

**Health Dimensions:**
1. **Catalog Freshness** (0-100): Recency of product updates, listing accuracy, category coverage
2. **Response Responsiveness** (0-100): Avg response time, response rate, message latency
3. **Engagement Participation** (0-100): Lead participation, notification engagement, activity frequency
4. **Quota Utilization** (0-100): Leads consumed vs allocated, capacity usage rate
5. **Transaction Quality** (0-100): Order completion rate, refund rate, buyer satisfaction

**Scoring Logic:**
```
Health Score = 
  0.25 * catalog_freshness +
  0.25 * response_responsiveness +
  0.20 * engagement_participation +
  0.15 * quota_utilization +
  0.15 * transaction_quality
```

**Status Mapping:**
- EXCELLENT: 85-100 (top 20% performers)
- GOOD: 70-84 (healthy, on-target)
- AT_RISK: 50-69 (degrading, needs support)
- CRITICAL: <50 (severe issues, immediate intervention)

## Integration Points

**Code References:**
- Health calculation: `ai-services/scoring/seller_health.py`
- Dimension aggregation: `backend/internal/db/postgres.go`
- Real-time updates: `backend/internal/cache/redis.go`
- Alert orchestration: `backend/internal/api/handlers.go`

**Data Flow:**
```
Behavioral Events → Dimension Aggregation → Normalization & Benchmarking 
→ Health Score Calculation → Status Classification → Alert Generation
```

## Validation Rules

- Health scores normalized 0-100 with no gaps >7 days
- Peer cohort selection must match on category AND tier
- Dimension weights must sum to 1.0
- Trend calculation requires minimum 3 consecutive daily measurements
- Alerts generated only on status transitions (avoid noise)

## Success Metrics

✅ Health score prediction accuracy ≥0.85 against seller outcomes
✅ Alert precision >0.80 (80% of alerts correlate with actual issues)
✅ Monitoring latency <5 minutes for score updates
✅ At-risk seller capture rate >95%
✅ Peer benchmark consistency ±5% within cohorts

## Positive Triggers

1. "Which sellers are degrading in performance? I need to understand who needs support."
2. "Create a unified seller health dashboard that shows engagement + response + catalog metrics."
3. "Compare our sellers to benchmarks in their category. Who's underperforming?"

## Negative Triggers

1. "Export seller transaction data for accounting." (static reporting)
2. "Design a new seller profile UI." (product design)

---

