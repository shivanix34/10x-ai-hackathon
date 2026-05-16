import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

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

      <div className="search-input-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input" type="text"
          placeholder="Search by name, ID, or city..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container" style={{ padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <span>Loading sellers...</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {filtered.length === sellers?.length
              ? `Showing all ${filtered.length} sellers`
              : `${filtered.length} of ${sellers?.length} sellers match your search`}
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((s) => (
              <div key={s.seller_id} className="seller-list-item">
                <div>
                  <Link to={`/sales/seller/${s.seller_id}`} style={{ fontWeight: 600, color: 'var(--im-blue)', textDecoration: 'none' }}>
                    {s.company_name || `Seller #${s.seller_id}`}
                  </Link>
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
                  <Link to={`/sales/seller/${s.seller_id}`} style={{ fontSize: '0.75rem', color: 'var(--im-blue)', textDecoration: 'none' }}>
                    Review →
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

/* ── Churn factor colors ─────────────────────────────── */
const factorColors = [
  'var(--im-red)', 'var(--im-orange)', 'var(--im-blue)',
  'var(--im-amber)', '#7C3AED'
];
const factorIcons = ['📋', '💤', '⏱️', '📉', '🎫'];

/* ── Main Dashboard ──────────────────────────────────── */
const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket(null, ['sales']);

  // Drill-down state
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownSellers, setDrilldownSellers] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Search states
  const [highRiskSearch, setHighRiskSearch] = useState('');
  const [interventionSearch, setInterventionSearch] = useState('');

  // Churn analysis
  const [churnData, setChurnData] = useState(null);

  const loadData = async () => {
    try {
      const [dashRes, churnRes] = await Promise.all([
        api.getSalesDashboard(),
        api.getChurnAnalysis(),
      ]);
      setData(dashRes);
      setChurnData(churnRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'SELLER_STATE_CHANGE') loadData();
  }, [lastMessage]);

  const resolveIntervention = async (id) => {
    await api.resolveIntervention(id);
    loadData();
  };

  const unbookmarkIntervention = async (id) => {
    await api.unbookmarkIntervention(id);
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
        case 'active': res = await api.getSellers('limit=100'); break;
        case 'health': res = await api.getSellers('limit=100'); break;
        case 'churning': res = await api.getSellers('persona=Churning Seller&limit=100'); break;
        case 'lazy': res = await api.getSellers('persona=Lazy Seller&limit=100'); break;
        default: res = { sellers: [] };
      }
      let sellers = res.sellers || [];
      if (metricType === 'health') sellers = [...sellers].sort((a, b) => a.health_score - b.health_score);
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

  /* ── Filters ────────────────────────────────────────── */
  const filteredHighRisk = useMemo(() => {
    if (!data?.high_risk_sellers) return [];
    if (!highRiskSearch.trim()) return data.high_risk_sellers;
    const q = highRiskSearch.toLowerCase();
    return data.high_risk_sellers.filter(s =>
      String(s.seller_id).includes(q) ||
      String(Math.round(s.health_score)).includes(q)
    );
  }, [data?.high_risk_sellers, highRiskSearch]);

  const filteredInterventions = useMemo(() => {
    if (!data?.interventions) return [];
    if (!interventionSearch.trim()) return data.interventions;
    const q = interventionSearch.toLowerCase();
    return data.interventions.filter(inv =>
      String(inv.seller_id).includes(q) ||
      (inv.company_name || '').toLowerCase().includes(q) ||
      String(Math.round(inv.health_score || 0)).includes(q)
    );
  }, [data?.interventions, interventionSearch]);

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

      {/* ─── KPI Metrics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Active Sellers" value={data.total_active_sellers} type="blue" icon="👥"
          onClick={() => handleMetricClick('active')} active={activeMetric === 'active'} />
        <MetricCard title="Avg Health Score" value={`${Math.round(data.avg_health_score)}`} subvalue="/ 100" type="emerald" icon="💚"
          onClick={() => handleMetricClick('health')} active={activeMetric === 'health'} />
        <MetricCard title="High Risk (Churning)" value={data.churning_count} type="rose" icon="⚠️"
          onClick={() => handleMetricClick('churning')} active={activeMetric === 'churning'} />
        <MetricCard title="Lazy Sellers" value={data.lazy_seller_count} type="amber" icon="💤"
          onClick={() => handleMetricClick('lazy')} active={activeMetric === 'lazy'} />
      </div>

      {/* ─── Drill-down panel ─── */}
      {activeMetric && (
        <SellerDrilldown
          title={drilldownConfig[activeMetric].title}
          icon={drilldownConfig[activeMetric].icon}
          sellers={drilldownSellers}
          loading={drilldownLoading}
          onClose={() => { setActiveMetric(null); setDrilldownSellers(null); }}
        />
      )}

      {/* ─── Two-Column: High Risk + Interventions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Sellers */}
        <Card title="High Risk Sellers" icon="🔴">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" type="text"
              placeholder="Search by seller ID or health score..."
              value={highRiskSearch} onChange={(e) => setHighRiskSearch(e.target.value)} />
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHighRisk.map((s) => (
              <Link key={s.seller_id} to={`/sales/seller/${s.seller_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="seller-list-item" style={{ cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--im-blue)', fontSize: '0.85rem' }}>
                      Seller #{s.seller_id}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Health: {Math.round(s.health_score)} • Engagement: {Math.round(s.engagement_score)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge type="high">High Risk</Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--im-blue)' }}>Review →</span>
                  </div>
                </div>
              </Link>
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
        <Card title="Pending Interventions" icon="🚨" subtitle={`${data.interventions?.length || 0} pending`}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" type="text"
              placeholder="Search by seller ID or name..."
              value={interventionSearch} onChange={(e) => setInterventionSearch(e.target.value)} />
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredInterventions.map((inv) => (
              <div key={inv.id} className="intervention-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <Link to={`/sales/seller/${inv.seller_id}`} style={{ fontWeight: 700, color: 'var(--im-blue)', fontSize: '0.9rem', textDecoration: 'none' }}>
                      {inv.company_name || `Seller #${inv.seller_id}`}
                    </Link>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>ID: {inv.seller_id}</span>
                  </div>
                  <Badge type={inv.priority === 'CRITICAL' ? 'hot' : 'warm'}>{inv.priority}</Badge>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>{inv.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--im-red)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {inv.intervention_type}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-outline" style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                      onClick={() => unbookmarkIntervention(inv.id)}>
                      🔖 Unbookmark
                    </button>
                    <Button variant="primary" onClick={() => resolveIntervention(inv.id)}>✓ Resolved</Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredInterventions.length === 0 && data.interventions?.length > 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No interventions match "{interventionSearch}"
              </div>
            )}
            {!data.interventions?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <p>No pending interventions</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Churn Analysis (replaces Recent Activity) ─── */}
      <Card title="Churn Indicators Analysis" icon="📉" subtitle={`${churnData?.total_high_risk || 0} high-risk sellers analyzed`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {churnData?.factors?.map((f, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>{factorIcons[i] || '📌'}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{f.factor}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.count} sellers</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '12px',
                    background: f.percentage > 50 ? 'var(--im-red-light)' : f.percentage > 25 ? 'var(--im-amber-light)' : 'var(--im-green-light)',
                    color: f.percentage > 50 ? 'var(--im-red)' : f.percentage > 25 ? '#B45309' : 'var(--im-green)',
                  }}>
                    {f.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{
                  width: `${Math.min(f.percentage, 100)}%`,
                  background: factorColors[i] || 'var(--im-blue)',
                }}></div>
              </div>
            </div>
          ))}
          {(!churnData?.factors || churnData.factors.length === 0) && (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>No churn data available yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SalesDashboard;
