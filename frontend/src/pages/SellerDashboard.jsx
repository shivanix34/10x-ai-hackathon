import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button, ProgressRing } from '../components/ui/Button';

const SellerDashboard = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  const sellerId = parseInt(id, 10);
  const { lastMessage, messages } = useWebSocket(sellerId, []);

  const loadData = async () => {
    try {
      const res = await api.getSeller(sellerId);
      setData(res);

      const eventsRes = await api.getSellerEvents(sellerId);
      setActivity(eventsRes.events || []);

      setError(null);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [sellerId]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'STATE_UPDATE') {
      setData(prev => ({ ...prev, behavior_state: lastMessage.data }));
    } else if (lastMessage.type === 'NEW_LEAD' || lastMessage.type === 'LEAD_UNAVAILABLE' || lastMessage.type === 'LEAD_CONSUMED_SUCCESS') {
      api.getSellerLeads(sellerId).then(res => setData(prev => ({ ...prev, active_leads: res.leads || [] })));
      api.getSellerQuota(sellerId).then(res => setData(prev => ({ ...prev, quota: res })));
    }
  }, [lastMessage, sellerId]);

  const consumeLead = async (leadId) => {
    try { await api.consumeLead(leadId, sellerId); } catch (e) { alert(e.message); }
  };

  const refreshRecommendation = async () => {
    setRecLoading(true);
    try {
      // Pass leads data to AI for best-ROI suggestion
      const leadsPayload = data?.active_leads || [];
      const res = await api.generateRecommendation(sellerId);
      if (res.recommendation) {
        setData(prev => ({
          ...prev,
          behavior_state: { ...prev.behavior_state, recommendation: res.recommendation }
        }));
      }
    } catch (e) { console.error(e); }
    finally { setRecLoading(false); }
  };

  // Compute the best ROI lead (highest order value among available leads)
  const bestLead = useMemo(() => {
    if (!data?.active_leads?.length) return null;
    return [...data.active_leads].sort((a, b) => {
      // Sort by order value desc, then by recency
      const valDiff = (b.lead.order_value_rs || 0) - (a.lead.order_value_rs || 0);
      if (valDiff !== 0) return valDiff;
      return new Date(b.lead.timestamp || 0) - new Date(a.lead.timestamp || 0);
    })[0];
  }, [data?.active_leads]);

  if (loading || !data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading seller details...</span>
        {error && <div style={{ color: 'var(--im-red)', marginTop: '12px' }}>Error: {error}</div>}
      </div>
    );
  }

  const { seller, behavior_state, quota, active_leads } = data;
  const quotaPercent = Math.min(((quota.weekly_consumed || 0) / (quota.weekly_allocation || 1)) * 100, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Seller Header (no Simulate Login — shows seller details instead) ─── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {seller.company_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>📍 {seller.city}, {seller.state}</span>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <Badge type="active">{seller.persona_type}</Badge>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span>🏷️ {seller.service_name}</span>
            </div>
          </div>
          <div className="live-badge">
            <span className="live-dot"></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--im-green)' }}>Live</span>
          </div>
        </div>

        {/* Seller Details Bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px', marginTop: '16px', paddingTop: '14px',
          borderTop: '1px solid var(--border-light)',
        }}>
          {[
            { icon: '📅', label: 'Years on IM', value: `${seller.years_active} yrs` },
            { icon: '📦', label: 'Category', value: seller.primary_category || 'N/A' },
            { icon: '🏢', label: 'Business', value: seller.business_type || 'N/A' },
            { icon: '🛍️', label: 'Products', value: seller.total_products },
            { icon: '⭐', label: 'Rating', value: `${seller.seller_rating?.toFixed(1) || '—'} ★` },
            { icon: '💰', label: 'Revenue', value: seller.revenue_band || 'N/A' },
          ].map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem' }}>{d.icon}</span>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.label}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Intelligence + Quota Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Behavioral Intelligence — renamed metrics */}
        <Card title="Seller Intelligence" icon="🧠" className="col-span-1 md:col-span-2">
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={seller.catalog_quality_score || behavior_state.health_score} color="emerald" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Catalog Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.engagement_score} color="blue" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Engagement</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.routing_priority} color="amber" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Lead Match Score</div>
            </div>
          </div>

          {/* AI Coach Recommendation */}
          <div className="ai-recommendation" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span>
                <span style={{ fontWeight: 700, color: 'var(--im-blue)', fontSize: '0.9rem' }}>AI Coach</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                  Gemini 2.5 Flash
                </span>
              </div>
              <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                onClick={refreshRecommendation} disabled={recLoading}>
                {recLoading ? '⏳...' : '🔄 Refresh'}
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0' }}>
              {behavior_state.recommendation || "Maintain consistent activity to improve your lead match score and receive better quality leads."}
            </p>

            {/* Best ROI Lead Suggestion */}
            {bestLead && (
              <div style={{
                marginTop: '12px', padding: '12px 16px',
                background: 'white', borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(43, 95, 158, 0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem' }}>🏆</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--im-blue)' }}>Best ROI Lead</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {bestLead.lead.product_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span>💰 ₹{bestLead.lead.order_value_rs?.toLocaleString()}</span>
                  <span>📦 {bestLead.lead.quantity} units</span>
                  <span>📍 {bestLead.lead.buyer_city}</span>
                  <span>⏱️ Respond within 10 min for best conversion</span>
                </div>
                <Button variant="primary" onClick={() => consumeLead(bestLead.lead.lead_id)}>
                  ⚡ Consume Best Lead →
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Quota Tracker */}
        <Card title="Consumption Quota" icon="📈" className="col-span-1">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: '2.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {quota.weekly_consumed || 0}
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {quota.weekly_allocation || 0}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 20px' }}>Weekly Leads Consumed</div>

            <div className="progress-bar-track" style={{ marginBottom: '8px' }}>
              <div className="progress-bar-fill" style={{
                width: `${quotaPercent}%`,
                background: quotaPercent > 80
                  ? 'linear-gradient(90deg, var(--im-orange), var(--im-red))'
                  : 'linear-gradient(90deg, var(--im-blue), var(--im-blue-light))'
              }}></div>
            </div>
            <div className="helper-text">
              {quotaPercent < 50 ? '🟢' : quotaPercent < 80 ? '🟡' : '🔴'}
              {Math.round(quotaPercent)}% used this week
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Leads + Activity Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live BuyLeads Feed */}
        <Card title="Live BuyLeads" icon="📦" className="col-span-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {active_leads?.map((l) => {
              const isBest = bestLead && l.routing_id === bestLead.routing_id;
              return (
                <div key={l.routing_id} className="lead-card" style={isBest ? {
                  borderColor: 'var(--im-blue)', boxShadow: '0 0 0 1px var(--im-blue), var(--shadow-sm)',
                  position: 'relative',
                } : {}}>
                  {isBest && (
                    <div style={{
                      position: 'absolute', top: '-1px', right: '12px',
                      background: 'var(--im-blue)', color: 'white',
                      padding: '2px 10px', borderRadius: '0 0 6px 6px',
                      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em',
                    }}>🏆 BEST ROI</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{l.lead.product_name}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>📍 {l.lead.buyer_city}, {l.lead.buyer_state}</span>
                    <span>📦 {l.lead.quantity} units</span>
                    <span>💰 ₹{l.lead.order_value_rs?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      color: 'var(--im-orange-dark)', background: 'var(--im-orange-light)',
                      padding: '3px 10px', borderRadius: 'var(--radius-xl)'
                    }}>
                      Match Score: {Math.round(l.routing_score)}
                    </div>
                    <Button variant="primary" onClick={() => consumeLead(l.lead.lead_id)}>Consume Lead →</Button>
                  </div>
                </div>
              );
            })}
            {!active_leads?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">📡</div>
                <p style={{ marginBottom: '4px' }}>Listening for matching leads...</p>
                <span className="helper-text">Improve your lead match score to receive leads faster.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Activity Stream */}
        <Card title="Activity Stream" icon="📜" className="col-span-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {[...messages.filter(m => m.type !== 'STATE_UPDATE' && m.type !== 'NEW_LEAD'), ...activity].slice(0, 50).map((m, i) => (
              <div key={i} className="event-log-item">
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '4px' }}>{m.type || m.event_type}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.data ? JSON.stringify(m.data) : (m.metadata || m.event_value)}
                </div>
              </div>
            ))}
            {messages.length === 0 && activity.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
