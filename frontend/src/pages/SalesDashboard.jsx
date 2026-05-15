import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

/* ── Event type icon & label mapping ─────────────────── */
const eventConfig = {
  login:           { icon: '🔑', label: 'Logged In',         css: 'login' },
  lead_response:   { icon: '📩', label: 'Responded to Lead', css: 'lead_response' },
  product_update:  { icon: '📦', label: 'Updated Product',   css: 'product_update' },
  catalog_update:  { icon: '🗂️', label: 'Updated Catalog',   css: 'catalog_update' },
  profile_update:  { icon: '👤', label: 'Updated Profile',   css: 'profile_update' },
  support_ticket:  { icon: '🎫', label: 'Raised Ticket',     css: 'support_ticket' },
};

const getEventConfig = (type) => eventConfig[type] || { icon: '📌', label: type, css: 'default' };

const formatTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/* ── Drill-down panel component ──────────────────────── */
const SellerDrilldown = ({ title, icon, sellers, onClose, loading }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!sellers) return [];
    if (!search.trim()) return sellers;
    const q = search.toLowerCase();
    return sellers.filter(s =>
      (s.company_name || '').toLowerCase().includes(q) ||
      String(s.seller_id).includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    );
  }, [sellers, search]);

  return (
    <div className="drilldown-panel animate-in">
      <div className="drilldown-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{title}</span>
          <span style={{
            background: 'var(--im-blue-lighter)', color: 'var(--im-blue)',
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600
          }}>{sellers?.length || 0} sellers</span>
        </div>
        <button className="drilldown-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Search */}
      <div className="search-input-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search by name, ID, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container" style={{ padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <span>Loading sellers...</span>
        </div>
      ) : (
        <>
          <div className="result-count">
            {filtered.length === sellers?.length
              ? `Showing all ${filtered.length} sellers`
              : `${filtered.length} of ${sellers?.length} sellers match your search`}
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((s) => (
              <div key={s.seller_id} className="seller-list-item">
                <div>
                  <Link to={`/seller/${s.seller_id}`}>{s.company_name || `Seller #${s.seller_id}`}</Link>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {s.city && `📍 ${s.city}`}
                    {s.health_score != null && ` • Health: ${Math.round(s.health_score)}`}
                    {s.engagement_score != null && ` • Engagement: ${Math.round(s.engagement_score)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {s.churn_risk && (s.churn_risk === 'High' || s.churn_risk === 'Medium') && (
                    <Badge type={s.churn_risk === 'High' ? 'high' : 'medium'}>{s.churn_risk} Risk</Badge>
                  )}
                  {s.persona_type && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>{s.persona_type}</span>
                  )}
                  <Link to={`/seller/${s.seller_id}`} style={{ fontSize: '0.75rem', color: 'var(--im-blue)', textDecoration: 'none' }}>
                    View →
                  </Link>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No sellers found matching "{search}"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Main Dashboard ──────────────────────────────────── */
const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket(null, ['sales']);

  // Drill-down state
  const [activeMetric, setActiveMetric] = useState(null); // 'active' | 'health' | 'churning' | 'lazy'
  const [drilldownSellers, setDrilldownSellers] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // High risk search
  const [highRiskSearch, setHighRiskSearch] = useState('');

  const loadData = async () => {
    try {
      const res = await api.getSalesDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'SELLER_STATE_CHANGE') {
      loadData();
    }
  }, [lastMessage]);

  const resolveIntervention = async (id) => {
    await api.resolveIntervention(id);
    loadData();
  };

  /* ── Metric card click handlers ──────────────────────── */
  const handleMetricClick = async (metricType) => {
    if (activeMetric === metricType) {
      setActiveMetric(null);
      setDrilldownSellers(null);
      return;
    }

    setActiveMetric(metricType);
    setDrilldownLoading(true);
    setDrilldownSellers(null);

    try {
      let res;
      switch (metricType) {
        case 'active':
          res = await api.getSellers('limit=100');
          break;
        case 'health':
          res = await api.getSellers('limit=100');
          break;
        case 'churning':
          res = await api.getSellers('persona=Churning Seller&limit=100');
          break;
        case 'lazy':
          res = await api.getSellers('persona=Lazy Seller&limit=100');
          break;
        default:
          res = { sellers: [] };
      }

      let sellers = res.sellers || [];

      // Sort by health score for the health metric view
      if (metricType === 'health') {
        sellers = [...sellers].sort((a, b) => a.health_score - b.health_score);
      }

      setDrilldownSellers(sellers);
    } catch (e) {
      console.error(e);
      setDrilldownSellers([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const drilldownConfig = {
    active:   { title: 'Total Active Sellers', icon: '👥' },
    health:   { title: 'Sellers by Health Score (lowest first)', icon: '💚' },
    churning: { title: 'High Risk — Churning Sellers', icon: '⚠️' },
    lazy:     { title: 'Lazy Sellers', icon: '💤' },
  };

  /* ── Filter high risk sellers ────────────────────────── */
  const filteredHighRisk = useMemo(() => {
    if (!data?.high_risk_sellers) return [];
    if (!highRiskSearch.trim()) return data.high_risk_sellers;
    const q = highRiskSearch.toLowerCase();
    return data.high_risk_sellers.filter(s =>
      String(s.seller_id).includes(q) ||
      String(Math.round(s.health_score)).includes(q)
    );
  }, [data?.high_risk_sellers, highRiskSearch]);

  if (loading || !data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading dashboard data...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Page Header ─── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="section-header">
              <div className="section-header-icon" style={{ background: 'var(--im-red-light)', color: 'var(--im-red)' }}>📊</div>
              <h1 className="section-title">Sales & Retention Console</h1>
            </div>
            <p className="section-subtitle" style={{ marginLeft: '42px' }}>Real-time ecosystem intelligence — click any metric to explore sellers</p>
          </div>
        </div>
      </div>

      {/* ─── Clickable KPI Metrics Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Active Sellers" value={data.total_active_sellers} type="blue" icon="👥"
          onClick={() => handleMetricClick('active')} active={activeMetric === 'active'}
        />
        <MetricCard
          title="Seller Health Score" value={`${Math.round(data.avg_health_score)}`} subvalue="/ 100 avg" type="emerald" icon="💚"
          onClick={() => handleMetricClick('health')} active={activeMetric === 'health'}
        />
        <MetricCard
          title="High Risk (Churning)" value={data.churning_count} type="rose" icon="⚠️"
          onClick={() => handleMetricClick('churning')} active={activeMetric === 'churning'}
        />
        <MetricCard
          title="Lazy Sellers" value={data.lazy_seller_count} type="amber" icon="💤"
          onClick={() => handleMetricClick('lazy')} active={activeMetric === 'lazy'}
        />
      </div>

      {/* ─── Drill-down panel (appears below metrics when one is clicked) ─── */}
      {activeMetric && (
        <SellerDrilldown
          title={drilldownConfig[activeMetric].title}
          icon={drilldownConfig[activeMetric].icon}
          sellers={drilldownSellers}
          loading={drilldownLoading}
          onClose={() => { setActiveMetric(null); setDrilldownSellers(null); }}
        />
      )}

      {/* ─── Two-Column Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Sellers — with search + scroll */}
        <Card title="High Risk Sellers" icon="🔴">
          {/* Search bar */}
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by seller ID or health score..."
              value={highRiskSearch}
              onChange={(e) => setHighRiskSearch(e.target.value)}
            />
          </div>

          {/* Scrollable list */}
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHighRisk.map((s) => (
              <div key={s.seller_id} className="seller-list-item">
                <div>
                  <Link to={`/seller/${s.seller_id}`}>
                    Seller #{s.seller_id}
                  </Link>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Health: {Math.round(s.health_score)} • Engagement: {Math.round(s.engagement_score)}
                  </div>
                </div>
                <Badge type="high">High Risk</Badge>
              </div>
            ))}
            {filteredHighRisk.length === 0 && data.high_risk_sellers?.length > 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No sellers match "{highRiskSearch}"
              </div>
            )}
            {!data.high_risk_sellers?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <p>No high risk sellers detected</p>
              </div>
            )}
          </div>
        </Card>

        {/* Pending Interventions */}
        <Card title="Pending Interventions" icon="🚨">
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.interventions?.map((inv) => (
              <div key={inv.id} className="intervention-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{inv.company_name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>ID: {inv.seller_id}</span>
                  </div>
                  <Badge type={inv.priority === 'CRITICAL' ? 'hot' : 'warm'}>{inv.priority}</Badge>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>{inv.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--im-red)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {inv.intervention_type}
                  </span>
                  <Button variant="primary" onClick={() => resolveIntervention(inv.id)}>✓ Mark Resolved</Button>
                </div>
              </div>
            ))}
            {!data.interventions?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <p>No pending interventions</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Enhanced Recent Activity Feed ─── */}
      <Card title="Recent Activity Feed" icon="📋" subtitle={`${data.recent_activity?.length || 0} recent events`}>
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.recent_activity?.map((act) => {
            const cfg = getEventConfig(act.event_type);
            return (
              <Link
                key={act.event_id}
                to={`/seller/${act.seller_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="activity-feed-item">
                  {/* Event icon */}
                  <div className={`activity-icon ${cfg.css}`}>
                    {cfg.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {act.company_name}
                      </span>
                      <span className="activity-event-badge">{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {act.city && `📍 ${act.city}`}
                      {act.persona_type && ` • ${act.persona_type}`}
                      {act.service_name && ` • ${act.service_name}`}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="activity-time">
                    {formatTime(act.timestamp)}
                  </div>
                </div>
              </Link>
            );
          })}
          {!data.recent_activity?.length && (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SalesDashboard;
