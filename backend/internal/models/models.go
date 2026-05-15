package models

import "time"

// ─── Seller ──────────────────────────────────────────────────
type Seller struct {
	SellerID               int64   `json:"seller_id"`
	CompanyName            string  `json:"company_name"`
	City                   string  `json:"city"`
	State                  string  `json:"state"`
	BusinessType           string  `json:"business_type"`
	YearsActive            int     `json:"years_active"`
	ServiceName            string  `json:"service_name"`
	WeeklyBLAllocation     int     `json:"weekly_bl_allocation"`
	RevenueBand            string  `json:"revenue_band"`
	PersonaType            string  `json:"persona_type"`
	CatalogQualityScore    float64 `json:"catalog_quality_score"`
	TotalProducts          int     `json:"total_products"`
	ActiveCategories       int     `json:"active_categories"`
	AvgWeeklyLeads         float64 `json:"avg_weekly_leads"`
	AvgWeeklyLeadConsumption float64 `json:"avg_weekly_lead_consumption"`
	AvgResponseRate        float64 `json:"avg_response_rate"`
	AvgResponseTimeMins    float64 `json:"avg_response_time_mins"`
	PreferredPlatform      string  `json:"preferred_platform"`
	SellerRating           float64 `json:"seller_rating"`
	EngagementScore        float64 `json:"engagement_score"`
	SellerHealthScore      float64 `json:"seller_health_score"`
	ChurnRisk              string  `json:"churn_risk"`
	UpsellProbability      float64 `json:"upsell_probability"`
	LastActiveDaysAgo      int     `json:"last_active_days_ago"`
	NotificationOpenRate   float64 `json:"notification_open_rate"`
	SupportTicketCount     int     `json:"support_ticket_count"`
	PreferredMarket        string  `json:"preferred_market"`
	PrimaryCategory        string  `json:"primary_category"`
	SecondaryCategories    string  `json:"secondary_categories"`
}

// ─── Lead ────────────────────────────────────────────────────
type Lead struct {
	LeadID               string    `json:"lead_id"`
	Timestamp            time.Time `json:"timestamp"`
	BuyerCity            string    `json:"buyer_city"`
	BuyerState           string    `json:"buyer_state"`
	ProductName          string    `json:"product_name"`
	Category             string    `json:"category"`
	Subcategory          string    `json:"subcategory"`
	Quantity             int       `json:"quantity"`
	OrderValueRs         float64   `json:"order_value_rs"`
	BuyerType            string    `json:"buyer_type"`
	IntentScore          float64   `json:"intent_score"`
	LeadQuality          string    `json:"lead_quality"`
	Urgency              string    `json:"urgency"`
	BudgetRange          string    `json:"budget_range"`
	RequirementType      string    `json:"requirement_type"`
	BuyerEngagementScore float64   `json:"buyer_engagement_score"`
	GSTVerified          bool      `json:"gst_verified"`
	PreferredContact     string    `json:"preferred_contact"`
	LeadSource           string    `json:"lead_source"`
	Status               string    `json:"status"`
	ConsumedBy           *int64    `json:"consumed_by,omitempty"`
	ConsumedAt           *time.Time `json:"consumed_at,omitempty"`
	Routed               bool      `json:"routed"`
}

// ─── Seller Event ────────────────────────────────────────────
type SellerEvent struct {
	EventID     string    `json:"event_id"`
	Timestamp   time.Time `json:"timestamp"`
	SellerID    int64     `json:"seller_id"`
	CompanyName string    `json:"company_name"`
	PersonaType string    `json:"persona_type"`
	ServiceName string    `json:"service_name"`
	City        string    `json:"city"`
	EventType   string    `json:"event_type"`
	EventSource string    `json:"event_source"`
	EventValue  float64   `json:"event_value"`
	Metadata    string    `json:"metadata"`
}

// ─── Lead-Seller Match ──────────────────────────────────────
type LeadSellerMatch struct {
	LeadID            string  `json:"lead_id"`
	SellerID          int64   `json:"seller_id"`
	CompanyName       string  `json:"company_name"`
	SellerCategory    string  `json:"seller_category"`
	ServiceName       string  `json:"service_name"`
	SellerHealthScore float64 `json:"seller_health_score"`
	MatchScore        float64 `json:"match_score"`
}

// ─── Seller Behavior State (Mutable Intelligence) ───────────
type SellerBehaviorState struct {
	SellerID           int64     `json:"seller_id"`
	HealthScore        float64   `json:"health_score"`
	EngagementScore    float64   `json:"engagement_score"`
	ChurnRisk          string    `json:"churn_risk"`
	ResponseEfficiency float64   `json:"response_efficiency"`
	QuotaUtilization   float64   `json:"quota_utilization"`
	RoutingPriority    float64   `json:"routing_priority"`
	Recommendation     string    `json:"recommendation"`
	InterventionStatus string    `json:"intervention_status"`
	LastUpdated        time.Time `json:"last_updated"`
}

// ─── Lead Routing ────────────────────────────────────────────
type LeadRouting struct {
	ID           int       `json:"id"`
	LeadID       string    `json:"lead_id"`
	SellerID     int64     `json:"seller_id"`
	RoutingScore float64   `json:"routing_score"`
	RoutedAt     time.Time `json:"routed_at"`
	Status       string    `json:"status"`
	ConsumedAt   *time.Time `json:"consumed_at,omitempty"`
}

// ─── Seller Quota ────────────────────────────────────────────
type SellerQuota struct {
	SellerID          int64     `json:"seller_id"`
	ServiceName       string    `json:"service_name"`
	WeeklyAllocation  int       `json:"weekly_allocation"`
	DailyBonus        int       `json:"daily_bonus"`
	WeeklyConsumed    int       `json:"weekly_consumed"`
	DailyBonusConsumed int      `json:"daily_bonus_consumed"`
	WeekStartDate     time.Time `json:"week_start_date"`
	Remaining         int       `json:"remaining"`
}

// ─── Intervention ────────────────────────────────────────────
type Intervention struct {
	ID               int        `json:"id"`
	SellerID         int64      `json:"seller_id"`
	CompanyName      string     `json:"company_name,omitempty"`
	InterventionType string     `json:"intervention_type"`
	Reason           string     `json:"reason"`
	Priority         string     `json:"priority"`
	Status           string     `json:"status"`
	CreatedAt        time.Time  `json:"created_at"`
	ResolvedAt       *time.Time `json:"resolved_at,omitempty"`
}

// ─── WebSocket Messages ──────────────────────────────────────
type WSMessage struct {
	Type    string      `json:"type"`
	Channel string      `json:"channel"`
	Data    interface{} `json:"data"`
}

// ─── Routed Lead Packet (pushed to sellers via WS) ──────────
type LeadPacket struct {
	Lead         Lead              `json:"lead"`
	MatchScore   float64           `json:"match_score"`
	RoutingScore float64           `json:"routing_score"`
	RoutingID    int               `json:"routing_id"`
	SellerID     int64             `json:"seller_id"`
	CompanyName  string            `json:"company_name"`
	Recommendation string          `json:"recommendation"`
}

// ─── Dashboard Aggregates ────────────────────────────────────
type SellerDashboardData struct {
	Seller        Seller              `json:"seller"`
	BehaviorState SellerBehaviorState `json:"behavior_state"`
	Quota         SellerQuota         `json:"quota"`
	ActiveLeads   []LeadPacket        `json:"active_leads"`
	RecentEvents  []SellerEvent       `json:"recent_events"`
}

type SalesDashboardData struct {
	HighRiskSellers    []SellerBehaviorState `json:"high_risk_sellers"`
	LazySellerCount    int                   `json:"lazy_seller_count"`
	ChurningCount      int                   `json:"churning_count"`
	Interventions      []Intervention        `json:"interventions"`
	UpsellOpportunities []Seller             `json:"upsell_opportunities"`
	SellerSegmentation map[string]int        `json:"seller_segmentation"`
	TotalActiveSellers int                   `json:"total_active_sellers"`
	AvgHealthScore     float64               `json:"avg_health_score"`
	RecentActivity     []SellerEvent         `json:"recent_activity"`
}

type MonitoringData struct {
	QueueDepths        map[string]int `json:"queue_depths"`
	WSConnections      int            `json:"ws_connections"`
	EventsProcessed    int64          `json:"events_processed"`
	LeadsRouted        int64          `json:"leads_routed"`
	LeadsConsumed      int64          `json:"leads_consumed"`
	AvgRoutingTimeMs   float64        `json:"avg_routing_time_ms"`
	ActiveConsumers    int            `json:"active_consumers"`
	MutationCount      int64          `json:"mutation_count"`
	LockAcquisitions   int64          `json:"lock_acquisitions"`
	RecentEvents       []SystemEvent  `json:"recent_events"`
}

type SystemEvent struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// ─── Subscription Tier Config ────────────────────────────────
type SubscriptionTier struct {
	ServiceName      string
	WeeklyAllocation int
	DailyBonus       int
}

var SubscriptionTiers = map[string]SubscriptionTier{
	"Mini Dynamic Catalog (Monthly)": {ServiceName: "Mini Dynamic Catalog (Monthly)", WeeklyAllocation: 7, DailyBonus: 1},
	"Mini Dynamic Catalog (Annual)":  {ServiceName: "Mini Dynamic Catalog (Annual)", WeeklyAllocation: 10, DailyBonus: 1},
	"Trustseal Pro":                  {ServiceName: "Trustseal Pro", WeeklyAllocation: 14, DailyBonus: 1},
	"Maximiser Pro":                  {ServiceName: "Maximiser Pro", WeeklyAllocation: 21, DailyBonus: 1},
	"IM Star Pro":                    {ServiceName: "IM Star Pro", WeeklyAllocation: 30, DailyBonus: 1},
	"IM Leader Pro":                  {ServiceName: "IM Leader Pro", WeeklyAllocation: 40, DailyBonus: 1},
	"IM IL":                          {ServiceName: "IM IL", WeeklyAllocation: 70, DailyBonus: 2},
	"Free":                           {ServiceName: "Free", WeeklyAllocation: 0, DailyBonus: 0},
}
