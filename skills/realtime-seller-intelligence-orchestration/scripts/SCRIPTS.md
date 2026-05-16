# Scripts Documentation

This directory contains production utilities for deploying, testing, and monitoring the Realtime Seller Intelligence Orchestration Skill.

## validate_seller_data.py

**Purpose**: Pre-deployment data quality validation and anomaly detection

**When to Use**:
- Before initial deployment to verify data completeness and consistency
- Weekly health checks to identify data quality degradation
- Investigation of suspected data pipeline failures
- Generation of data quality audit reports for compliance

**Inputs**:
- Seller master dataset (CSV/Parquet)
- Behavioral event stream sample (JSON/Parquet)
- Subscription plan configuration (JSON)

**Expected Outputs**:
- Data quality report with pass/fail status
- Identified missing values, inconsistencies, and anomalies
- Recommendations for data remediation
- Data validation metrics: completeness %, consistency %, freshness %

**Key Validations**:
- Seller IDs: valid UUID format, no duplicates, all referenced in events
- Event timestamps: within valid range (±90 days from current), no gaps >7 days
- Subscription plans: all referenced plans exist in configuration, no orphaned sellers
- Geographic mappings: all seller regions valid, no unmapped categories
- Revenue fields: non-negative, within expected ranges per plan tier
- Event schema: all required fields present, proper data types

**Example Usage**:
```bash
# Quick validation with defaults
python validate_seller_data.py --input-path /data/seller_master.csv

# Full audit with anomaly detection
python validate_seller_data.py --input-path /data/ --full-audit --sensitivity-level high

# Generate HTML report for stakeholders
python validate_seller_data.py --generate-report --output-format html

# Check for specific data quality issues
python validate_seller_data.py --detect-duplicates --detect-anomalies --detect-missing-values
```

**Configuration**:
- `max_acceptable_missing_pct`: 2% (rows with missing engagement dimensions)
- `freshness_threshold_days`: 7 (max age before flagging as stale)
- `anomaly_sensitivity`: 3.0 (standard deviations from baseline for detection)

---

## backtest_churn_model.py

**Purpose**: Historical model performance validation and accuracy measurement

**When to Use**:
- Before going live: validate model AUC ≥ 0.78 on 90-day historical data
- Monthly maintenance: backtest against previous month's actual churn outcomes
- Model drift detection: compare recent accuracy vs. baseline
- Comparative analysis: test proposed model changes vs. current production model

**Inputs**:
- Historical seller activity (90-day window minimum)
- Actual churn outcomes (seller churn/no-churn labels)
- Current production model weights/parameters
- Proposed model parameters (optional, for A/B testing)

**Expected Outputs**:
- Model accuracy metrics: AUC, precision, recall, F1-score, calibration
- Confusion matrix with false positive/false negative rates
- Performance by seller segment (plan tier, geography, activity level)
- Recommendations: model retraining trigger or parameter adjustments
- Performance comparison: current vs. proposed model

**Key Metrics Computed**:
- Area Under Curve (AUC): ≥ 0.78 target
- Precision (churn predicted, actually churned): ≥ 0.75
- Recall (actual churn detected): ≥ 0.70
- Calibration: predicted probability vs. actual probability alignment
- Performance by segment: identify underperforming cohorts

**Example Usage**:
```bash
# Standard monthly backtest
python backtest_churn_model.py --lookback-days 30 --generate-report

# Full historical validation (90 days)
python backtest_churn_model.py --lookback-days 90 --full-audit

# Compare current vs. proposed model
python backtest_churn_model.py --compare-models --model-current ./current_model.pkl --model-proposed ./proposed_model.pkl

# Segment-specific analysis
python backtest_churn_model.py --segment-by plan_tier --segment-by geography
```

**Configuration**:
- `auc_threshold`: 0.78 (minimum acceptable accuracy)
- `precision_threshold`: 0.75
- `recall_threshold`: 0.70
- `lookback_window_days`: 90 (default historical period)

---

## kafka_event_simulator.py

**Purpose**: Simulate marketplace event streams for testing and development

**When to Use**:
- During development/testing before connecting to production event stream
- Load testing: simulate peak marketplace activity patterns
- Edge case testing: generate specific behavioral patterns (sudden drops, quota exhaustion)
- Disaster recovery testing: simulate events to verify recovery procedures

**Inputs**:
- Seller configuration (count, distribution by plan tier)
- Event generation pattern (normal, peak, stress, edge_case)
- Duration and rate (events per second)
- Optional: specific seller IDs or scenarios to simulate

**Expected Outputs**:
- Generated RabbitMQ event messages in production format
- Event stream statistics (messages generated, timestamp range)
- Optional: performance metrics (throughput, latency)

**Event Patterns**:
1. **normal**: Realistic daily activity (10-20 events per seller per day)
2. **peak**: Marketplace peak hours (100+ events per second)
3. **stress**: High load test (1000+ events per second)
4. **edge_case**: Specific scenarios (sudden engagement drop, quota exhaustion, duplicate events)

**Example Usage**:
```bash
# Generate normal event stream (1 hour)
python kafka_event_simulator.py --duration-hours 1 --pattern normal

# Simulate peak activity (30 minutes)
python kafka_event_simulator.py --duration-minutes 30 --pattern peak --sellers 5000

# Stress test scenario
python kafka_event_simulator.py --pattern stress --duration-minutes 5 --sellers 1000

# Edge case: generate sudden engagement drop for specific seller
python kafka_event_simulator.py --pattern edge_case --scenario sudden_drop --seller-id SEL-123456
```

**Configuration**:
- `events_per_seller_per_day_normal`: 15 (baseline activity)
- `peak_multiplier`: 8x normal rate during peak hours
- `stress_rate_events_per_second`: 1000
- `event_types_distribution`: {login: 30%, catalog_update: 15%, lead_response: 40%, notification: 15%}

---

## lead_allocation_bench.py

**Purpose**: Load testing for lead routing allocation service

**When to Use**:
- Before going live: validate allocation latency and accuracy under load
- Capacity planning: determine maximum sustainable request rate
- Performance optimization: identify bottlenecks (Redis, PostgreSQL, concurrency)
- Regression testing: verify allocation logic after code changes

**Inputs**:
- Lead dataset (sample of typical lead categories and volumes)
- Seller eligibility matrix (valid seller-category combinations)
- Current seller state (quota remaining, engagement scores)
- Test parameters: concurrent requests, duration, collision rate

**Expected Outputs**:
- Latency metrics: p50, p95, p99 (target: p95 < 500ms)
- Throughput: requests per second sustained
- Accuracy: allocation success rate, correctness of eligibility validation
- Failures: double-allocations, timeout rate, lock contention issues
- Recommendation: scaling requirements or optimization opportunities

**Test Scenarios**:
1. **baseline**: Normal marketplace activity (100 requests/sec)
2. **peak**: Peak hours (500 requests/sec)
3. **stress**: Maximum load test (1000 requests/sec)
4. **collision**: High collision rate on same lead (100 concurrent requests for same lead)

**Example Usage**:
```bash
# Baseline performance test
python lead_allocation_bench.py --concurrent-requests 100 --duration-minutes 5

# Peak load scenario
python lead_allocation_bench.py --load-scenario peak --duration-minutes 10

# Stress test
python lead_allocation_bench.py --load-scenario stress --duration-minutes 5

# Collision test (test double-allocation prevention)
python lead_allocation_bench.py --concurrent-requests 100 --same-lead-collision-rate 0.8

# Generate detailed performance report
python lead_allocation_bench.py --generate-report --output-format html
```

**Success Criteria**:
- p95 latency < 500ms
- Zero double-allocations (100% correctness)
- >95% request success rate
- Lock contention <5%

**Configuration**:
- `target_p95_latency_ms`: 500
- `min_success_rate_pct`: 95
- `max_lock_contention_pct`: 5
- `timeout_seconds`: 10 (individual request timeout)

---

## seed_engagement_cache.py

**Purpose**: Pre-warm Redis cache with seller engagement scores and state

**When to Use**:
- Before going live: populate cache with all active sellers
- Daily cache refresh: update engagement scores for all sellers (can run during off-peak)
- After Redis restart: restore cache state for sub-second lookup performance
- Performance tuning: verify cache can handle full active seller population

**Inputs**:
- Seller master dataset
- Historical behavioral activity (30-day window)
- Subscription plan configuration
- Current engagement dimension calculations from Python AI services

**Expected Outputs**:
- Redis cache populated with seller engagement scores
- Cache statistics: keys created, memory used, TTL distribution
- Pre-warming performance: time to populate, validation errors
- Cache hit rate baseline for comparison

**Cache Keys Populated**:
- `seller:{seller_id}:engagement_dims`: Current engagement dimension scores
- `seller:{seller_id}:churn_score`: Latest churn risk prediction
- `seller:{seller_id}:quota:remaining`: Current lead quota remaining
- `seller:{seller_id}:allocation:state`: Current allocation status

**Example Usage**:
```bash
# Pre-warm cache for all 10,000 sellers
python seed_engagement_cache.py --sellers 10000 --window-days 30

# Refresh cache only for active sellers (updated within last 7 days)
python seed_engagement_cache.py --refresh-active-only --window-days 7

# Populate cache and verify completeness
python seed_engagement_cache.py --sellers 10000 --verify

# Show cache statistics before/after
python seed_engagement_cache.py --sellers 10000 --show-stats

# Update only engagement baselines (recalibrate for recent data)
python seed_engagement_cache.py --update-baselines --lookback-days 30
```

**Configuration**:
- `cache_ttl_seconds`: 3600 (1 hour; engagement scores refresh hourly)
- `batch_size`: 1000 (Redis pipelining batch size)
- `verification_sampling_rate`: 10% (verify random 10% of cached values)

---

## monitor_skill_health.py

**Purpose**: Real-time skill performance monitoring and alerting

**When to Use**:
- Continuous monitoring during production operation
- Incident investigation: identify performance degradation or failures
- Capacity planning: track trending metrics for scaling decisions
- SLA tracking: monitor compliance with latency and accuracy targets

**Inputs**:
- Real-time metric streams (Prometheus, CloudWatch, or custom)
- Skill health configuration with alert thresholds
- Optional: historical baseline for anomaly detection

**Expected Outputs**:
- Real-time dashboard showing:
  - Latency metrics: p50, p95, p99 (target: p95 < 500ms)
  - Throughput: events/second, allocations/second
  - Error rates: event processing failures, allocation failures
  - Model accuracy: recent churn prediction accuracy
  - System health: Redis connection, PostgreSQL queries, RabbitMQ lag
  - Alerts: triggered when metrics exceed thresholds

**Key Metrics**:
- `allocation_latency_p95_ms`: <500ms target
- `event_processing_latency_p95_ms`: <5000ms target
- `lead_routing_accuracy_pct`: >95% target
- `churn_model_auc`: >0.78 target
- `false_positive_rate_pct`: <15% target
- `intervention_queue_staleness_minutes`: <5 minutes

**Example Usage**:
```bash
# Start monitoring dashboard (terminal UI)
python monitor_skill_health.py --show-dashboard

# Check health status and recent alerts
python monitor_skill_health.py --health-check

# View errors from last 24 hours
python monitor_skill_health.py --errors-last-24-hours

# Set up webhook alerting (Slack, PagerDuty)
python monitor_skill_health.py --alert-webhook https://hooks.slack.com/... --alert-threshold critical

# Export metrics to monitoring service
python monitor_skill_health.py --export-prometheus http://prometheus:9091

# Generate weekly health report
python monitor_skill_health.py --generate-report --period weekly
```

**Alert Thresholds**:
- **CRITICAL**: p95 latency > 2 seconds, error rate > 5%, accuracy drop > 0.10
- **WARNING**: p95 latency > 1 second, error rate > 2%, accuracy drop > 0.05
- **INFO**: Informational alerts for trending metrics

**Configuration**:
- `refresh_interval_seconds`: 5 (update metrics every 5 seconds)
- `alert_cooldown_seconds`: 300 (avoid alert spam, wait 5 min between same alert)
- `latency_p95_threshold_ms`: 500 (critical threshold)
- `error_rate_threshold_pct`: 5 (critical threshold)

---

## Summary Table

| Script | Purpose | Frequency | Priority |
|--------|---------|-----------|----------|
| validate_seller_data.py | Data quality validation | Pre-deployment + weekly | P0 |
| backtest_churn_model.py | Model accuracy measurement | Monthly + on drift detection | P1 |
| kafka_event_simulator.py | Event stream testing | Dev/testing only | P2 |
| lead_allocation_bench.py | Load testing & scaling | Pre-deployment + quarterly | P1 |
| seed_engagement_cache.py | Cache pre-warming | Daily (off-peak) | P2 |
| monitor_skill_health.py | Real-time monitoring | Continuous (production) | P0 |

---

For deployment instructions, see [README.md](../README.md). For operational procedures, see [SKILL.md](../SKILL.md#operational-guidance).
