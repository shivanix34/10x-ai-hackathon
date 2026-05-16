---
skill_id: marketplace-orchestration
skill_name: Real-Time Marketplace Orchestration
version: 1.0.0
category: marketplace-operations
tags: [orchestration, real-time, event-streaming, workflow-coordination, integration]
---

# Real-Time Marketplace Orchestration Skill

## Activation Description

**Use this skill when you need to:**
- Coordinate multiple intelligence systems (churn, leads, health, analytics, recommendations)
- Orchestrate end-to-end seller lifecycle workflows
- Handle real-time event processing and state synchronization
- Manage intervention workflows and escalation paths
- Build realtime operational dashboards
- Monitor system health and performance
- Implement resilience and recovery strategies

**Key triggering terms:**
`orchestration` | `workflow coordination` | `real-time processing` | `event streaming` | `system integration` | `operational workflow` | `end-to-end flow` | `marketplace operations`

## Problem Statement

Running multiple intelligence systems independently creates coordination challenges:

- **Data synchronization issues**: Churn predictions don't align with lead routing (different seller states)
- **Workflow gaps**: Alerts generated but no mechanism to execute recommended interventions
- **State inconsistency**: Redis cache, PostgreSQL database, and operational systems out of sync (conflicting decisions)
- **Manual handoffs**: Insights generated but not automatically routed to sales teams (email/dashboard delays)
- **Scalability bottlenecks**: Multiple systems competing for database/message queue resources
- **Observability gaps**: Can't track why decisions were made or debug multi-system failures

## Solution

**Unified marketplace orchestration layer** that:
1. **Coordinates intelligence inputs** (churn + health + leads + analytics)
2. **Manages seller lifecycle workflows** (EMERGING → ENGAGED → MAINTAINING → DISENGAGING → DORMANT)
3. **Orchestrates interventions** (alert generation → prioritization → channel selection → execution tracking)
4. **Handles realtime sync** (Redis ↔ PostgreSQL ↔ WebSocket dashboard)
5. **Implements resilience** (circuit breakers, retries, dead letter queues)
6. **Enables observability** (tracing, metrics, decision audit logs)

## Key Workflows

**Seller Lifecycle Orchestration**
```
[New Seller Onboarded]
  ↓
[Initial Health Score (plan tier benchmarks)]
  ↓
[Monitor: Lead Consumption, Response Latency, Engagement]
  ↓
[Phase Progression: EMERGING → ENGAGED → MAINTAINING]
  ↓
[Engagement Drop Detected (+2σ deviation)]
  ↓
[Alert Generated: HEALTH_DEGRADATION]
  ↓
[Trigger Behavioral Analysis: Root Cause Investigation]
  ↓
[Generate Recommendations: Operational Support + High-ROI Leads]
  ↓
[Phase Transition: MAINTAINING → DISENGAGING]
  ↓
[Escalate to P1 Intervention: Account Manager Outreach]
  ↓
[Multi-Channel Sequence: In-app → Email → Phone]
  ↓
[Track Seller Response & Engagement Recovery]
  ↓
[IF Recovered: Resume ENGAGED Phase]
  ↓
[IF No Response: Phase Transition → AT_RISK]
  ↓
[Escalate to P0: Urgent Retention Intervention]
```

**Real-Time Lead Routing Workflow**
```
[New Lead Arrives] (buyer submits lead request)
  ↓
[Lead Quality Scoring] (intent, value, urgency, GST)
  ↓
[Hot Lead Decision: Priority ≥80?]
  ├─[YES] → Route to best-fit seller, notify seller in <5 min
  └─[NO] → Batch route next available seller
  ↓
[Seller Recommendation: Match probability calculation]
  ↓
[Allocation Decision: Queue management + quota check]
  ↓
[Real-time Notification] (in-app alert to seller)
  ↓
[Track Seller Response] (response time, acceptance, conversion)
  ↓
[Feedback Loop] (update lead routing model)
```

**Intervention Execution Workflow**
```
[Churn Risk Alert Generated] (seller churn_risk >0.78)
  ↓
[Recommendation Engine] (personalized actions + messaging)
  ↓
[Priority Queue Assignment] (P0 = urgent, P1 = important)
  ↓
[Sales Team Assignment] (route to account manager by region/capacity)
  ↓
[Multi-Channel Sequencing]:
    ├─ T+0 min: In-app notification (immediate awareness)
    ├─ T+6 hr: Email (detailed recommendation + context)
    └─ T+24 hr: Phone call (account manager follow-up)
  ↓
[Seller Response Tracking]:
    ├─ Opened email? → Engagement increase
    ├─ Clicked link? → High interest signal
    └─ Called account manager? → Conversion attempt
  ↓
[Outcome Recording]:
    ├─ Seller responded? → Update engagement score, reduce churn risk
    ├─ Seller upgraded plan? → Record revenue impact, success
    └─ Seller didn't respond? → Escalate, retry different approach
  ↓
[Feedback Loop] (update recommendation model with outcome)
```

## Architecture

**System Components:**
```
Event Sources (RabbitMQ)
  ├─ Seller activity events
  ├─ Lead events
  ├─ Response events
  └─ Transaction events
        ↓
Message Consumer & Router
  ├─ Event deduplication
  ├─ Schema validation
  └─ Priority queuing
        ↓
Orchestration Engine
  ├─ Intelligence Coordination
  │   ├─ Churn Risk Scoring
  │   ├─ Health Scoring
  │   ├─ Lead Routing
  │   └─ Behavioral Analytics
  ├─ Workflow Management
  │   ├─ Lifecycle Phase Tracking
  │   ├─ Intervention Sequencing
  │   └─ SLA Enforcement
  └─ State Management
      ├─ Redis Cache (realtime)
      ├─ PostgreSQL (persistent)
      └─ Consistency Checking
        ↓
Output Channels
  ├─ Dashboard (WebSocket realtime updates)
  ├─ Alerts (email, SMS, push)
  ├─ Sales Tools (CRM integration)
  └─ Seller Interface (recommendations)
```

## Operational Workflows

**Scale & Throughput:**
- **Events/sec**: 10K+ concurrent seller activity events
- **Intelligence decisions/sec**: 1K+ churn scores, 500+ lead routes, 200+ recommendations
- **Latency targets**: Churn alert <2 hours, lead route <100ms, recommendations <5 seconds
- **State consistency**: PostgreSQL source-of-truth, Redis cache, WebSocket eventual consistency

**Resilience Strategies:**
| Failure | Detection | Recovery |
|---------|-----------|----------|
| Redis connection loss | 3 failed attempts | Fallback to PostgreSQL; disable realtime |
| RabbitMQ broker down | Queue timeout after 5 min | Buffer events locally; resume on broker recovery |
| PostgreSQL query timeout | Query >3 sec | Cancel query; use cached data; alert ops |
| WebSocket hub memory spike | Memory >4GB | Restart connections; limit active subscribers |
| Churn model prediction failure | Invalid score output | Fallback to historical churn rate; alert ML team |

## Integration Points

**Code References:**
- Event orchestration: `backend/internal/events/processor.go`
- Workflow management: `backend/internal/api/handlers.go`
- State sync: `backend/internal/cache/redis.go` + `backend/internal/db/postgres.go`
- Real-time pub/sub: `backend/internal/websocket/hub.go`
- Message routing: `backend/internal/mq/rabbitmq.go`

**Data Flow:**
```
RabbitMQ → Event Processor → Orchestration Engine 
→ Intelligence Coordination → State Management 
→ Output Channels (Dashboard, Alerts, CRM)
```

## Success Metrics

✅ Churn alert end-to-end latency <2 hours
✅ Lead routing decision <100ms
✅ Recommendation generation <5 seconds
✅ System uptime 99.9%+
✅ State consistency >99.95% (cache vs database)
✅ Intervention execution rate >90% within SLA

## Positive Triggers

1. "Design the end-to-end system that coordinates churn detection, lead routing, and seller interventions."
2. "Build a realtime platform that handles seller events, processes intelligence, and executes workflows."
3. "We need orchestration that coordinates multiple AI systems and ensures nothing falls through the cracks."

## Negative Triggers

1. "Design a new dashboard UI." (frontend design)
2. "Write SQL queries to export seller data." (data extraction)

---

**Status**: ✅ PRODUCTION-READY | **Last Updated**: 2026-05-16
