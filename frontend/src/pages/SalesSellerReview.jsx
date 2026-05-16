import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button, ProgressRing } from '../components/ui/Button';

const SERVICE_REVENUE_MAP = {
  'Free': 0,
  'Mini Dynamic Catalog (Monthly)': 48000,
  'Mini Dynamic Catalog (Annual)': 32000,
  'Trustseal Pro': 50000,
  'Maximiser Pro': 75000,
  'IM Star Pro': 100000,
  'IM Leader Pro': 200000,
  'IM IL': 750000,
};

const formatRevenue = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${Math.round(val)}`;
};

const SalesSellerReview = () => {
  const { id } = useParams();
  const sellerId = parseInt(id, 10);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [sellerId]);

  const loadData = async () => {
    try {
      const [sellerRes, eventsRes] = await Promise.all([
        api.getSeller(sellerId),
        api.getSellerEvents(sellerId),
      ]);
      setData(sellerRes);
      setEvents(eventsRes.events || []);
      loadAnalysis();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await api.getSellerAnalysis(sellerId);
      if (res.analysis) setAnalysis(res.analysis);
    } catch (e) { console.error('[AI Analysis]', e); }
    finally { setAnalysisLoading(false); }
  };

  const handleBookmark = async () => {
    try {
      const reason = analysis?.reasons?.join('; ') || 'High churn risk — needs sales review';
      await api.bookmarkSeller(sellerId, reason);
      setBookmarked(true);
    } catch (e) { console.error(e); }
  };

  if (loading || !data) {
    return (<div className="loading-container"><div className="loading-spinner"></div><span>Loading seller analysis...</span></div>);
  }

  const { seller, behavior_state } = data;
  const trendColor = { declining: 'var(--im-red)', stable: 'var(--im-orange)', improving: 'var(--im-green)' };

  // Revenue estimation
  const estRevenue = SERVICE_REVENUE_MAP[seller.service_name] || 0;
  const churnProb = analysis?.churn_probability || 50;
  const weightedLoss = estRevenue * (churnProb / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/sales" style={{ color: 'var(--im-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Sales Console</Link>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Seller Review</span>
        </div>
        <button className={bookmarked ? 'btn-primary' : 'btn-outline'} onClick={handleBookmark} disabled={bookmarked}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {bookmarked ? '✅ Bookmarked' : '🔖 Bookmark for Intervention'}
        </button>
      </div>

      {/* Seller Header */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)', display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.1 }}>{seller.company_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>📍 {seller.city}, {seller.state}</span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span>🏷️ {seller.service_name}</span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span>📦 {seller.primary_category}</span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span>📅 {seller.years_active} years</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Badge type={behavior_state.churn_risk === 'High' ? 'high' : behavior_state.churn_risk === 'Medium' ? 'medium' : 'low'}>
            {behavior_state.churn_risk} Risk
          </Badge>
          <Badge type="active">{seller.persona_type}</Badge>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        {/* LEFT: Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="Performance Metrics" icon="📊">
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0' }}>
              {[
                { val: seller.catalog_quality_score, label: 'Catalog Score', color: 'emerald' },
                { val: behavior_state.engagement_score, label: 'Engagement', color: 'blue' },
                { val: behavior_state.response_efficiency, label: 'Response Rate', color: 'amber' },
                { val: behavior_state.quota_utilization, label: 'Quota Usage', color: 'cyan' },
              ].map((m, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <ProgressRing value={m.val} color={m.color} />
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              {[
                { label: 'Avg Response', value: `${seller.avg_response_time_mins?.toFixed(0) || '—'} min` },
                { label: 'Products', value: seller.total_products },
                { label: 'Rating', value: `${seller.seller_rating?.toFixed(1) || '—'} ★` },
                { label: 'Last Active', value: `${seller.last_active_days_ago}d ago` },
                { label: 'Support Tickets', value: seller.support_ticket_count },
                { label: 'Notif Open Rate', value: `${(seller.notification_open_rate)?.toFixed(0) || '—'}%` },
              ].map((s, i) => (
                <div key={i} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Card title="Seller Activity History" icon="📜" subtitle={`${events.length} events`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {events.slice(0, 40).map((e, i) => (
                <div key={i} className="event-log-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{e.event_type}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(e.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.metadata}</div>
                </div>
              ))}
              {events.length === 0 && <div className="empty-state"><p>No activity recorded</p></div>}
            </div>
          </Card>
          </div>
        </div>

        {/* RIGHT: AI Analysis + Interventions + Revenue Loss */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Churn Analysis */}
          <Card title="AI Churn Analysis" icon="🧠" subtitle="Powered by Gemini 2.5 Flash">
            {analysisLoading ? (
              <div className="loading-container" style={{ padding: '2rem' }}><div className="loading-spinner"></div><span>Analyzing seller data...</span></div>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trend</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: trendColor[analysis.trend] || 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {analysis.trend === 'declining' ? '📉' : analysis.trend === 'improving' ? '📈' : '➡️'} {analysis.trend}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: '16px', borderRadius: 'var(--radius-md)',
                    background: analysis.churn_probability > 60 ? 'var(--im-red-light)' : 'var(--im-amber-light)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Churn Probability</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysis.churn_probability > 60 ? 'var(--im-red)' : 'var(--im-orange-dark)' }}>{analysis.churn_probability}%</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>🔍 Root Causes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysis.reasons?.map((r, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--im-red-light)', borderLeft: '3px solid var(--im-red)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state"><p>Analysis unavailable</p><Button variant="outline" onClick={loadAnalysis}>🔄 Retry</Button></div>
            )}
          </Card>

          {/* Suggested Interventions */}
          <Card title="Suggested Interventions" icon="🎯" subtitle="AI-recommended actions">
            {analysis?.interventions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.interventions.map((action, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--im-blue-lighter)', borderLeft: '3px solid var(--im-blue)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <span style={{ marginRight: '8px' }}>✅</span>{action}
                  </div>
                ))}
                <button className={bookmarked ? 'btn-primary' : 'btn-orange'} onClick={handleBookmark} disabled={bookmarked}
                  style={{ width: '100%', padding: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {bookmarked ? '✅ Added to Pending Interventions' : '🔖 Add to Pending Interventions'}
                </button>
              </div>
            ) : analysisLoading ? (
              <div className="loading-container" style={{ padding: '1rem' }}><div className="loading-spinner"></div></div>
            ) : (
              <div className="empty-state"><p>No interventions available</p></div>
            )}
          </Card>

          {/* Estimated Revenue Loss */}
          <Card title="Estimated Revenue Impact" icon="💸">
            <div style={{ padding: '8px 0' }}>
              {estRevenue > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', borderLeft: '3px solid var(--im-blue)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Annual Subscription</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{seller.service_name}</div>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--im-blue)' }}>
                      {formatRevenue(estRevenue)}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>/yr</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--im-red-light)', borderLeft: '3px solid var(--im-red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expected Revenue Loss</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{formatRevenue(estRevenue)} × {churnProb}% churn</div>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--im-red)' }}>{formatRevenue(weightedLoss)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>📊</span>
                    <span>Revenue Band: <strong style={{ color: 'var(--text-secondary)' }}>{seller.revenue_band}</strong> — marketplace GMV impact in <strong>{seller.primary_category}</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🆓</div>
                  Free tier — no direct subscription revenue at risk.
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Revenue Band: <strong>{seller.revenue_band}</strong></div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesSellerReview;
