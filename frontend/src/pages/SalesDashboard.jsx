import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

/* ── Fuzzy matching utility ──────────────────────────── */
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const fuzzyMatch = (text, query) => {
  if (!text || !query) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  // Exact substring match
  if (t.includes(q)) return true;
  // Word-level fuzzy: check each word in text against query
  const words = t.split(/[\s,]+/);
  const qWords = q.split(/[\s,]+/);
  return qWords.every(qw => {
    if (qw.length <= 1) return t.includes(qw);
    return words.some(w => {
      if (w.includes(qw) || qw.includes(w)) return true;
      // Allow edit distance proportional to word length
      const maxDist = qw.length <= 3 ? 1 : qw.length <= 6 ? 2 : 3;
      return levenshtein(w, qw) <= maxDist;
    });
  });
};

/* ── Drill-down panel ─────────────────────────────────── */
const SellerDrilldown = ({ title, icon, sellers, onClose, loading }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!sellers) return [];
    if (!search.trim()) return sellers;
    return sellers.filter(s => {
      const q = search.trim();
      // Match on seller_id
      if (String(s.seller_id).includes(q)) return true;
      // Fuzzy match on company name
      if (fuzzyMatch(s.company_name, q)) return true;
      // Fuzzy match on city / state (location)
      if (fuzzyMatch(s.city, q)) return true;
      if (fuzzyMatch(s.state, q)) return true;
      return false;
    });
  }, [sellers, search]);

  return (
    <div className="drilldown-panel animate-in">
      <div className="drilldown-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
        </div>
        <button className="drilldown-close" onClick={onClose}>✕</button>
      </div>
      <div className="search-input-wrap"><span className="search-icon">🔍</span>
        <input className="search-input" type="text" placeholder="Search by name, ID, or location..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="loading-container" style={{ padding: '2rem' }}><div className="loading-spinner"></div></div> : (
        <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(s => (
            <div key={s.seller_id} className="seller-list-item">
              <div>
                <Link to={`/sales/seller/${s.seller_id}`} style={{ fontWeight: 600, color: 'var(--im-blue)', textDecoration: 'none' }}>
                  {s.company_name || `Seller #${s.seller_id}`}
                </Link>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ID: {s.seller_id}{s.city ? ` • 📍 ${s.city}` : ''}{s.health_score != null ? ` • Health: ${Math.round(s.health_score)}` : ''}
                </div>
              </div>
              <Link to={`/sales/seller/${s.seller_id}`} style={{ fontSize: '0.75rem', color: 'var(--im-blue)', textDecoration: 'none' }}>Review →</Link>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No sellers found</div>}
        </div>
      )}
    </div>
  );
};

/* ── Config ───────────────────────────────────────────── */
const factorConfig = [
  { key: 'low_catalog', color: '#DC3545', label: 'Low Catalog' },
  { key: 'low_engagement', color: '#E8A500', label: 'Low Engagement' },
  { key: 'low_response', color: '#2B5F9E', label: 'Poor Response' },
  { key: 'low_quota', color: '#F0AD4E', label: 'Low Buylead Consumption' },
  { key: 'high_tickets', color: '#7C3AED', label: 'High Tickets' },
];

const formatRevenue = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${Math.round(val)}`;
};

/* ── Pie Chart (pure SVG) ─────────────────────────────── */
const PieChart = ({ factors, activeFactor, onSliceClick }) => {
  const total = factors.reduce((a, f) => a + f.count, 0) || 1;
  const size = 220;
  const cx = size / 2, cy = size / 2, r = 85;
  let cumAngle = -Math.PI / 2; // start at top

  const slices = factors.map((f, i) => {
    const cfg = factorConfig[i];
    const angle = (f.count / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const isActive = activeFactor === cfg.key;
    const expandR = isActive ? 8 : 0;
    const midAngle = startAngle + angle / 2;
    const tx = expandR * Math.cos(midAngle);
    const ty = expandR * Math.sin(midAngle);

    const d = `M ${cx} ${cy} L ${x1 + tx} ${y1 + ty} A ${r} ${r} 0 ${largeArc} 1 ${x2 + tx} ${y2 + ty} Z`;

    return { d, color: cfg.color, key: cfg.key, label: cfg.label, count: f.count, pct: ((f.count / total) * 100).toFixed(0), isActive, midAngle, tx, ty };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ cursor: 'pointer' }}>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color}
            opacity={s.isActive ? 1 : 0.8}
            stroke="white" strokeWidth="2"
            onClick={() => onSliceClick(s.key)}
            style={{ transition: 'opacity 0.2s', filter: s.isActive ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' : 'none' }}
          >
            <title>{s.label}: {s.count} ({s.pct}%)</title>
          </path>
        ))}
        {/* Center hole for donut */}
        <circle cx={cx} cy={cy} r="45" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="1.2rem" fontWeight="700" fill="var(--text-primary)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="0.55rem" fill="var(--text-muted)">Total Affected</text>
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        {slices.map((s, i) => (
          <div key={i} onClick={() => onSliceClick(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              padding: '3px 10px', borderRadius: '14px', fontSize: '0.72rem', fontWeight: 600,
              background: s.isActive ? `${s.color}20` : 'var(--bg-secondary)',
              border: s.isActive ? `2px solid ${s.color}` : '2px solid transparent',
              color: s.isActive ? s.color : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }}></span>
            {s.label} ({s.count})
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Dashboard ──────────────────────────────────── */
const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket(null, ['sales']);

  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownSellers, setDrilldownSellers] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [highRiskSearch, setHighRiskSearch] = useState('');
  const [interventionSearch, setInterventionSearch] = useState('');

  const [churnData, setChurnData] = useState(null);
  const [churnFactor, setChurnFactor] = useState(null);
  const [churnSellers, setChurnSellers] = useState(null);
  const [churnTotalLoss, setChurnTotalLoss] = useState(0);
  const [churnSellersLoading, setChurnSellersLoading] = useState(false);

  const loadData = async () => {
    try {
      const [dashRes, churnRes] = await Promise.all([api.getSalesDashboard(), api.getChurnAnalysis()]);
      setData(dashRes);
      setChurnData(churnRes);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (lastMessage?.type === 'SELLER_STATE_CHANGE') loadData(); }, [lastMessage]);

  const resolveIntervention = async (id) => { await api.resolveIntervention(id); loadData(); };
  const unbookmarkIntervention = async (id) => { await api.unbookmarkIntervention(id); loadData(); };

  const handleChurnFactorClick = async (factorKey) => {
    if (churnFactor === factorKey) { setChurnFactor(null); setChurnSellers(null); return; }
    setChurnFactor(factorKey);
    setChurnSellersLoading(true);
    try {
      const res = await api.getChurnSellers(factorKey);
      setChurnSellers(res.sellers || []);
      setChurnTotalLoss(res.total_revenue_loss || 0);
    } catch (e) { setChurnSellers([]); }
    finally { setChurnSellersLoading(false); }
  };

  const handleMetricClick = async (metricType) => {
    if (activeMetric === metricType) { setActiveMetric(null); setDrilldownSellers(null); return; }
    setActiveMetric(metricType);
    setDrilldownLoading(true);
    try {
      let res;
      switch (metricType) {
        case 'active': case 'health': res = await api.getSellers('limit=5000'); break;
        case 'churning': res = await api.getSellers('persona=Churning Seller&limit=5000'); break;
        case 'lazy': res = await api.getSellers('persona=Lazy Seller&limit=5000'); break;
        default: res = { sellers: [] };
      }
      let sellers = res.sellers || [];
      if (metricType === 'health') sellers = [...sellers].sort((a, b) => a.health_score - b.health_score);
      setDrilldownSellers(sellers);
    } catch (e) { setDrilldownSellers([]); }
    finally { setDrilldownLoading(false); }
  };

  const drilldownConfig = {
    active: { title: 'Total Active Sellers', icon: '👥' },
    health: { title: 'Sellers by Health', icon: '💚' },
    churning: { title: 'Churning Sellers', icon: '⚠️' },
    lazy: { title: 'Lazy Sellers', icon: '💤' },
  };

  const filteredHighRisk = useMemo(() => {
    if (!data?.high_risk_sellers) return [];
    if (!highRiskSearch.trim()) return data.high_risk_sellers;
    const q = highRiskSearch.toLowerCase();
    return data.high_risk_sellers.filter(s => String(s.seller_id).includes(q));
  }, [data?.high_risk_sellers, highRiskSearch]);

  const filteredInterventions = useMemo(() => {
    if (!data?.interventions) return [];
    if (!interventionSearch.trim()) return data.interventions;
    const q = interventionSearch.toLowerCase();
    return data.interventions.filter(inv => String(inv.seller_id).includes(q) || (inv.company_name || '').toLowerCase().includes(q));
  }, [data?.interventions, interventionSearch]);

  if (loading || !data) return <div className="loading-container"><div className="loading-spinner"></div><span>Loading...</span></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="section-header">
          <div className="section-header-icon" style={{ background: 'var(--im-red-light)', color: 'var(--im-red)' }}>📊</div>
          <h1 className="section-title">Sales Insights</h1>
        </div>
        <p className="section-subtitle" style={{ marginLeft: '42px' }}>Click any metric to drill down</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Active" value={data.total_active_sellers} type="blue" icon="👥" onClick={() => handleMetricClick('active')} active={activeMetric === 'active'} />
        <MetricCard title="Avg Health" value={`${Math.round(data.avg_health_score)}`} subvalue="/ 100" type="emerald" icon="💚" onClick={() => handleMetricClick('health')} active={activeMetric === 'health'} />
        <MetricCard title="Churning" value={data.churning_count} type="rose" icon="⚠️" onClick={() => handleMetricClick('churning')} active={activeMetric === 'churning'} />
        <MetricCard title="Lazy Sellers" value={data.lazy_seller_count} type="amber" icon="💤" onClick={() => handleMetricClick('lazy')} active={activeMetric === 'lazy'} />
      </div>

      {activeMetric && <SellerDrilldown title={drilldownConfig[activeMetric].title} icon={drilldownConfig[activeMetric].icon} sellers={drilldownSellers} loading={drilldownLoading} onClose={() => { setActiveMetric(null); setDrilldownSellers(null); }} />}

      {/* High Risk + Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="High Risk Sellers" icon="🔴">
          <div className="search-input-wrap"><span className="search-icon">🔍</span>
            <input className="search-input" type="text" placeholder="Search..." value={highRiskSearch} onChange={e => setHighRiskSearch(e.target.value)} />
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHighRisk.map(s => (
              <Link key={s.seller_id} to={`/sales/seller/${s.seller_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="seller-list-item" style={{ cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--im-blue)', fontSize: '0.85rem' }}>Seller #{s.seller_id}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Health: {Math.round(s.health_score)} • Engagement: {Math.round(s.engagement_score)}</div>
                  </div>
                  <Badge type="high">High Risk</Badge>
                </div>
              </Link>
            ))}
            {!data.high_risk_sellers?.length && <div className="empty-state"><div className="empty-state-icon">✅</div><p>No high risk sellers</p></div>}
          </div>
        </Card>

        <Card title="Pending Interventions" icon="🚨" subtitle={`${data.interventions?.length || 0} pending`}>
          <div className="search-input-wrap"><span className="search-icon">🔍</span>
            <input className="search-input" type="text" placeholder="Search..." value={interventionSearch} onChange={e => setInterventionSearch(e.target.value)} />
          </div>
          <div className="seller-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredInterventions.map(inv => (
              <div key={inv.id} className="intervention-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Link to={`/sales/seller/${inv.seller_id}`} style={{ fontWeight: 700, color: 'var(--im-blue)', textDecoration: 'none' }}>{inv.company_name || `Seller #${inv.seller_id}`}</Link>
                  <Badge type={inv.priority === 'CRITICAL' ? 'hot' : 'warm'}>{inv.priority}</Badge>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>{inv.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="btn-outline" style={{ padding: '5px 12px', fontSize: '0.75rem' }} onClick={() => unbookmarkIntervention(inv.id)}>🔖 Unbookmark</button>
                  <Button variant="primary" onClick={() => resolveIntervention(inv.id)}>✓ Resolved</Button>
                </div>
              </div>
            ))}
            {!data.interventions?.length && <div className="empty-state"><div className="empty-state-icon">🎉</div><p>No pending interventions</p></div>}
          </div>
        </Card>
      </div>

      {/* Churn Indicators: Pie Chart + Seller Table */}
      <Card title="Churn Indicators Analysis" icon="📉" subtitle={`${churnData?.total_high_risk || 0} high-risk sellers • Click any slice`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0', minHeight: '320px' }}>
          {/* LEFT: Pie Chart */}
          <div style={{ borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '16px' }}>
            {churnData?.factors?.length > 0 ? (
              <PieChart factors={churnData.factors} activeFactor={churnFactor} onSliceClick={handleChurnFactorClick} />
            ) : (
              <div className="empty-state"><p>No churn data</p></div>
            )}
          </div>

          {/* RIGHT: Seller Table */}
          <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
            {churnFactor ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingTop: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {factorConfig.find(f => f.key === churnFactor)?.label} Sellers
                  </div>
                  {churnTotalLoss > 0 && (
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--im-red)', background: 'var(--im-red-light)', padding: '3px 10px', borderRadius: '12px' }}>
                      Loss: {formatRevenue(churnTotalLoss)}/yr
                    </div>
                  )}
                </div>
                {churnSellersLoading ? (
                  <div className="loading-container" style={{ padding: '2rem' }}><div className="loading-spinner"></div></div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', padding: '6px 10px', fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-light)' }}>
                      <span>Seller</span><span style={{ textAlign: 'center' }}>Health</span><span style={{ textAlign: 'right' }}>Rev. Risk</span>
                    </div>
                    {churnSellers?.map(s => (
                      <Link key={s.seller_id} to={`/sales/seller/${s.seller_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px',
                          padding: '8px 10px', fontSize: '0.8rem', borderBottom: '1px solid var(--border-light)',
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--im-blue)', fontSize: '0.78rem' }}>{s.company_name || `#${s.seller_id}`}</div>
                            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>{s.service_name}</div>
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 600, color: s.health_score < 40 ? 'var(--im-red)' : 'var(--text-secondary)' }}>{Math.round(s.health_score)}</div>
                          <div style={{ textAlign: 'right', fontWeight: 600, color: s.est_revenue_loss > 0 ? 'var(--im-red)' : 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {s.est_revenue_loss > 0 ? formatRevenue(s.est_revenue_loss) : '—'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {(!churnSellers || churnSellers.length === 0) && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sellers</div>}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2rem' }}>👈</span>
                <span style={{ fontSize: '0.85rem' }}>Click a slice to view affected sellers</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SalesDashboard;
