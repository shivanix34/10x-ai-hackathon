# Realtime Seller Intelligence Orchestration Skill

## Folder Structure

```
realtime-seller-intelligence-orchestration/
├── SKILL.md                           # Primary skill definition
├── README.md                           # This file
├── scripts/
│   ├── validate_seller_data.py        # Pre-deployment data validation
│   ├── backtest_churn_model.py        # Historical model performance validation
│   ├── kafka_event_simulator.py       # Event stream simulation for testing
│   ├── lead_allocation_bench.py       # Load testing for lead routing
│   ├── seed_engagement_cache.py       # Redis cache pre-warming
│   └── monitor_skill_health.py        # Real-time skill performance monitoring
├── references/
│   ├── backend_graphql_schema.md      # GraphQL API definitions
│   ├── rabbitmq_event_schemas.md      # Event payload specifications
│   ├── lead_allocation_api.md         # Lead routing REST API
│   ├── postgres_schema.md             # Database table definitions
│   ├── engagement_dimensions.md       # Engagement scoring methodology
│   ├── churn_risk_methodology.md      # Churn prediction algorithm spec
│   ├── lifecycle_phases.md            # Seller lifecycle state machine
│   ├── lead_routing_priority.md       # Lead routing rules and constraints
│   ├── redis_cache_architecture.md    # Cache key structure and policies
│   ├── websocket_gateway_spec.md      # Real-time message format specs
│   ├── intervention_procedures.md     # Sales team playbooks
│   ├── data_validation_rules.md       # Input validation requirements
│   ├── latency_slas.md                # Performance targets
│   └── seller_segmentation.md         # Segment definitions
└── examples/
    ├── churn_alert_example.json       # Sample P0 churn alert payload
    ├── lead_routing_example.json      # Sample lead allocation decision
    └── intervention_queue_example.json # Sample priority queue screenshot
```

## Quick Start

### 1. Prerequisites Checklist

- [ ] PostgreSQL database with seller master schema deployed
- [ ] Redis cluster with distributed locking support running
- [ ] RabbitMQ broker with event partitioning configured
- [ ] Golang backend services with WebSocket gateway deployed
- [ ] Python environment with scikit-learn and pandas available
- [ ] Historical behavioral event data (minimum 90 days) available for model training

### 2. Deployment Steps

```bash
# 1. Validate incoming data quality
python scripts/validate_seller_data.py --input-path /path/to/seller_master.csv

# 2. Pre-warm Redis cache with active seller engagement scores
python scripts/seed_engagement_cache.py --sellers 10000 --window-days 30

# 3. Run model backtesting on historical data
python scripts/backtest_churn_model.py --lookback-days 90 --generate-report

# 4. Execute load testing for lead allocation
python scripts/lead_allocation_bench.py --concurrent-requests 100 --duration-minutes 5

# 5. Enable skill health monitoring
python scripts/monitor_skill_health.py --interval-seconds 30 --alert-webhook [webhook-url]
```

### 3. Go-Live Checklist

- [ ] Churn prediction model AUC ≥ 0.78 on historical validation
- [ ] Lead routing allocation latency p95 < 500ms
- [ ] Dashboard real-time update latency < 5 seconds
- [ ] Zero double-allocation failures in load testing (100+ concurrent requests)
- [ ] Account management team trained on intervention playbook
- [ ] Sales CRM integration tested end-to-end
- [ ] Monitoring and alerting configured for skill health

## Key Configuration Files

### Engagement Dimension Weights
Located in `references/engagement_dimensions.md`
- catalog_freshness: 20% (updates within 7 days vs. >90 days stale)
- response_responsiveness: 30% (response time vs. peer benchmark)
- lead_participation: 25% (lead consumption rate vs. quota)
- quota_utilization: 15% (current vs. plan-tier maximum)
- notification_engagement: 10% (notification open/click rate)

### Risk Stratification Thresholds
- LOW: churn_score < 0.40
- MEDIUM: 0.40 ≤ churn_score < 0.60
- HIGH: 0.60 ≤ churn_score < 0.80
- CRITICAL: churn_score ≥ 0.80

### Intervention Priority Thresholds
- P0: churn_score > 0.80 AND seller_mrr > $2000
- P1: churn_score > 0.60 OR multiple engagement dimension declines
- P2: Optimization recommendations (low churn risk)

## Common Operational Tasks

### Check Skill Health Status

```bash
# View real-time performance metrics
python scripts/monitor_skill_health.py --show-dashboard

# Check recent error rate
python scripts/monitor_skill_health.py --errors-last-24-hours
```

### Validate Data Quality

```bash
# Run comprehensive data validation
python scripts/validate_seller_data.py --full-audit --generate-report

# Check for anomalies in event stream
python scripts/validate_seller_data.py --detect-anomalies --sensitivity-level high
```

### Test Lead Allocation Under Load

```bash
# Simulate peak marketplace activity (1000 lead allocations/hour)
python scripts/lead_allocation_bench.py --load-scenario peak --duration-minutes 10
```

### Update Engagement Baselines

```bash
# Recalibrate engagement dimension weights based on recent data
python scripts/seed_engagement_cache.py --update-baselines --lookback-days 30
```

## Integration Points

### 1. **Event Stream Integration** (RabbitMQ)
- **Source**: Marketplace event broker
- **Frequency**: Real-time (millions of events daily)
- **Format**: See `references/rabbitmq_event_schemas.md`
- **Consumer**: Python AI services listening on event partitions

### 2. **Lead Allocation API** (REST)
- **Endpoint**: POST /api/v1/lead-routing/allocate
- **Latency SLA**: p95 < 500ms
- **Format**: See `references/lead_allocation_api.md`
- **Auth**: OAuth 2.0 with service account

### 3. **Backend GraphQL API** (Query)
- **Endpoint**: GraphQL query endpoint for seller context
- **Use Case**: Retrieve seller master data, subscription plans, allocation history
- **Example**: See `references/backend_graphql_schema.md`

### 4. **Sales CRM Integration**
- **Endpoint**: Webhook for intervention queue updates
- **Frequency**: Real-time P0 alerts, batch P1/P2 updates
- **Format**: Intervention priority queue JSON

### 5. **Dashboard WebSocket** (Real-time)
- **Endpoint**: WebSocket gateway for real-time updates
- **Frequency**: Sub-5-second latency for churn alerts and activity streams
- **Format**: See `references/websocket_gateway_spec.md`

## Troubleshooting Guide

### Issue: Churn Prediction Accuracy Dropping

**Investigation Path**:
1. Check for data quality degradation: `python scripts/validate_seller_data.py --detect-anomalies`
2. Compare recent training data distribution vs. baseline: `python scripts/backtest_churn_model.py --compare-distributions`
3. If model drift detected, retrain model: Model engineering team intervention required

### Issue: Lead Allocation Latency Spikes

**Investigation Path**:
1. Check Redis connection pool: `redis-cli --stat` (observe memory and CPU)
2. Check PostgreSQL query log for timeouts
3. If lock contention detected, increase Redis cluster nodes or optimize query patterns

### Issue: Dashboard Updates Delayed

**Investigation Path**:
1. Check WebSocket gateway backlog: `docker logs [gateway-container] | grep queue_depth`
2. Check for RabbitMQ consumer lag: Verify consumer offset vs. latest message
3. If lag detected, increase consumer parallelism or optimize aggregation logic

### Issue: False Positive Churn Alerts

**Investigation Path**:
1. Check if correlated anomalies (infrastructure incident): Look for >30% of sellers showing identical drop pattern
2. Verify seller account status (not suspended or in manual review)
3. If alerts persist, model confidence gates may need adjustment

## Support & Escalation

**Technical Issues**: Contact ML Engineering team (model accuracy, algorithm optimization)

**Operational Issues**: Contact Sales Operations team (intervention execution, playbook updates)

**Infrastructure Issues**: Contact DevOps team (Redis, RabbitMQ, PostgreSQL scaling)

**Data Quality Issues**: Contact Data Engineering team (event validation, pipeline monitoring)

## Version & Maintenance

- **Current Version**: 1.0.0
- **Last Updated**: 2026-05-16
- **Next Scheduled Review**: 2026-06-16
- **Maintenance Cycle**: Monthly comprehensive audit; quarterly deep review

---

For detailed technical specifications, refer to the [SKILL.md](SKILL.md) documentation.
