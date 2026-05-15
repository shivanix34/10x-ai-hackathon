-- ============================================================
-- Marketplace Orchestration Platform — Database Schema
-- ============================================================

-- Sellers master table (loaded from seller_master_dataset)
CREATE TABLE IF NOT EXISTS sellers (
    seller_id BIGINT PRIMARY KEY,
    company_name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    business_type TEXT,
    years_active INT,
    service_name TEXT,
    weekly_bl_allocation INT DEFAULT 0,
    revenue_band TEXT,
    persona_type TEXT,
    catalog_quality_score FLOAT DEFAULT 0,
    total_products INT DEFAULT 0,
    active_categories INT DEFAULT 0,
    avg_weekly_leads FLOAT DEFAULT 0,
    avg_weekly_lead_consumption FLOAT DEFAULT 0,
    avg_response_rate FLOAT DEFAULT 0,
    avg_response_time_mins FLOAT DEFAULT 0,
    preferred_platform TEXT,
    seller_rating FLOAT DEFAULT 0,
    engagement_score FLOAT DEFAULT 0,
    seller_health_score FLOAT DEFAULT 0,
    churn_risk TEXT DEFAULT 'Medium',
    upsell_probability FLOAT DEFAULT 0,
    last_active_days_ago INT DEFAULT 0,
    notification_open_rate FLOAT DEFAULT 0,
    support_ticket_count INT DEFAULT 0,
    preferred_market TEXT,
    primary_category TEXT,
    secondary_categories TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table (loaded from leads_dataset)
CREATE TABLE IF NOT EXISTS leads (
    lead_id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    buyer_city TEXT,
    buyer_state TEXT,
    product_name TEXT,
    category TEXT,
    subcategory TEXT,
    quantity INT DEFAULT 0,
    order_value_rs FLOAT DEFAULT 0,
    buyer_type TEXT,
    intent_score FLOAT DEFAULT 0,
    lead_quality TEXT,
    urgency TEXT,
    budget_range TEXT,
    requirement_type TEXT,
    buyer_engagement_score FLOAT DEFAULT 0,
    gst_verified BOOLEAN DEFAULT FALSE,
    preferred_contact TEXT,
    lead_source TEXT,
    status TEXT DEFAULT 'ACTIVE',
    consumed_by BIGINT,
    consumed_at TIMESTAMPTZ,
    routed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seller events (immutable append-only log)
CREATE TABLE IF NOT EXISTS seller_events (
    event_id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    seller_id BIGINT,
    company_name TEXT,
    persona_type TEXT,
    service_name TEXT,
    city TEXT,
    event_type TEXT,
    event_source TEXT,
    event_value FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead-seller matching (loaded from lead_seller_matching_dataset)
CREATE TABLE IF NOT EXISTS lead_seller_matches (
    lead_id TEXT,
    seller_id BIGINT,
    company_name TEXT,
    seller_category TEXT,
    service_name TEXT,
    seller_health_score FLOAT DEFAULT 0,
    match_score FLOAT DEFAULT 0,
    PRIMARY KEY (lead_id, seller_id)
);

-- MUTABLE: Live seller intelligence state
CREATE TABLE IF NOT EXISTS seller_behavior_state (
    seller_id BIGINT PRIMARY KEY,
    health_score FLOAT DEFAULT 50,
    engagement_score FLOAT DEFAULT 50,
    churn_risk TEXT DEFAULT 'Medium',
    response_efficiency FLOAT DEFAULT 50,
    quota_utilization FLOAT DEFAULT 0,
    routing_priority FLOAT DEFAULT 50,
    recommendation TEXT DEFAULT '',
    intervention_status TEXT DEFAULT 'NONE',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Lead routing assignments (max 5 sellers per lead)
CREATE TABLE IF NOT EXISTS lead_routing (
    id SERIAL PRIMARY KEY,
    lead_id TEXT,
    seller_id BIGINT,
    routing_score FLOAT DEFAULT 0,
    routed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PENDING',
    consumed_at TIMESTAMPTZ,
    UNIQUE(lead_id, seller_id)
);

-- Seller quota tracking
CREATE TABLE IF NOT EXISTS seller_quotas (
    seller_id BIGINT PRIMARY KEY,
    service_name TEXT,
    weekly_allocation INT DEFAULT 0,
    daily_bonus INT DEFAULT 0,
    weekly_consumed INT DEFAULT 0,
    daily_bonus_consumed INT DEFAULT 0,
    week_start_date DATE DEFAULT CURRENT_DATE,
    last_reset TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention history
CREATE TABLE IF NOT EXISTS interventions (
    id SERIAL PRIMARY KEY,
    seller_id BIGINT,
    intervention_type TEXT,
    reason TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- System metrics for monitoring dashboard
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seller_events_seller ON seller_events(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_events_type ON seller_events(event_type);
CREATE INDEX IF NOT EXISTS idx_seller_events_ts ON seller_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_routed ON leads(routed);
CREATE INDEX IF NOT EXISTS idx_lead_routing_lead ON lead_routing(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_routing_seller ON lead_routing(seller_id);
CREATE INDEX IF NOT EXISTS idx_lead_routing_status ON lead_routing(status);
CREATE INDEX IF NOT EXISTS idx_behavior_churn ON seller_behavior_state(churn_risk);
CREATE INDEX IF NOT EXISTS idx_behavior_health ON seller_behavior_state(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_priority ON seller_behavior_state(routing_priority DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_seller ON interventions(seller_id);
CREATE INDEX IF NOT EXISTS idx_matches_seller ON lead_seller_matches(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotas_service ON seller_quotas(service_name);
