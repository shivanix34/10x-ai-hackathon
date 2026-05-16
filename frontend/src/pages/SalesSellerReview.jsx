import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button, ProgressRing } from '../components/ui/Button';

const SalesSellerReview = () => {
  const { id } = useParams();
  const sellerId = parseInt(id, 10);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const loadData = async () => {
    try {
      const [sellerRes, eventsRes] = await Promise.all([
        api.getSeller(sellerId),
        api.getSellerEvents(sellerId),
      ]);
      setData(sellerRes);
      setEvents(eventsRes.events || []);
      loadAnalysis();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await api.getSellerAnalysis(sellerId);
      if (res.analysis) setAnalysis(res.analysis);
    } catch (e) {
      console.error('[AI Analysis]', e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleBookmark = async () => {
    try {
      const reason = analysis?.reasons?.join('; ') || 'High churn risk — needs sales review';
      await api.bookmarkSeller(sellerId, reason);
      setBookmarked(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading seller analysis...</span>
      </div>
    );
  }

  const { seller, behavior_state } = data;

  // Compute event distribution for display
  const eventCounts = {};
  events.forEach(e => {
    const t = e.event_type || 'other';
    eventCounts[t] = (eventCounts[t] || 0) + 1;
  });

  const trendColor = {
    declining: 'var(--im-red)',
    stable: 'var(--im-orange)',
    improving: 'var(--im-green)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Breadcrumb + Bookmark ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/sales" style={{ color: 'var(--im-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to Sales Console
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Seller Review</span>
        </div>
        <button
          className={bookmarked ? 'btn-primary' : 'btn-outline'}
          onClick={handleBookmark}
          disabled={bookmarked}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {bookmarked ? '✅ Bookmarked' : '🔖 Bookmark for Intervention'}
        </button>
      </div>

      {/* ─── Seller Identity Header ─── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)', display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {seller.company_name}
          </h1>
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

      {/* ─── Two Column Layout ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ─── LEFT: Seller Performance ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Metrics */}
          <Card title="Performance Metrics" icon="📊">
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <ProgressRing value={seller.catalog_quality_score} color="emerald" />
                <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Catalog Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ProgressRing value={behavior_state.engagement_score} color="blue" />
                <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Engagement</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ProgressRing value={behavior_state.response_efficiency} color="amber" />
                <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Response Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ProgressRing value={behavior_state.quota_utilization} color="cyan" />
                <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Quota Usage</div>
              </div>
            </div>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              {[
                { label: 'Avg Response', value: `${seller.avg_response_time_mins?.toFixed(0) || '—'} min` },
                { label: 'Products', value: seller.total_products },
                { label: 'Rating', value: `${seller.seller_rating?.toFixed(1) || '—'} ★` },
                { label: 'Last Active', value: `${seller.last_active_days_ago}d ago` },
                { label: 'Support Tickets', value: seller.support_ticket_count },
                { label: 'Notif Open Rate', value: `${(seller.notification_open_rate * 100)?.toFixed(0) || '—'}%` },
              ].map((s, i) => (
                <div key={i} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Stream */}
          <Card title="Seller Activity History" icon="📜" subtitle={`${events.length} events`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {events.slice(0, 40).map((e, i) => (
                <div key={i} className="event-log-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{e.event_type}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(e.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.metadata}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="empty-state"><p>No activity recorded</p></div>
              )}
            </div>
          </Card>
        </div>

        {/* ─── RIGHT: AI Analysis + Interventions ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* AI Churn Analysis */}
          <Card title="AI Churn Analysis" icon="🧠" subtitle="Powered by Gemini 2.5 Flash">
            {analysisLoading ? (
              <div className="loading-container" style={{ padding: '2rem' }}>
                <div className="loading-spinner"></div>
                <span>Analyzing seller data...</span>
              </div>
            ) : analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Trend + Probability */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{
                    flex: 1, padding: '16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trend</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: trendColor[analysis.trend] || 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {analysis.trend === 'declining' ? '📉' : analysis.trend === 'improving' ? '📈' : '➡️'} {analysis.trend}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: '16px', borderRadius: 'var(--radius-md)',
                    background: analysis.churn_probability > 60 ? 'var(--im-red-light)' : 'var(--im-amber-light)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Churn Probability</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysis.churn_probability > 60 ? 'var(--im-red)' : 'var(--im-orange-dark)' }}>
                      {analysis.churn_probability}%
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>🔍 Root Causes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {analysis.reasons?.map((r, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--im-red-light)', borderLeft: '3px solid var(--im-red)',
                        fontSize: '0.8rem', color: 'var(--text-secondary)',
                      }}>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Analysis unavailable</p>
                <Button variant="outline" onClick={loadAnalysis}>🔄 Retry</Button>
              </div>
            )}
          </Card>

          {/* Suggested Interventions */}
          <Card title="Suggested Interventions" icon="🎯" subtitle="AI-recommended actions">
            {analysis?.interventions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.interventions.map((action, i) => (
                  <div key={i} style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--im-blue-lighter)', borderLeft: '3px solid var(--im-blue)',
                    fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5,
                  }}>
                    <span style={{ marginRight: '8px' }}>✅</span>{action}
                  </div>
                ))}
                <div style={{ marginTop: '8px' }}>
                  <button
                    className={bookmarked ? 'btn-primary' : 'btn-orange'}
                    onClick={handleBookmark}
                    disabled={bookmarked}
                    style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {bookmarked ? '✅ Added to Pending Interventions' : '🔖 Add to Pending Interventions'}
                  </button>
                </div>
              </div>
            ) : analysisLoading ? (
              <div className="loading-container" style={{ padding: '1rem' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="empty-state"><p>No interventions available</p></div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesSellerReview;
