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

  const sellerId = parseInt(id, 10);
  const { lastMessage } = useWebSocket(sellerId, []);

  const loadData = async () => {
    try {
      const res = await api.getSeller(sellerId);
      setData(res);
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
      setData(prev => prev ? { ...prev, behavior_state: lastMessage.data } : prev);
    } else if (lastMessage.type === 'LEAD_CONSUMED_SUCCESS') {
      // Refresh everything after consuming a lead — engagement + quota will update
      loadData();
    } else if (lastMessage.type === 'NEW_LEAD' || lastMessage.type === 'LEAD_UNAVAILABLE') {
      api.getSellerLeads(sellerId).then(res => setData(prev => prev ? { ...prev, active_leads: res.leads || [] } : prev));
    }
  }, [lastMessage, sellerId]);

  const consumeLead = async (leadId) => {
    try { await api.consumeLead(leadId, sellerId); } catch (e) { alert(e.message); }
  };

  // Top 3 ROI leads
  const bestLeads = useMemo(() => {
    if (!data?.active_leads?.length) return [];
    return [...data.active_leads].sort((a, b) => {
      const valDiff = (b.lead.order_value_rs || 0) - (a.lead.order_value_rs || 0);
      if (valDiff !== 0) return valDiff;
      return new Date(b.lead.timestamp || 0) - new Date(a.lead.timestamp || 0);
    }).slice(0, 3);
  }, [data?.active_leads]);

  const bestLeadIds = useMemo(() => new Set(bestLeads.map(l => l.routing_id)), [bestLeads]);

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
      {/* ─── Seller Header + Quota ─── */}
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Left: Company info */}
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.1 }}>
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

          {/* Right: Quota (prominent) */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            padding: '12px 24px', textAlign: 'center', minWidth: '200px',
            border: '1px solid var(--border-light)',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
              Weekly Consumption
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {quota.weekly_consumed || 0}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {quota.weekly_allocation || 0}</span>
            </div>
            <div className="progress-bar-track" style={{ marginTop: '8px', height: '6px' }}>
              <div className="progress-bar-fill" style={{
                width: `${quotaPercent}%`,
                background: quotaPercent > 80 ? 'linear-gradient(90deg, var(--im-orange), var(--im-red))' : 'linear-gradient(90deg, var(--im-blue), var(--im-blue-light))',
                height: '6px',
              }}></div>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {quotaPercent < 50 ? '🟢' : quotaPercent < 80 ? '🟡' : '🔴'} {Math.round(quotaPercent)}% used
            </div>
          </div>
        </div>

        {/* Details Bar */}
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

      {/* ─── Seller Intelligence: Scores Left + AI Coach Right ─── */}
      <Card title="Seller Intelligence" icon="🧠">
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr', gap: '0', minHeight: '200px' }}>
          {/* LEFT: Two horizontal scores */}
          <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={seller.catalog_quality_score || behavior_state.health_score} color="emerald" />
              <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Catalog Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.engagement_score} color="blue" />
              <div style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Engagement</div>
            </div>
          </div>

          {/* RIGHT: AI Coach (no refresh button — updates reactively) */}
          <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>✨</span>
              <span style={{ fontWeight: 700, color: 'var(--im-blue)', fontSize: '0.9rem' }}>AI Coach</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                Updates with your activity
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '14px' }}>
              {behavior_state.recommendation || "Maintain consistent activity to improve your lead match score and receive better quality leads."}
            </p>

            {/* Best ROI Leads */}
            {bestLeads.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem' }}>🏆</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--im-blue)' }}>Top ROI Leads — Respond in 10 min</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {bestLeads.map((l, idx) => (
                    <div key={l.routing_id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'white', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${idx === 0 ? 'var(--im-blue)' : 'var(--border-light)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, color: 'white', width: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                          background: idx === 0 ? 'var(--im-blue)' : idx === 1 ? 'var(--im-orange)' : 'var(--text-muted)',
                        }}>#{idx + 1}</span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{l.lead.product_name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            ₹{l.lead.order_value_rs?.toLocaleString()} • {l.lead.buyer_city}
                          </div>
                        </div>
                      </div>
                      <Button variant="primary" onClick={() => consumeLead(l.lead.lead_id)} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>⚡ Consume</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Full-Width BuyLeads (2 columns) ─── */}
      <Card title="Live BuyLeads" icon="📦" subtitle={`${active_leads?.length || 0} available`}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '12px',
          justifyContent: 'center',
        }}>
          {active_leads?.map((l, idx) => {
            const isBest = bestLeadIds.has(l.routing_id);
            const bestIdx = bestLeads.findIndex(b => b.routing_id === l.routing_id);
            const isLast = idx === active_leads.length - 1 && active_leads.length % 2 !== 0;
            return (
              <div key={l.routing_id} className="lead-card" style={{
                width: isLast ? 'calc(50% - 6px)' : 'calc(50% - 6px)',
                minWidth: '300px',
                ...(isBest ? { borderColor: 'var(--im-blue)', position: 'relative' } : {}),
              }}>
                {isBest && (
                  <div style={{
                    position: 'absolute', top: '-1px', right: '12px',
                    background: bestIdx === 0 ? 'var(--im-blue)' : bestIdx === 1 ? 'var(--im-orange)' : 'var(--text-muted)',
                    color: 'white', padding: '2px 10px', borderRadius: '0 0 6px 6px',
                    fontSize: '0.6rem', fontWeight: 700,
                  }}>🏆 #{bestIdx + 1} ROI</div>
                )}
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '8px' }}>{l.lead.product_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📍 {l.lead.buyer_city}, {l.lead.buyer_state}</span>
                  <span>📦 {l.lead.quantity} units</span>
                  <span>💰 ₹{l.lead.order_value_rs?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button variant="primary" onClick={() => consumeLead(l.lead.lead_id)}>Consume Lead →</Button>
                </div>
              </div>
            );
          })}
          {!active_leads?.length && (
            <div className="empty-state" style={{ width: '100%' }}>
              <div className="empty-state-icon">📡</div>
              <p>Listening for matching leads...</p>
              <span className="helper-text">Improve your lead match score to receive leads faster.</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SellerDashboard;
