# References Documentation

This directory contains technical reference specifications referenced by the Realtime Seller Intelligence Orchestration Skill.

## engagement_dimensions.md

**Purpose**: Formal definitions of behavioral dimensions used for engagement scoring

**Content Outline**:

### Engagement Dimensions Definition

Each seller is scored across 5 dimensions, normalized to 0-100 scale:

1. **Catalog Freshness** (20% weight)
   - Measures currency and maintenance of seller's product/service catalog
   - Baseline: Catalog update within last 7 days = 100
   - Stale threshold: >90 days without update = 0
   - Calculation: Recency-decay function with 30-day halflife

2. **Response Responsiveness** (30% weight)
   - Measures seller's speed in responding to allocated leads
   - Baseline: Response within 4 hours = 100
   - Poor threshold: >24 hours or no response = 0
   - Calculation: Exponential decay from response time, normalized to peer benchmark

3. **Lead Participation** (25% weight)
   - Measures seller's engagement with allocated leads (acceptance rate)
   - High engagement: >80% lead acceptance = 100
   - Low engagement: <30% lead acceptance = 0
   - Calculation: Rolling 30-day window acceptance rate

4. **Quota Utilization** (15% weight)
   - Measures seller's consumption of monthly lead allocation quota
   - Optimal: 70-90% consumed = 100
   - Underutilization: <40% consumed = 50
   - Overextended: 95%+ used before month-end = 80 (expansion signal)

5. **Notification Engagement** (10% weight)
   - Measures seller's interaction with platform notifications and updates
   - High engagement: >60% open/click rate = 100
   - Low engagement: <20% open/click rate = 0
   - Calculation: 30-day rolling engagement rate

### Composite Engagement Score

```
engagement_score = (
  catalog_freshness * 0.20 +
  response_responsiveness * 0.30 +
  lead_participation * 0.25 +
  quota_utilization * 0.15 +
  notification_engagement * 0.10
)
```

### Engagement Momentum

Direction indicator of composite score change:
- Momentum = (recent_engagement_7d - baseline_engagement_30d) / baseline_engagement_30d
- Positive values: improving engagement (good signal)
- Negative values: declining engagement (churn risk signal)
- Used to identify accelerating trends and inflection points

---

## churn_risk_methodology.md

**Purpose**: Specification of churn prediction calculation methodology

**Content Outline**:

### Churn Risk Score Calculation

Composite score [0-1] representing probability seller will discontinue subscription:

```
churn_risk = (
  engagement_decline_weight * engagement_decline_factor +
  activity_recency_weight * activity_recency_factor +
  revenue_value_weight * revenue_value_factor +
  response_pattern_weight * response_pattern_factor
)
```

### Component Factors

1. **Engagement Decline (40% weight)**
   - Momentum comparison: recent vs. historical baselines
   - Sudden drops (>50% in 48h) = 0.95 factor
   - Persistent decline (>7 days) = 0.75 factor
   - Improving trend = 0.2 factor

2. **Activity Recency (30% weight)**
   - Days since last activity: <7 days = 0.1, >90 days = 0.95
   - Exponential decay function with 30-day halflife

3. **Revenue Value (20% weight)**
   - Lower MRR sellers more sensitive to churn signals
   - Factor ranges: High-value (>$5K MRR) = 0.6 factor, Low-value (<$500 MRR) = 0.9 factor
   - Rationale: High-value sellers have more engagement friction but lower relative risk

4. **Response Pattern (10% weight)**
   - Sudden response latency spike (>4x peer benchmark) = 0.7 factor
   - Persistent no-response pattern = 0.8 factor
   - Strong response history = 0.2 factor

### Confidence Interval

Confidence = 1.0 - (signal_sparsity + data_recency_decay)
- Minimum 0.65 confidence required for P0 escalation
- Confidence 0.50-0.65: route to manual review queue
- Confidence <0.50: suppress automated escalation

### Churn Risk Bands

- **LOW (0.0-0.40)**: No intervention required
- **MEDIUM (0.40-0.60)**: Monitor and prepare recommendations
- **HIGH (0.60-0.80)**: Schedule intervention within 48 hours
- **CRITICAL (0.80-1.0)**: Immediate P0 escalation required

---

## lifecycle_phases.md

**Purpose**: Seller lifecycle state machine and phase transitions

**Content Outline**:

### Lifecycle Phases (6 states)

1. **EMERGING** (New seller <30 days)
   - Characteristics: Limited activity history, plan trial period
   - Typical duration: 7-14 days
   - Transition: → ENGAGED (positive activity signals) or → DORMANT (no activity)

2. **ENGAGED** (Active seller with strong engagement)
   - Characteristics: engagement_score >75, positive momentum, regular activity
   - Typical duration: 60-180 days
   - Transition: → MAINTAINING or → DISENGAGING (activity decline)

3. **MAINTAINING** (Stable activity but plateauing)
   - Characteristics: engagement_score 60-75, stable momentum, regular leads
   - Typical duration: 90-365 days
   - Transition: → ENGAGED (uplift) or → DISENGAGING (decline)

4. **DISENGAGING** (Warning phase - declining activity)
   - Characteristics: engagement_score 40-60, negative momentum, missed leads
   - Typical duration: 7-30 days
   - Transition: → ENGAGED (intervention success) or → AT_RISK (continued decline)

5. **AT_RISK** (High churn probability)
   - Characteristics: engagement_score <40, sustained decline, churn_risk >0.70
   - Typical duration: 3-14 days
   - Transition: → ENGAGED (strong intervention) or → DORMANT (churn confirmed)

6. **DORMANT** (Inactive seller)
   - Characteristics: activity_gap >90 days, engagement_score ~0
   - Typical duration: indefinite until reactivation
   - Transition: → EMERGING (reactivation attempts)

### Phase Transition Triggers

| From | To | Condition | Confidence |
|------|----|-----------|-----------|
| EMERGING | ENGAGED | activity >5 leads AND response_rate >50% | 0.80 |
| ENGAGED | MAINTAINING | engagement_momentum -0.05 to 0 | 0.70 |
| ENGAGED | DISENGAGING | engagement_momentum <-0.15 | 0.80 |
| MAINTAINING | DISENGAGING | engagement_score drop >20 points in 7d | 0.75 |
| DISENGAGING | AT_RISK | engagement_score <40 AND duration >7 days | 0.85 |
| AT_RISK | DORMANT | churn_confirmed OR duration >30 days | 1.00 |
| ANY | EMERGING | account_reactivation_event | 0.95 |

---

## lead_routing_priority.md

**Purpose**: Lead routing eligibility rules and seller ranking algorithm

**Content Outline**:

### Lead Eligibility Constraints

1. **Category Matching**
   - Lead must be in seller's category focus areas
   - Exact match required (no fuzzy matching in scoring phase)
   - Source: seller.category_focus ⊇ lead.category

2. **Geographic Eligibility**
   - Lead geographic region must match seller's service regions
   - Account for multi-region sellers
   - Source: lead.region ∈ seller.service_regions

3. **Subscription Plan Eligibility**
   - Lead category tier must be accessible in seller's plan
   - Example: PREMIUM leads only routable to PROFESSIONAL+ plans
   - Source: plan_tier_access_matrix[seller.plan][lead.tier]

4. **Account Status Eligibility**
   - Active status required (not suspended, not in review)
   - Verified account status required
   - Source: seller.status == ACTIVE AND seller.verified == true

5. **Quota Remaining**
   - Seller must have quota remaining for month
   - Over-quota scenarios handled separately (see overflow logic)
   - Source: seller.current_month_quota_remaining > 0

### Seller Ranking Algorithm

For eligible sellers, compute allocation probability:

```
ranking_score = (
  engagement_score * 0.35 +
  historical_conversion_rate * 0.25 +
  Response_quality_score * 0.20 +
  quota_efficiency_score * 0.15 +
  recency_boost * 0.05
)
```

**Components**:
- Engagement Score: Current seller engagement dimension score (0-100)
- Historical Conversion Rate: Lead acceptance rate from past 30 days
- Response Quality Score: Quality of responses (seller feedback/ratings)
- Quota Efficiency: How productively seller uses quota (revenue per lead accepted)
- Recency Boost: Bonus for sellers with activity in last 24 hours (+5-10 points)

### Allocation Constraints

- **Maximum sellers per lead**: 5 (marketplace policy)
- **Allocation strategy**: Sequential allocation to top-ranked seller
- **Fallback mechanism**: If top seller rejects/ignores, retry with next-ranked seller
- **Lead expiry**: Unclaimed leads eligible for fallback pool after 4 hours

---

## recommendation_logic.md

**Purpose**: ROI-based BuyLead recommendation logic and response timing

**Content Outline**:

### ROI-Based Lead Prioritization

Identifies high-value opportunities for sellers using composite ROI score:

```
roi_score = (normalized_order_value * 0.70) + (recency_decay_factor * 0.30)
```

**Selection Criteria**:
1. **Order Value**: Leads ranked by `order_value_rs` (highest value first)
2. **Recency**: Recent leads prioritized to ensure lead freshness
3. **Top ROI**: Dashboard displays "Top 3 ROI Leads" prominently

### Optimal Response Timing

- **Target**: Respond within 10 minutes of lead allocation
- **Rationale**: Lead conversion probability decreases exponentially after 15 minutes
- **Trigger**: "Best Match" leads explicitly recommend immediate consumption

---

## redis_cache_architecture.md

**Purpose**: Redis cache key structure and consistency guarantees

**Content Outline**:

### Cache Key Schema

```
seller:{seller_id}:engagement_dims → JSON
  {catalog_freshness, response_responsiveness, lead_participation, quota_utilization, notification_engagement}

seller:{seller_id}:churn_score → float [0-1]

seller:{seller_id}:churn_confidence → float [0-1]

seller:{seller_id}:lifecycle_phase → string (EMERGING|ENGAGED|MAINTAINING|DISENGAGING|AT_RISK|DORMANT)

seller:{seller_id}:quota:remaining → integer

seller:{seller_id}:quota:consumed → integer

seller:{seller_id}:last_activity_timestamp → ISO8601

seller:{seller_id}:engagement_momentum → float [-1, 1]

lead:{lead_id}:allocation_lock → seller_id (distributed lock)
  TTL: 5 seconds
```

### Cache Consistency Strategy

**Eventual Consistency Model**:
- Redis cache is authoritative for reads (sub-millisecond latency)
- PostgreSQL is source-of-truth for durability
- Periodic reconciliation: Every 30 seconds, compare Redis state vs. PostgreSQL
- On divergence: Log discrepancy, flag for manual review, cache wins in interim

**Eviction Policy**:
- LRU eviction after 10,000 active sellers cached
- TTL: 1 hour for engagement dimensions, 30 minutes for quota, 5 seconds for allocation locks
- Cold storage: Aged sellers spilled to PostgreSQL for batch optimization

### Cache Invalidation

- **On Event**: Invalidate affected seller cache entries immediately upon event processing
- **Time-based**: Engagement dimensions refreshed every 60 minutes
- **Periodic**: Full cache refresh daily during off-peak hours (3 AM UTC)
- **Manual**: Operations team can force refresh for specific sellers or all sellers

---

## websocket_gateway_spec.md

**Purpose**: Real-time message format specifications for dashboard updates

**Content Outline**:

### Message Format

```json
{
  "type": "seller_intelligence_update",
  "timestamp": "2026-05-16T14:25:45Z",
  "seller_id": "SEL-89234",
  "payload": {
    "churn_risk_score": 0.78,
    "churn_risk_band": "HIGH",
    "engagement_score": 42,
    "lifecycle_phase": "DISENGAGING",
    "recent_activities": [
      {"timestamp": "2026-05-16T12:00:00Z", "type": "lead_view", "outcome": "ignored"}
    ]
  }
}
```

### Message Types

1. **seller_intelligence_update**: Churn score or engagement changes
2. **churn_alert**: P0/P1 churn alerts for operations team
3. **lead_allocation**: Lead routing decision (seller assignment)
4. **intervention_queue_update**: New interventions added to priority queue
5. **dashboard_metrics_update**: KPI summary updates

### Publishing Frequency

- Churn score updates: When score changes >0.05 or confidence ≥0.70
- Engagement updates: Every 5 minutes for active sellers
- Churn alerts: Immediate upon P0 escalation
- Lead allocation: Immediate upon routing decision
- Dashboard metrics: Every 5 minutes

### WebSocket Connection Management

- Connection pooling: Max 1000 concurrent connections per gateway instance
- Heartbeat: Every 30 seconds (client-server ping/pong)
- Reconnection backoff: Exponential backoff 1s, 2s, 4s, 8s, 16s max
- Message buffering: 100-message buffer per connection during intermittent connectivity

---

## intervention_procedures.md

**Purpose**: Step-by-step account manager playbooks for seller interventions

**Content Outline**:

### P0 Intervention Playbook (Urgent Retention)

**Condition**: Churn risk > 0.80 AND seller MRR > $2000

**Steps**:
1. Review seller churn risk drivers (engagement breakdown, activity patterns)
2. Place phone call within 2 hours (P0 SLA)
3. Show empathy: "We noticed you haven't been as active lately, and you're a valued partner"
4. Primary messaging angle: [From recommendation system - e.g., "quota support", "lead quality", "business challenges"]
5. Offer specific intervention: Plan upgrade, operations support call, dedicated success manager
6. Get commitment: Schedule follow-up or action item
7. Log outcome in CRM: resolution type, seller response, next steps
8. Set reminder: 72-hour follow-up check-in

**Target Success**: 65% of P0 interventions result in renewed engagement

---

## data_validation_rules.md

**Purpose**: Input data validation and error handling specifications

**Content Outline**:

### Seller Master Data Validation

- Seller ID must be valid UUID format, non-empty
- Plan tier must exist in active subscription plan configuration
- Geographic region must be in approved marketplace regions list
- Revenue fields must be non-negative numeric values
- Account status must be one of: ACTIVE, SUSPENDED, TRIAL, CANCELLED

### Event Stream Validation

- Timestamp must be within ±90 days of current time
- Seller ID must exist in seller master records
- Event type must be one of: LOGIN, LOGOUT, CATALOG_UPDATE, LEAD_VIEW, LEAD_RESPONSE, NOTIFICATION_INTERACTION, MESSAGE_RESPONSE
- All required fields must be present (optional fields: any or none)
- No duplicate events (fingerprint: seller_id + event_type + timestamp_bucket + action_hash)

### Behavioral Signal Quality

- Engagement scores must be normalized 0-100 with no missing value gaps >14 days
- Response rates must be percentages between 0-100
- Timestamps must be chronologically consistent (no time-travel events)

---

## latency_slas.md

**Purpose**: Performance target specifications for all major operations

**Content Outline**:

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Churn score prediction | 50ms | 200ms | 500ms |
| Lead allocation decision | 100ms | 500ms | 1000ms |
| Engagement dimension update | 10ms | 100ms | 250ms |
| Recommendation generation | 200ms | 800ms | 2000ms |
| WebSocket message delivery | 20ms | 100ms | 500ms |
| PostgreSQL query | 50ms | 300ms | 1000ms |

### Error Rate Targets

- Lead allocation success rate: >99.5% (no double-allocations)
- Churn prediction confidence >0.65: >95%
- Model accuracy (AUC): >0.78
- Recommendation acceptance rate: >35%

### Throughput Targets

- Event processing: 10,000 events/second sustained
- Lead allocations: 500/second sustained
- Dashboard updates: Delivered to 1000+ concurrent users within 5 seconds

---

## seller_segmentation.md

**Purpose**: Seller segment definitions for differentiated analysis and strategies

**Content Outline**:

### Segmentation Dimensions

1. **By Plan Tier**
   - STARTER: <$500 MRR, limited lead quota
   - PROFESSIONAL: $500-$2000 MRR, standard lead quota
   - ENTERPRISE: >$2000 MRR, priority lead routing
   - Custom: Negotiated terms (treat as ENTERPRISE)

2. **By Geographic Region**
   - NORTH_AMERICA, EUROPE, ASIA_PACIFIC, LATIN_AMERICA
   - Affects lead eligibility, benchmarks, and messaging

3. **By Business Activity Level**
   - HIGH_ACTIVITY: >80% lead consumption, high response rate
   - MODERATE_ACTIVITY: 50-80% consumption
   - LOW_ACTIVITY: <50% consumption or dormant

4. **By Tenure**
   - NEW: <90 days on platform
   - ESTABLISHED: 90 days - 2 years
   - VETERAN: >2 years with consistent engagement

### Churn Risk Baselines by Segment

| Segment | 30-day Churn | 90-day Churn |
|---------|--------------|--------------|
| STARTER, NEW | 12% | 25% |
| PROFESSIONAL, ESTABLISHED | 4% | 8% |
| ENTERPRISE, VETERAN | 2% | 4% |

---

**Note**: Each reference file expands on topics mentioned in [SKILL.md](../SKILL.md). Keep content synchronized with deployed system state.
