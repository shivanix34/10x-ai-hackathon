---
skill_id: realtime-seller-intelligence-orchestration
skill_name: Realtime Seller Intelligence Orchestration
version: 1.0.0
category: business-intelligence
subcategory: marketplace-operations
runtime_compatibility: claude-opus, claude-sonnet, openai-codex, vscode-agents
complexity_level: enterprise
last_updated: 2026-05-16
tags: [seller-intelligence, churn-prediction, behavioral-analytics, marketplace-operations, realtime-orchestration, seller-lifecycle, revenue-intelligence]
---

# Realtime Seller Intelligence Orchestration Skill

## Activation Description

**Use this skill when you need to:**

- Process login, catalog update, and lead response streams to identify disengagement patterns
- Map real-time events to EMERGING, ENGAGED, or AT_RISK lifecycle states across 5 behavioral dimensions
- Prioritize account manager outreach by calculating revenue-at-risk and engagement momentum
- Generate specific AI Coach advice (BuyLead ROI, 10-minute response timing) from signal streams
- Quantify subscription value at risk using plan tier and churn probability modeling
- Build live dashboards using WebSockets for real-time seller monitoring
- Aggregate fragmented RabbitMQ events into unified behavior states in Redis
- Automate seller retention workflows by triggering P0 alerts for high-risk accounts

**Key triggering terms:**

`seller churn` | `seller engagement` | `behavioral analytics` | `seller prioritization` | `churn risk` | `seller retention` | `behavioral signals` | `seller lifecycle` | `intervention prioritization` | `revenue-at-risk` | `seller health` | `seller growth`

**Expected output formats:**

- Structured seller intelligence assessments with churn risk scores and confidence intervals
- Prioritized intervention queues with recommendation reasoning
- Behavioral anomaly alerts with engagement trend analysis
- Revenue-at-risk quantification with scenario forecasting
- Adaptive recommendation sets with seller engagement context
- Operational dashboards with seller lifecycle state machines and activity streams

---

## Problem Statement & Context

### The Business Challenge

Large-scale B2B marketplace ecosystems generate millions of monthly behavioral events—seller catalog updates, BuyLead interactions, response patterns, subscription usage, notification engagement, and marketplace participation signals—across thousands of active sellers spanning multiple geographic regions and product categories. However, **operational teams currently lack a unified, realtime intelligence layer that transforms these fragmented behavioral signals into actionable seller lifecycle intelligence**.

Current state challenges:

- **Fragmented visibility**: Seller engagement data exists in isolated systems (transactional databases, event streams, activity logs) without unified behavioral intelligence orchestration
- **Manual analysis overhead**: Identifying at-risk sellers, prioritizing interventions, and estimating revenue impact requires manual correlation across multiple dashboards and data sources
- **Delayed decision-making**: Churn signals emerge gradually; teams discover disengagement only after significant activity drop, missing critical intervention windows
- **Lost growth visibility**: Upsell and expansion opportunities remain invisible within siloed operational metrics
- **Scaling constraints**: Current manual processes don't scale with seller ecosystem growth or increase in marketplace participation complexity
- **Revenue leakage**: Silent seller churn and disengagement result in revenue erosion without predictive warning systems

### Why This Problem Matters

Seller retention directly impacts marketplace revenue, ecosystem health, and operational efficiency:

- **Revenue Protection**: Every seller provides subscription-based revenue. We identify disengagement within 4 hours using behavioral signals to enable retention calls before the 30-day renewal window.
- **Operational Efficiency**: By automating the correlation of login, response, and catalog events, we reduce Sales team manual analysis from 160 hours to 40 hours per month.
- **Seller Experience**: AI Coach provides specific, data-backed advice (e.g., "Increase your 42% catalog score") to increase marketplace participation.
- **Growth Acceleration**: Identifying high-potential sellers through engagement momentum allows for targeted upsell campaigns with +40% higher conversion probability.
- **Marketplace Health**: Proactive seller lifecycle management stabilizes ecosystem participation, reduces subscription churn rates, and improves community health metrics
- **Competitive Advantage**: Realtime intelligence on seller behavior and market trends enables faster strategic responses than competitors using manual analysis workflows

### Scale of Impact

- **Seller Population**: Thousands of active subscribed sellers generating behavioral signals continuously
- **Event Volume**: Millions of behavioral events monthly (lead interactions, responses, catalog updates, engagement signals)
- **Revenue at Stake**: Significant subscription revenue portfolio at risk from seller churn and disengagement
- **Analysis Frequency**: Intervention decisions required in realtime (sub-minute latency for churn alerts)
- **Geographic Scope**: Multi-region marketplace with regional seller segmentation and localized engagement patterns
- **Operational Complexity**: Complex business rules around subscription tiers, lead eligibility, geographic categories, and seller performance requirements

---

## Predicted Business Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| **Churn Detection Latency** | 14-21 days (manual analysis) | 2-4 hours (realtime alerts) | 70% faster intervention response |
| **Seller Retention Rate** | 82% YoY | 89% YoY | +7% retention lift from proactive intervention |
| **Manual Analysis Effort** | 160 hrs/month (10 FTE) | 40 hrs/month (2.5 FTE) | 75% reduction in operational overhead |

| **Revenue-at-Risk Visibility** | Manual forecasting | Realtime quantification | 100% coverage of at-risk revenue |
| **Intervention ROI** | 1.8x payback | 3.2x payback | +78% uplift in retention intervention ROI |
| **Seller Growth Acceleration** | Manual opportunity ID | Realtime recommendations | 40% faster upsell identification |
| **Operational Scalability** | Linear effort growth | Logarithmic effort growth | 10x scaling with minimal additional staffing |

---

## Inputs

### Primary Data Sources

**Seller Master Profile Data**
- Seller ID, company name, geographic region, category focus
- Subscription plan tier, plan start date, plan duration
- Business type, transaction history, quality ratings
- Account creation date, payment status, compliance tier

**Behavioral Event Streams** (realtime)
- Seller login/logout activity with timestamps
- Catalog catalog updates (quantity, quality, refresh frequency)
- Seller engagement events and activity interactions
- Response time measurements and response quality ratings
- Notification interaction events (opened, clicked, ignored)
- Message/inquiry response patterns and latency
- Subscription renewal/cancellation events


**Subscription Plan Configuration**
- Plan tier definitions with feature eligibility
- Feature eligibility matrices per plan tier
- Revenue per plan and MRR calculations
- Renewal probabilities and churn baselines by plan tier

**Engagement Metrics**
- Historical response rates by seller segment
- Activity frequency patterns (daily, weekly, seasonal trends)
- Engagement momentum (increasing/decreasing trends over time)

### Data Quality Requirements

- Behavioral events must include precise timestamps with timezone resolution
- Seller IDs must be consistently formatted and validated against master records

- Missing values should be tracked and handled with fallback intelligence primitives
- Duplicate event detection protocol must be implementable for replay safety

---

## Outputs

### Primary Intelligence Deliverables

**Seller Churn Risk Assessments**
```json
{
  "seller_id": "SEL-89234",
  "churn_risk_score": 0.78,
  "confidence": 0.91,
  "risk_band": "HIGH",
  "primary_drivers": [
    {"signal": "engagement_decline", "severity": "high", "trend_window": "7d"},

    {"signal": "response_latency_spike", "severity": "medium", "recent_avg_hours": 18}
  ],
  "revenue_at_risk": 4200,
  "estimated_churn_probability": {
    "30_day": 0.34,
    "60_day": 0.52,
    "90_day": 0.64
  },
  "intervention_window_urgency": "CRITICAL",
  "assessment_timestamp": "2026-05-16T14:23:45Z"
}
```

**Seller Lifecycle Intelligence State**
```json
{
  "seller_id": "SEL-89234",
  "lifecycle_phase": "DISENGAGING",
  "activity_trend": "DECLINING",
  "engagement_dimension_scores": {
    "catalog_freshness": 0.34,

    "response_responsiveness": 0.52,
    "notification_engagement": 0.28,

  },
  "engagement_momentum": -0.15,
  "days_since_last_activity": 6,

}
```

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
      "confidence": 0.87
    },
    {
      "type": "product_recommendation",
      "priority": "P1",

      "projected_q2_revenue_lift": 1200,
      "confidence": 0.72
    },
    {
      "type": "roi_optimization",
      "priority": "P0",
      "suggested_action": "respond_to_high_roi_lead",
      "best_lead_id": "LEAD-44521",
      "lead_value": 12500,
      "optimal_response_window_mins": 10,
      "messaging_angle": "high_conversion_opportunity",
      "confidence": 0.94
    },
    {
      "type": "operational_optimization",
      "priority": "P2",
      "suggested_action": "lead_response_workflow_review",
      "recent_response_latency_hours": 18,
      "benchmark_latency_hours": 4,
      "confidence": 0.68
    }
  ],
  "multi_channel_engagement_sequence": [
    {"channel": "in_app_notification", "timing": "immediate"},
    {"channel": "email", "timing": "6_hours"},
    {"channel": "phone_outreach", "timing": "24_hours"}
  ]
}
```

**Behavioral Anomaly Alerts**
```json
{
  "seller_id": "SEL-56234",
  "anomaly_type": "sudden_engagement_drop",
  "severity": "HIGH",
  "baseline_daily_activity": 12.4,
  "current_daily_activity": 1.2,
  "drop_percentage": 90.3,
  "anomaly_window": "48_hours",
  "potential_causes": [
    "catalog_sync_failure",
    "account_access_issue",
    "marketplace_feature_regression",
    "seller_deliberate_pause"
  ],
  "recommended_investigation_priority": "IMMEDIATE",
  "investigation_checklist": [
    "verify_account_access_status",
    "check_recent_catalog_updates",
    "review_error_logs_for_api_failures",
    "contact_seller_for_status_confirmation"
  ]
}
```

**Intervention Priority Queue**
```json
{
  "queue_timestamp": "2026-05-16T14:25:00Z",
  "priority_tier_p0": [
    {
      "seller_id": "SEL-89234",
      "intervention_type": "URGENT_RETENTION",
      "priority_score": 0.94,
      "revenue_at_risk": 4200,
      "intervention_duration_minutes": 15,
      "suggested_owner": "account_manager_region_north_america"
    }
  ],
  "priority_tier_p1": [
    {
      "seller_id": "SEL-45678",
      "intervention_type": "PROACTIVE_ENGAGEMENT",
      "priority_score": 0.71,
      "revenue_at_risk": 1800,
      "intervention_duration_minutes": 30,
      "suggested_owner": "customer_success_team"
    }
  ],
  "priority_tier_p2": [],
  "queue_total_revenue_at_risk": 5800
}
```

**Dashboard Intelligence Feed**
- Real-time seller activity streams with behavioral context
- Operational KPI summaries (retention rate, average response time)
- Geographic heat maps of seller engagement and churn concentration
- Time-series activity trend graphs with anomaly highlighting
- Revenue-at-risk rolling forecasts with scenario modeling
- Sales team workload balancing and intervention capacity utilization

---

## Core Operational Workflow

### Phase 1: Behavioral Signal Ingestion & Normalization

1. **Event Stream Consumption**
   - Consume seller activity events from RabbitMQ event broker in real-time
   - Parse and validate event schema compliance (timestamp, seller_id, event_type, metadata)
   - Deduplicate events using event ID and timestamp fingerprinting (prevent replay amplification)
   - Handle out-of-order events using event time windowing and state reconciliation

2. **Behavioral Signal Enrichment**
   - Join event streams with seller master profile data for context (plan tier, geographic region, category focus)
   - Enrich events with subscription plan configuration (feature eligibility, revenue)
   - Cross-reference event data with seller context metadata
   - Aggregate raw events into behavioral dimensions (catalog_freshness, response_latency, engagement_momentum, etc.)

3. **State Management & Persistence**
   - Maintain realtime seller behavioral state in Redis with sub-second latency
   - Persist aggregated behavioral snapshots to PostgreSQL for historical analysis
   - Implement state versioning and temporal queries for trend analysis
   - Establish cache invalidation strategies based on activity recency and confidence decay

### Phase 2: Behavioral Intelligence Generation

4. **Engagement Dimension Scoring**
   - Calculate engagement metrics across multiple dimensions (catalog freshness, response responsiveness, message engagement, notification engagement)
   - Apply historical baseline comparisons to identify deviation patterns
   - Weight dimension scores using engagement momentum (trend direction and velocity)
   - Produce normalized engagement scores (0-100) with temporal aggregation windows (1d, 7d, 30d)

5. **Churn Risk Prediction**
   - Evaluates composite behavioral signal patterns against historical churn baselines
   - Applies adaptive scoring incorporating lifecycle phase, subscription value, engagement trends, and activity recency
   - Generates churn risk score (0-1) with directional confidence intervals
   - Stratifies sellers into risk bands (LOW, MEDIUM, HIGH, CRITICAL) with intervention urgency levels
   - Produces revenue-at-risk quantification aligned to plan tier and MRR calculations

6. **Lifecycle Phase Classification**
   - Maps engagement dimensions to lifecycle states: EMERGING, ENGAGED, MAINTAINING, DISENGAGING, AT_RISK, DORMANT
   - Implements state machine with transition probability scoring
   - Detects phase changes with confirmation windows to avoid false-positive oscillation
   - Produces lifecycle trajectory forecasts with 30/60/90-day phase probabilities

### Phase 3: Adaptive Recommendation Generation

7. **Behavior-Driven Recommendation Synthesis**
   - Analyzes seller engagement gaps relative to peer benchmarks within same subscription tier
   - Identifies specific operational bottlenecks (e.g., response latency, catalog staleness, quota exhaustion)
   - Prioritizes BuyLeads by potential ROI (Order Value × Recency) and identifies the "Best Match" for immediate consumption
   - Generates multi-channel engagement sequences (in-app notification → email → phone) with timing optimization
   - Produces product/plan recommendations aligned to seller growth trajectory and expansion signals
   - Calculates recommendation confidence based on behavioral signal quality and peer group alignment

8. **Contextual Recommendation Adaptation**
   - Personalizes recommendations based on seller communication preferences and historical response patterns
   - Applies geographic and category-specific optimization (local market dynamics, seasonal patterns)
   - Incorporates recent seller actions and stated preferences (plan changes, category focus shifts)
   - Recommends 10-minute response window for high-ROI leads to maximize conversion probability
   - Produces recommendation sequences with ranked priority and estimated engagement probability

### Phase 4: Intervention Orchestration & Escalation

13. **Intervention Prioritization & Queue Management**
    - Stratifies sellers into intervention priority tiers based on churn risk, revenue impact, and intervention urgency
    - Calculates estimated intervention duration and staffing requirements
    - Produces recommended intervention type (retention call, plan upgrade consultation, operational support, product training)
    - Generates workload balancing recommendations for account management team distribution
    - Implements queue SLA tracking and escalation rules

14. **Multi-Channel Engagement Sequencing**
    - Generates optimal timing for multi-channel outreach (in-app notification, email, phone, direct message)
    - Calibrates channel mix based on seller communication preference history
    - Implements engagement frequency capping (avoid over-contact and fatigue)
    - Produces engagement sequence with response probability forecasting per channel
    - Tracks engagement outcomes and adapts sequences based on actual seller responses

### Phase 5: Operational Intelligence Publishing

15. **Dashboard Intelligence Feed Generation**
    - Produces real-time seller activity streams with behavioral context and anomaly highlighting
    - Generates operational KPI summaries updated every 5 minutes
    - Publishes geographic heat maps of seller engagement and churn concentration
    - 
    - Publishes revenue-at-risk rolling forecasts updated hourly with scenario modeling capabilities

16. **Alert & Notification Orchestration**
    - Generates behavioral anomaly alerts (sudden engagement drops, quota exhaustion, response latency spikes)
    - Produces churn risk escalation alerts for P0 sellers approaching critical risk thresholds
    - Implements smart notification routing (notify appropriate team based on alert type and seller segment)
    - Publishes alerts via WebSocket gateway for real-time dashboard updates
    - Implements alert deduplication and thresholding to reduce notification noise

---

## Validation Rules & Smart Execution

### Data Validation

1. **Input Data Integrity**
   - All seller IDs must exist in authenticated master record
   - Event timestamps must fall within valid historical range (within 90 days of current time or future-dated within 24 hours for scheduled events)
   - BuyLead IDs must be present in active lead inventory
   - Category mappings must be bidirectionally consistent
   - Subscription plan metadata must align with seller's current active plan
   - No duplicate events within 1-second rollback window

2. **Behavioral Signal Quality**
   - Engagement scores must be normalized between 0-100 with no missing value gaps >14 days
   - Churn risk confidence must exceed 0.65 threshold before generating P0 interventions
   - Revenue-at-risk calculations must reconcile to subscription plan MRR ±5% tolerance
   - Lifecycle phase transitions must have directional momentum confirmation

### Business Logic Validation

1. **Seller Engagement Rules**
   - Sellers with >90 days inactivity must be classified DORMANT regardless of other signals
   - Sellers approaching quota exhaustion (>95% consumed) must trigger expansion recommendation
   - Response latency >4x peer benchmark triggers operational support recommendation
   - Sudden engagement drops >50% within 48 hours trigger behavioral anomaly investigation

2. **Revenue Impact Logic**
   - Revenue-at-risk calculated as: (seller_mrr × churn_probability_30d × intervention_success_rate)
   - Plans in free trial period excluded from churn calculations (no revenue baseline)
   - Annual plans use prorated MRR for revenue calculations
   - Revenue-at-risk must aggregate to seller portfolio total with ±10% tolerance

3. **Recommendation Prioritization**
   - P0 interventions only for sellers with >$2000 MRR AND churn_risk_score >0.80
   - P1 interventions for sellers triggering multiple engagement declines simultaneously
   - P2 interventions for optimization recommendations without immediate churn risk

### Quality Gates

- Churn risk predictions must be backtested against 30-day historical churn outcomes with minimum 0.78 AUC

- Engagement dimension scores must reconcile to peer group distributions (Z-score within ±3.0)
- Recommendation acceptance rate must exceed 35% threshold to maintain relevance

---

## Edge Cases & Robustness Handling

### Handling Common Failure Modes

**Scenario: Seller Inactivity Spike During Infrastructure Outage**

*Problem*: Marketplace experiences API degradation; sellers unable to access leads/catalog. Intelligence system incorrectly detects engagement drop and triggers churn alerts.

*Resolution*:
- Implement correlated anomaly grouping: if >30% of sellers show identical engagement drop pattern, suppress isolated churn classifications
- Check marketplace status board and infrastructure incident logs before escalating churn alerts
- Apply confidence decay multiplier (0.6x) to churn scores during identified infrastructure incidents
- Implement 24-hour backoff before generating P0 interventions post-outage recovery
- Tag affected sellers for manual review and bypass automated operations during recovery period

**Scenario: Duplicate Event Ingestion from Message Queue**

*Problem*: RabbitMQ redeliveries or event replay cause same seller action to be recorded multiple times, inflating engagement metrics and distorting behavioral signals.

*Resolution*:
- Implement event deduplication using (seller_id + event_type + timestamp_bucket + action_hash) fingerprinting
- Use Redis SET with 24-hour TTL to track processed event fingerprints
- Log all deduplication hits for audit trail and analytics
- Implement idempotent state updates (use MAX for counts, LAST for timestamps) to minimize replay impact
- Daily reconciliation between event ingestion count and state updates to identify anomalies

**Scenario: Delayed WebSocket Synchronization Between Frontend & Backend**

*Problem*: Dashboard displays stale seller intelligence; frontend not synchronized with latest backend state changes. Operational users make decisions based on outdated information.

*Resolution*:
- Implement heartbeat messages every 5 seconds with state version numbers
- Frontend detects version mismatch and forces refresh
- Implement confirmation workflow: operations confirmed through REST API with updated state validation
- Add timestamp metadata to all dashboard displays showing data freshness
- Implement subscriber invalidation protocol: backend publishes state change timestamps, frontend invalidates older data

**Scenario: Missing or Sparse Behavioral Data for New Sellers**

*Problem*: Recently onboarded sellers have insufficient historical activity for reliable churn prediction or engagement scoring. Intelligence system lacks confidence in recommendations.

*Resolution*:
- Implement conditional scoring paths for sellers with <7 days activity
- Use plan tier cohort benchmarks as baseline when individual history insufficient
- Explicitly flag recommendations as "based on plan tier benchmarks" when seller-specific confidence <0.70
- Apply confidence decay multiplier (0.5x) to churn scores for sellers with <14 days activity
- Implement progressive scoring: increase weighting on seller-specific signals as history accumulates
- Provide human-reviewed recommendations for P0 interventions on sellers with sparse history

**Scenario: Low-Confidence Churn Predictions**

*Problem*: Behavioral signal quality is poor (sparse history, contradictory signals, anomalous metrics). Churn risk confidence is 0.52, below actionable threshold. P1 intervention recommended but confidence is borderline.

*Resolution*:
- Suppress automatic P0/P1 escalation if confidence <0.70; route to manual review queue instead
- Recommend "request seller status update" as primary intervention for low-confidence cases
- Implement hierarchical confidence gates: require 0.80+ confidence for automated interventions, 0.65+ for recommendations
- Apply confidence decay multiplier based on signal quality: (0.7x) for sellers with anomalous engagement patterns
- Implement confidence improvement path: flag sellers for targeted data collection (survey, direct contact) to increase signal quality

---

## Error Handling & Recovery Strategies

### Graceful Degradation

1. **Churn Prediction Unavailable**
   - Fall back to simple engagement metric thresholds (activity >7 days old = monitoring required)
   - Use plan tier historical churn rates as baseline probability
   - Flag recommendations as "based on plan tier benchmarks" instead of seller-specific signals

3. **Event Processing Failures**
   - Implement dead letter queue for events with parsing errors
   - Log error context (event schema, seller_id, timestamp) and flag for manual investigation
   - Continue processing subsequent events (don't block pipeline on single failures)
   - Implement batch replay: reprocess dead letter queue events on daily schedule with improved error handling

4. **Dashboard Data Unavailability**
   - Show "last updated" timestamp and explanatory message if data stale >5 minutes
   - Render cached data with reduced opacity/strikethrough to indicate staleness
   - Show error banner: "Real-time data unavailable: showing cached data from [timestamp]"
   - Automatically retry failed data fetch every 30 seconds with exponential backoff

### Recovery Procedures

| Failure | Detection | Recovery | Priority |
|---------|-----------|----------|----------|
| Redis connection loss | Connection timeout on SET/GET | Failover to PostgreSQL read-only mode; disable realtime lookups | P0 |
| RabbitMQ message queue backlog | Queue depth >10,000 messages | Reduce dashboard update frequency; increase consumer parallelism | P1 |
| PostgreSQL query timeout | Query execution >3s | Implement query timeout at 2s; apply result caching; reduce query complexity | P1 |
| WebSocket hub memory leak | Hub memory >4GB | Restart gateway; implement connection pooling limits; force client reconnect | P1 |

| Churn model data quality degradation | Model prediction confidence <0.50 for >20% sellers | Revert to previous model version; retrain with recent data; implement confidence gates | P2 |

---

## Best Practices & Operational Guidance

### Activation Best Practices

1. **Trigger Selectivity**
   - Use skill when decision involves seller behavior analysis or marketplace logistics
   - DO NOT invoke skill for reports that don't require realtime behavioral intelligence
   - DO invoke for: churn risk, intervention prioritization, seller engagement analysis
   - DO NOT invoke for: static reporting, compliance audits, accounting reconciliation

2. **Context Enrichment**
   - Always provide seller master context (plan tier, geographic region, category focus) to enable weighted analysis
   - Include subscription revenue context for priority weighting

   - Include recent behavioral snapshots (<24 hours) for timely recommendations

3. **Output Consumption**
   - Churn risk scores should be consumed by automated alerting systems and intervention orchestration
   - Recommendations should be reviewed by account managers before execution (except urgent retention interventions)

   - Dashboard intelligence feeds should update frontend displays with sub-5-second latency

### Operational Integration

1. **Sales Team Workflows**
   - Account managers should review daily intervention queue (P0 + P1 sellers) first thing in morning
   - Intervention outcomes (seller response, plan changes, engagement improvements) should be logged back to system for model feedback
   - Recommendations from skill should inform conversation strategy and talking points
   - Escalation paths defined: P0 interventions within 2 hours, P1 interventions within 24 hours

2. **Marketplace Operations**

   - Daily reconciliation: compare allocated leads vs. consumed leads to identify anomalies

3. **Executive Intelligence**
   - Revenue-at-risk metrics should be updated daily and included in executive dashboards
   - Seller retention trends should be tracked as leading indicator of marketplace health
   - Churn prediction accuracy should be backtested monthly against actual churn outcomes
   - Skill performance metrics should be published: intervention success rate, prediction accuracy

### Scalability & Performance Considerations

**Optimization for Scale**

- **Time Complexity**: Churn prediction calculation should be O(1) per seller using pre-aggregated dimensions
- **Space Complexity**: Maintain Redis cache with LRU eviction after 10,000 sellers; aged sellers spilled to cold PostgreSQL
- **Latency**: Churn prediction and engagement scoring must complete within 200ms p95 latency; use cached scores for <10ms lookups
- **Throughput**: System should handle 10,000 events/second; scale RabbitMQ partitioning and PostgreSQL sharding with seller_id

**Scaling Pathways**

- **Horizontal Redis**: Use Redis Cluster for geo-distributed caching across regions
- **PostgreSQL Partitioning**: Vertical partition behavioral events by seller_id for parallel query execution
- **Stream Processing**: Migrate from batch aggregation to Kafka streams for real-time sliding-window metrics
- **Cache Warming**: Pre-load active seller engagement scores into Redis daily to eliminate cold-start latency
- **Compute Offloading**: Move churn prediction calculation to dedicated ML inference service if volume exceeds 1M sellers

---

## Reusability & Extension Architecture

### Generic Reusability Beyond This Project

This skill is architected as a **reusable realtime behavioral intelligence framework** that extends beyond seller intelligence to support multiple marketplace operational workflows:

**Extensible to Customer Lifecycle Intelligence**
- Replace "seller" with "customer"; same behavioral dimensions apply (engagement, response patterns, usage trends)
- Churn prediction logic transfers directly: engagement decline + value + time-to-intervention window

- Intervention orchestration framework reusable for customer retention and growth acceleration

**Extensible to Marketplace Fraud Monitoring**
- Behavioral anomaly detection applies to fraud pattern identification (sudden quota spikes, geographic anomalies, atypical response timing)
- Engagement signals reveal suspicious behavior (automated bot activity vs. human engagement patterns)
- Recommendation generation becomes "fraud investigation" + "corrective action" orchestration
- Framework's distributed locking and state management applies to fraud case management workflows

**Extensible to Seller Quality Scoring**
- Engagement dimensions become quality dimensions (catalog accuracy, response quality, customer satisfaction)
- Churn prediction framework becomes quality assessment framework
- Behavioral signals transform into quality signals (update frequency, error rates, exception responses)
- Recommendation generation becomes "quality improvement" suggestions with vendor-specific guidance

**Extensible to Operational SLA Monitoring**
- Behavioral signals become operational metrics (system availability, API response times, error rates)
- Churn prediction becomes "SLA breach prediction" and alert orchestration
- Recommendation generation becomes "remediation action" suggestions with priority and escalation paths
- Intervention orchestration transfers directly to incident management workflows

**Extensible to Support Ticket Prioritization**
- Seller engagement patterns become customer sentiment signals
- Churn prediction becomes "ticket urgency" scoring using customer satisfaction + business value + time-sensitivity

- Behavioral anomalies become "escalation triggers" for high-impact customer issues

**Extensible to Adaptive Recommendation Systems**
- Behavioral signal evaluation framework reusable for any personalized recommendation engine
- Engagement scoring pattern transfers to preference affinity scoring
- Multi-channel orchestration logic applies to omnichannel recommendation delivery
- Confidence-based recommendation ranking applies across product, content, service recommendations

**Extensible to Dynamic Workflow Orchestration**
- State machine pattern (engagement dimension scoring → phase classification → action triggering) applies across operational workflows
- Behavioral signal evaluation framework suitable for conditional workflow path selection
- Priority queue orchestration logic applies to task scheduling across any operation
- Recovery and resilience patterns transfer to workflow resilience requirements

### Extension Implementation Patterns

1. **Behavioral Signal Swap Pattern**
   ```
   Original: seller_login_activity, catalog_updates, lead_response_latency
   Extended: customer_login_activity, product_views, support_ticket_response_latency
   ```
   Implementation: Change event stream source and dimension calculations; preserve aggregation logic and confidence scoring

2. **Business Context Substitution Pattern**
   ```
   Original: subscription_plan_tier, seller_revenue
   Extended: customer_tier, issue_ticket_assignment_capacity, customer_ltv
   ```
   Implementation: Update context enrichment; preserve prioritization and scoring logic

3. **Action Recommendation Substitution**
   ```
   Original: retention_outreach, plan_upgrade, operational_support
   Extended: fraud_investigation, quality_remediation, sla_escalation
   ```
   Implementation: Replace recommendation generation logic; preserve multi-channel sequencing and timing optimization

### Design Principles for Extensibility

1. **Separation of Concerns**: Behavioral signal evaluation deliberately separated from action orchestration to enable independent reuse
2. **Composable Dimensions**: Engagement dimensions (activity, responsiveness, quality, utilization) compose into any behavioral scoring system
3. **Configurable Context**: Business context (revenue, value, tier) injected as parameters rather than hardcoded to enable context swapping
4. **Generic State Machine**: Lifecycle phase classification uses generic state transitions suitable for any entity lifecycle
5. **Reusable Orchestration**: Queue prioritization, multi-channel sequencing, and recovery patterns are domain-agnostic primitives

---

## References & Technical Dependencies

### Core Architecture References

**API & Integration References**
- [Backend GraphQL API Schema](../references/backend_graphql_schema.md) - Query definitions for seller data, engagement metrics, subscription plans
- [RabbitMQ Event Schema Catalog](../references/rabbitmq_event_schemas.md) - Formal event definitions for all behavioral signals

- [PostgreSQL Data Model](../references/postgres_schema.md) - Complete seller master, behavioral events, and transaction tables

**Behavioral Intelligence References**
- [Engagement Dimension Definitions](../references/engagement_dimensions.md) - Formal definitions of catalog_freshness, response_latency, quota_utilization, etc.
- [Churn Risk Calculation Methodology](../references/churn_risk_methodology.md) - Behavioral signal weighting, confidence intervals, and score interpretation
- [Seller Lifecycle Phases](../references/lifecycle_phases.md) - State machine definitions, phase transition criteria, and indicator signals


**Infrastructure & Deployment**
- [Redis Cache Architecture](../references/redis_cache_architecture.md) - Cache key structure, expiry policies, and consistency guarantees
- [WebSocket Gateway Specification](../references/websocket_gateway_spec.md) - Message format definitions and real-time update choreography
- [RabbitMQ Consumer Configuration](../references/rabbitmq_consumer_config.md) - Partition strategy, batch sizing, and failure retry policies

### Operational Documentation

**Integration Workflows**

- [Account Manager Intervention Procedures](../references/intervention_procedures.md) - Step-by-step guides for executing recommended interventions
- [Marketplace Operations Dashboard Setup](../references/dashboard_setup_guide.md) - Dashboard configuration and real-time data streaming setup

**Data Quality & Validation**
- [Data Validation Rules](../references/data_validation_rules.md) - Seller ID validation, event schema compliance, behavioral signal thresholds

- [Data Quality Monitoring](../references/data_quality_monitoring.md) - Anomaly detection for malformed events, data drift, and inconsistencies

**Performance & Scaling**
- [Latency SLA Targets](../references/latency_slas.md) - P95/P99 latency requirements for churn scoring and recommendation generation
- [Concurrency Handling Strategy](../references/concurrency_handling.md) - Distributed locking implementation and deadlock recovery procedures
- [Stress Test Results](../references/stress_test_results.md) - Performance profiles at 10K, 50K, 100K+ active sellers

### Model & Analytics References

**Predictive Models**
- [Churn Prediction Model Specification](../references/churn_model_spec.md) - Features, aggregation windows, confidence calculation
- [Lead Conversion Prediction](../references/lead_conversion_model.md) - Historical seller-lead conversion rates and confidence scoring
- [Engagement Trend Forecasting](../references/engagement_forecasting.md) - Time-series analysis approach for activity trend projection

**Business Intelligence**
- [Revenue Impact Calculations](../references/revenue_impact_calculations.md) - MRR calculations, revenue-at-risk estimation, intervention ROI
- [Seller Segmentation Strategy](../references/seller_segmentation.md) - Segment definitions by plan tier, geographic region, category focus
- [Benchmark Cohort Definitions](../references/benchmark_cohorts.md) - Plan tier cohorts, regional benchmarks, and peer comparison logic

---

## Testing & Quality Assurance

### Unit Testing

**Engagement Dimension Scoring**
- Verify normalized scores between 0-100 with valid inputs
- Test edge cases: zero activity (score 0), perfect engagement (score 100), missing data (fallback to plan tier median)
- Verify score consistency across aggregation windows (1-day, 7-day, 30-day normalizations)

**Churn Risk Prediction**
- Test against historical churn outcomes: minimum 0.78 AUC on 90-day backtesting window
- Verify confidence interval correctness: 80% of scores within ±0.15 confidence band
- Edge cases: new sellers (<7 days history), dormant sellers (>90 days inactive), plan-change scenarios

**State Management**
- Verify Redis state reconciliation: divergence <1% from source-of-truth PostgreSQL
- Test recovery from Redis connection loss: fallback to PostgreSQL within 500ms
- Verify deduplication: duplicate events with identical fingerprint processed only once

### Integration Testing

**Event-to-Intelligence Pipeline**
- Inject seller activity events through RabbitMQ
- Verify engagement dimensions update within 5 seconds in Redis
- Verify churn scores recalculated within 60 seconds of new event
- Verify recommendations reflect latest engagement state

**Intervention Orchestration**
- Generate P0 churn alert for test seller
- Verify alert published to operations team dashboard
- Verify P0 intervention appears in priority queue
- Verify multi-channel engagement sequence triggered (in-app, email, phone)

### System Testing

**Customer Journey Scenarios**

**Scenario: New Seller Onboarding**
- Seller onboards with STARTER plan; verify initial engagement dimensions calculated from cohort benchmarks
- Seller receives initial recommendations (product training, lead management best practices)
- Seller participates in activity; verify response rate tracked and engagement dimension updated
- Verify no churn alert triggered (new seller baseline: 30-day churn probability <5%)

**Scenario: High-Performer Under Risk**
- Seller accumulated 2 years of history; high engagement, strong response rate, $8000 MRR
- Seller goes silent for 7 days (engagement_drop_severity: HIGH, anomaly_probability: 0.89)
- Verify churn risk escalated to 0.78 (HIGH band)
- Verify P0 intervention generated with urgency: CRITICAL
- Verify account manager notified within 10 minutes
- Verify recommendation: "account checkup" + "lead response workflow review"

**Scenario: Region-Wide Infrastructure Incident**
- Marketplace API degradation in NORTH_AMERICA region (30% of sellers affected)
- Event stream shows 60% activity drop across region within 15-minute window
- Verify correlated anomaly detection: suppress individual churn classifications for affected sellers
- Verify infrastructure ticket linking: churn alerts reference incident ticket number
- Verify 24-hour backoff: churn scoring disabled for affected sellers until infrastructure recovery confirmed
- Verify batch manual review: flag 300+ affected sellers for account manager verification post-recovery

### Performance Testing

**Load Test: 10,000 Sellers Daily Activity**
- 10,000 concurrent sellers generating average 5 events/day = 50,000 events/day
- Verify event processing latency: p50 <100ms, p95 <500ms, p99 <1s
- Verify engagement dimension updates: <5 second latency from event to Redis update
- Verify churn recalculation: <60 second latency for model updates

**Stress Test: System Under Infrastructure Failure**
- Simulate Redis connection loss: system should failover to PostgreSQL read mode within 500ms
- Simulate RabbitMQ broker down: event queue should buffer locally, resume processing within 60 seconds
- Simulate PostgreSQL query timeout: fallback to cached data with timestamp staleness warning
- Verify no data loss: all events processed on service recovery

### Acceptance Criteria

**Churn Prediction Accuracy**
- ✓ Model accuracy (AUC) >0.78 on 30/60/90-day time horizons
- ✓ Confidence intervals must contain ±15% of actual values
- ✓ Precision (churn predicted, actually churned) >0.75
- ✓ Recall (actual churn detected in predictions) >0.70

**Intervention Success Rate**
- ✓ P0 interventions executed within 2 hours: >80% within SLA
- ✓ P1 interventions executed within 24 hours: >90% within SLA
- ✓ Seller response rate to recommendations: >35%
- ✓ Intervention ROI (revenue retained / effort cost) >2.5x

---

## Positive Trigger Examples

These prompts should **DEFINITELY** activate this skill:

1. **"Our marketplace is losing high-value sellers and we can't identify at-risk accounts fast enough. Can you analyze seller engagement trends and predict churn risk for the next 30 days?"**

2. **"I need to prioritize our sales team's outreach efforts. Can you rank our at-risk seller base by intervention urgency and recommend specific actions for each seller segment?"**

3. **"Build me a seller health monitoring dashboard that shows engagement trends, identifies disengaging sellers, and suggests proactive retention actions before they churn."**

4. **"We're seeing sudden engagement dropoffs in certain geographies. Can you detect these anomalies automatically and alert our ops team so we can investigate and intervene?"**

5. **"Build a realtime system that continuously monitors seller activity, evaluates churn risk, generates personalized recommendations, and orchestrates intervention workflows."**

6. **"I need to forecast revenue-at-risk from seller churn over the next quarter and quantify the business impact of intervention strategies."**

7. **"Can you create an adaptive recommendation engine that suggests relevant actions for each seller (plan upgrades, operational improvements, engagement strategies) based on their behavioral patterns?"**

---

## Negative Trigger Examples

These prompts should **NOT** activate this skill:

1. **"Can you generate a monthly financial report for seller subscription revenue?"** 
   - *Reason*: This is accounting/reporting; doesn't require behavioral intelligence orchestration, intervention prioritization, or adaptive recommendations

2. **"I need to export all seller master data to a CSV file for compliance auditing."**
   - *Reason*: This is data extraction/compliance; not a behavioral analysis or intelligence orchestration task

3. **"Can you design a new marketplace feature where sellers can collaborate?"**
   - *Reason*: This is product development/UI design; not seller intelligence orchestration

4. **"What's the best way to migrate our PostgreSQL database to a larger instance?"**
   - *Reason*: This is infrastructure/DevOps planning; not seller intelligence analysis

5. **"I need to train a new customer support team on how to handle seller complaints."**
   - *Reason*: This is training/process documentation; doesn't require behavioral intelligence or churn prediction

6. **"Can you analyze the geographic distribution of our sellers for market expansion planning?"**
   - *Reason*: This is market analysis; could use this skill if combined with churn/engagement risk, but geographic distribution alone is static analysis

9. **"Can you audit which sellers haven't paid their invoices?"**
   - *Reason*: This is accounting/compliance; not a behavioral intelligence or churn prediction task

10. **"Our marketplace was just compromised. Help me identify which sellers were affected and send them notifications."**
    - *Reason*: This is incident response/security; behavioral intelligence skill not applicable (though monitoring framework could be adapted)

---

## Implementation Timeline & Deployment Assumptions

### Prerequisites for Deployment

**Infrastructure Requirements**
- PostgreSQL 12+ with >1TB capacity for behavioral event storage
- Redis 6+ cluster with distributed locking support
- RabbitMQ 3.8+ with persistent queue storage and mirror agents
- Golang backend services with WebSocket gateway deployed
- Python AI services with scikit-learn ML pipeline ready
- React frontend with Recharts visualization library

**Data Availability**
- Seller master records (seller_id, plan_tier, geographic_region, category_focus, revenue_tier)
- Historical behavioral event streams (login, catalog updates, responses)
- Subscription plan configuration metadata (feature eligibility, MRR)
- Category focus mappings

**Team & Organizational**
- Sales operations team with access to intervention tools and CRM
- Account management team trained on churn intervention playbooks
- Data engineering team for event stream pipeline monitoring
- ML engineering team for model maintenance and retraining
- Operations team for realtime dashboard monitoring and incident response

### Deployment Phases

**Phase 1: Data Ingestion & Model Scoring (Week 1-2)**
- Deploy event consumer on RabbitMQ to parse behavioral signals
- Implement engagement dimension calculation in Python
- Deploy churn prediction model scoring service
- Validate prediction accuracy against historical churn outcomes (minimum 0.78 AUC)

**Phase 2: Recommendation Engine & Orchestration (Week 2-3)**
- Deploy adaptive recommendation generation service
- Implement intervention priority queue and escalation logic
- Deploy multi-channel engagement sequence orchestration
- Validate recommendation acceptance rate >30%

**Phase 3: Dashboard & Realtime Publishing (Week 3-4)**
- Deploy WebSocket gateway for realtime dashboard updates
- Implement seller activity streams, engagement trends, churn alerts
- Deploy revenue-at-risk forecasting dashboard
- Validate dashboard update latency <5 seconds

**Phase 4: Sales Team Integration & Training (Week 4-5)**
- Integrate with sales CRM for intervention tracking
- Train account managers on churn intervention playbook
- Deploy intervention priority queue to operations dashboard
- Validate intervention response time: P0 within 2 hours, P1 within 24 hours

**Phase 5: Monitoring & Optimization (Week 5+)**
- Enable realtime model performance monitoring
- Implement automated churn prediction accuracy backtesting (weekly)
- Establish intervention success tracking and continuous optimization
- Capture intervention outcomes for feedback loop training

### Success Metrics & Go-Live Criteria

**Before Go-Live Approval**
- Churn prediction AUC ≥0.78 on 90-day historical validation
- Dashboard realtime update latency <5 seconds
- Intervention queue populated with P0/P1 sellers identified with >0.80 confidence
- Sales team trained and comfortable with churn intervention playbook

**Post-Launch Monitoring (First 4 Weeks)**
- Monitor churn prediction accuracy weekly against actual churn outcomes
- Track intervention execution rate and timeline compliance (P0 <2 hrs, P1 <24 hrs)
- Track seller engagement improvements post-intervention
- Capture feedback from account managers on recommendation quality

**Long-Term Success Targets (3-6 Months)**
- Seller retention rate improved +7% YoY from proactive interventions
- Manual seller analysis effort reduced 75% (from 160 to 40 hours/month)
- Revenue-at-risk detection latency reduced from 14 days to 2-4 hours
- Operational scalability increased 10x with minimal staffing growth

---

## Support & Maintenance

### Model Retraining & Calibration

**Monthly Maintenance Tasks**
1. Backtest churn prediction model against previous month's actual churn outcomes (measure AUC, precision, recall)
2. Recalibrate engagement dimension baselines using most recent 90-day seller activity
3. Update seller segmentation based on plan tier changes and geographic expansion

**Quarterly Deep Reviews**
1. Comprehensive model performance audit across all seller segments
2. Identify underperforming seller cohorts and adjust scoring parameters
3. Competitive benchmarking: compare prediction accuracy to industry standards and best practices
4. Review infrastructure scaling and latency targets; optimize bottlenecks

### Escalation Paths & Support

- **Model Performance Issues**: ML Engineering team (implement retraining, feature engineering)
- **Dashboard/UI Issues**: Frontend Engineering team (performance optimization, real-time sync)
- **Data Quality Issues**: Data Engineering team (event validation, pipeline monitoring)
- **Operational Issues**: Sales Operations + Account Management (intervention execution, playbook updates)

### Documentation Maintenance

- Keep reference documentation synchronized with deployed system (weekly review)
- Update operational playbooks based on account manager feedback (bi-weekly)
- Maintain runbooks for common failures and recovery procedures (monthly)
- Document new edge cases and solutions in knowledge base (ongoing)

---

## Build Quality & Technical Excellence

The development of this skill is guided by a four-pillar execution strategy that moves beyond generic documentation into observable system behaviors.

### 🎨 Design Strategy (Experience & Clarity)
*   **Contextual Intelligence UI**: Instead of raw data tables, the dashboard uses a **ProgressRing** design system to visualize Catalog Score and Engagement, allowing for sub-3-second human comprehension of seller health.
*   **Proactive Micro-Interactions**: Implemented "🏆 ROI Badges" on BuyLeads in the UI to immediately direct seller attention to high-value opportunities, reducing cognitive load during lead selection.
*   **Adaptive Messaging**: The AI Coach logic in `recommendations.py` uses specific seller numbers (e.g., "Respond in 10 mins") rather than generic tips, creating a high-trust interactive experience.

### 📦 Product Strategy (Value & ROI)
*   **ROI-Driven Prioritization**: Replaced basic lead lists with a **Value × Recency** ranking algorithm. This decision directly solves the "lead fatigue" problem by ensuring the best opportunities are seen first.
*   **Latency-to-Action Mapping**: Identified that lead conversion drops exponentially after 15 minutes; productized this insight by hardcoding a 10-minute response recommendation for the "Best Match" leads.
*   **Lifecycle State Machine**: Developed a 6-state transition model (EMERGING to DORMANT) to allow the Sales team to segment outreach by behavior velocity rather than just static revenue tiers.

### 🛠️ Engineering Strategy (Robustness & Scale)
*   **Concurrency-Safe Allocation**: Implemented **Distributed Locking in Redis** (`MULTI/EXEC`) to ensure that a single BuyLead cannot be double-allocated during peak traffic spikes (500+ allocations/sec).
*   **Event-Driven Decoupling**: Chose **RabbitMQ** as the event broker to decouple the behavioral signal stream from the API handlers, ensuring that a surge in seller logins doesn't degrade the checkout or search performance.
*   **Graceful Degradation**: Built a multi-layer fallback system (Redis Cache → PostgreSQL Snaphots → Median Benchmarks) ensuring the Intelligence Feed remains active even during partial infrastructure failures.

### 🚀 Execution Strategy (Validation & Performance)
*   **Automated Verification**: Created a specialized `SCRIPTS.md` containing `backtest_churn_model.py` and `lead_allocation_bench.py` to prove system stability under 10k-seller loads before production deployment.
*   **Observable Metrics**: Hardcoded **Latency SLAs** (p95 < 500ms) and **Accuracy Thresholds** (AUC > 0.78) into the acceptance criteria to ensure technical excellence is measurable and audited.
*   **Realtime Syncing**: Implemented **WebSocket Heartbeats** and state versioning to prevent "Stale Dashboard" syndrome, ensuring the Sales team always sees the absolute latest engagement signals.

---

## Glossary

**Behavioral Signal**: Discrete marketplace action by seller (login, catalog update, lead response, message, notification engagement)

**Churn Risk Score**: Predictive probability [0-1] that seller will discontinue subscription within specified time horizon (30/60/90 days)

**Engagement Dimension**: Aggregated behavioral metric (catalog_freshness, response_responsiveness, quota_utilization, notification_engagement, lead_participation)

**Engagement Momentum**: Rate of change in engagement dimensions over time; indicates acceleration/deceleration of engagement trends

**Lifecycle Phase**: Current state classification of seller (EMERGING, ENGAGED, MAINTAINING, DISENGAGING, AT_RISK, DORMANT)

**Revenue-at-Risk**: Quantification of subscription revenue that could be lost if identified at-risk sellers actually churn

**Seller Engagement**: Composite measure of seller activity, responsiveness, and marketplace participation; inverse indicator of churn risk

**Intervention Priority**: Urgency ranking of seller for account management outreach (P0=urgent, P1=important, P2=opportunity)

**Recommendation**: Suggested action for seller (retention outreach, plan upgrade, operational support) generated from behavioral analysis

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-16 | Initial skill definition; complete architecture specification |

---
