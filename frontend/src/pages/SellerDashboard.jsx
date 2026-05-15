import React, { useEffect, useState } from 'react';
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
  
  const sellerId = parseInt(id, 10);
  const { lastMessage, messages } = useWebSocket(sellerId, []);

  const loadData = async () => {
    try {
      const res = await api.getSeller(sellerId);
      setData(res);
      console.log("[DEBUG] Seller Data:", res);
      
      // Fetch initial activity history
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

  useEffect(() => {
    loadData();
  }, [sellerId]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'STATE_UPDATE') {
      setData(prev => ({ ...prev, behavior_state: lastMessage.data }));
    } else if (lastMessage.type === 'NEW_LEAD' || lastMessage.type === 'LEAD_UNAVAILABLE' || lastMessage.type === 'LEAD_CONSUMED_SUCCESS') {
      // Reload leads and quota on specific lead events
      api.getSellerLeads(sellerId).then(res => {
        setData(prev => ({ ...prev, active_leads: res.leads || [] }));
      });
      api.getSellerQuota(sellerId).then(res => {
        setData(prev => ({ ...prev, quota: res }));
      });
    }
  }, [lastMessage, sellerId]);

  const consumeLead = async (leadId) => {
    try {
      await api.consumeLead(leadId, sellerId);
    } catch (e) {
      alert(e.message);
    }
  };

  const simulateLogin = () => {
    api.simulateEvent({ seller_id: sellerId, event_type: 'login', event_value: 1 });
  };

  if (loading || !data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading seller details...</span>
        {error && <div className="text-red-500 mt-4">Error: {error}</div>}
      </div>
    );
  }

  const { seller, behavior_state, quota, active_leads } = data;
  const quotaPercent = Math.min(((quota.weekly_consumed || 0) / (quota.weekly_allocation || 1)) * 100, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Seller Header ─── */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }}>
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
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={simulateLogin}>Simulate Login</Button>
        </div>
      </div>

      {/* ─── Intelligence + Quota Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Behavioral Intelligence */}
        <Card title="Behavioral Intelligence" icon="🧠" className="col-span-1 md:col-span-2">
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.health_score} color="emerald" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Health Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.engagement_score} color="blue" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Engagement</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ProgressRing value={behavior_state.routing_priority} color="amber" />
              <div style={{ marginTop: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Routing Priority</div>
            </div>
          </div>

          {/* AI Recommendation Box */}
          <div className="ai-recommendation" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>✨</span>
              <span style={{ fontWeight: 700, color: 'var(--im-blue)', fontSize: '0.9rem' }}>
                AI Coach Recommendation
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {behavior_state.recommendation || "Maintain consistent activity to improve your routing priority and receive better quality leads."}
            </p>
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
              <div
                className="progress-bar-fill"
                style={{
                  width: `${quotaPercent}%`,
                  background: quotaPercent > 80
                    ? 'linear-gradient(90deg, var(--im-orange), var(--im-red))'
                    : 'linear-gradient(90deg, var(--im-blue), var(--im-blue-light))'
                }}
              ></div>
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
            {active_leads?.map((l) => (
              <div key={l.routing_id} className="lead-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{l.lead.product_name}</div>
                  <Badge type={l.lead.lead_quality}>{l.lead.lead_quality}</Badge>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📍 {l.lead.buyer_city}, {l.lead.buyer_state}</span>
                  <span>📦 {l.lead.quantity} units</span>
                  <span>💰 ₹{l.lead.order_value_rs}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--im-orange-dark)',
                    background: 'var(--im-orange-light)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-xl)'
                  }}>
                    Match Score: {Math.round(l.routing_score)}
                  </div>
                  <Button variant="primary" onClick={() => consumeLead(l.lead.lead_id)}>Consume Lead →</Button>
                </div>
              </div>
            ))}
            {!active_leads?.length && (
              <div className="empty-state">
                <div className="empty-state-icon">📡</div>
                <p style={{ marginBottom: '4px' }}>Listening for matching leads...</p>
                <span className="helper-text">Improve your routing priority to receive leads faster.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Activity Stream */}
        <Card title="Activity Stream" icon="📜" className="col-span-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Real-time WebSocket messages merged with history */}
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
