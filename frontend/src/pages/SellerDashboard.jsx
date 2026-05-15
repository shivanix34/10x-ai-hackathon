import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/Card';
import { Badge, LivePulse } from '../components/ui/Badge';
import { Button, ProgressRing } from '../components/ui/Button';

const SellerDashboard = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const sellerId = parseInt(id, 10);
  const { lastMessage, messages } = useWebSocket(sellerId, []);

  const loadData = async () => {
    try {
      const res = await api.getSeller(sellerId);
      setData(res);
    } catch (e) {
      console.error(e);
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

  if (loading || !data) return <div className="text-center p-12">Loading...</div>;

  const { seller, behavior_state, quota, active_leads } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{seller.company_name}</h1>
          <p className="text-text-secondary mt-1">
            {seller.city}, {seller.state} • <Badge type="active">{seller.persona_type}</Badge> • {seller.service_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={simulateLogin}>Simulate Login</Button>
          <LivePulse />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Intelligence Metrics */}
        <Card title="Behavioral Intelligence" className="col-span-1 md:col-span-2 glow-blue">
          <div className="flex justify-around items-center p-4">
            <div className="text-center">
              <ProgressRing value={behavior_state.health_score} color="text-accent-emerald" />
              <div className="mt-2 text-sm font-medium text-text-secondary">Health Score</div>
            </div>
            <div className="text-center">
              <ProgressRing value={behavior_state.engagement_score} color="text-accent-blue" />
              <div className="mt-2 text-sm font-medium text-text-secondary">Engagement</div>
            </div>
            <div className="text-center">
              <ProgressRing value={behavior_state.routing_priority} color="text-accent-amber" />
              <div className="mt-2 text-sm font-medium text-text-secondary">Routing Priority</div>
            </div>
          </div>
          
          {/* Claude AI Recommendation Box */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(59,130,246,0.15)] border border-[rgba(139,92,246,0.3)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✨</span>
              <span className="font-bold bg-gradient-to-r from-accent-violet to-accent-blue bg-clip-text text-transparent">
                Claude AI Coach
              </span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed">
              {behavior_state.recommendation || "Maintain consistent activity to improve your routing priority."}
            </p>
          </div>
        </Card>

        {/* Quota Tracker */}
        <Card title="Consumption Quota" className="col-span-1">
          <div className="flex flex-col items-center justify-center h-full pb-6">
            <div className="text-5xl font-bold text-white mb-2">
              {quota.consumed_weekly} <span className="text-2xl text-text-muted">/ {quota.weekly_limit}</span>
            </div>
            <div className="text-sm text-text-secondary mb-6">Weekly Leads Consumed</div>
            
            <div className="w-full bg-bg-secondary h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-accent-blue to-accent-cyan h-full transition-all duration-500"
                style={{ width: `${Math.min((quota.consumed_weekly / quota.weekly_limit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time BuyLeads Feed */}
        <Card title="Live BuyLeads" className="col-span-2">
          <div className="space-y-3">
            {active_leads?.map((l) => (
              <div key={l.routing_id} className="p-4 rounded-lg bg-bg-secondary border border-border-glass hover:border-accent-blue transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-white">{l.lead.product_name}</div>
                  <Badge type={l.lead.lead_quality}>{l.lead.lead_quality}</Badge>
                </div>
                <div className="text-sm text-text-muted mb-4">
                  {l.lead.buyer_city}, {l.lead.buyer_state} • {l.lead.quantity} units • ₹{l.lead.order_value_rs}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium text-accent-amber">Match Score: {Math.round(l.routing_score)}</div>
                  <Button variant="primary" onClick={() => consumeLead(l.lead.lead_id)}>Consume Lead</Button>
                </div>
              </div>
            ))}
            {!active_leads?.length && (
              <div className="text-center p-8 text-text-muted">
                <div className="animate-pulse mb-2">📡 Listening for matching leads...</div>
                <p className="text-xs">Improve your routing priority to receive leads faster.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card title="Activity Stream" className="col-span-1">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {messages.filter(m => m.type !== 'STATE_UPDATE' && m.type !== 'NEW_LEAD').map((m, i) => (
              <div key={i} className="text-xs p-2 rounded bg-bg-secondary border-l-2 border-accent-cyan">
                <div className="font-semibold text-text-secondary">{m.type}</div>
                <div className="mt-1 text-text-muted truncate">{JSON.stringify(m.data)}</div>
              </div>
            ))}
            {messages.length === 0 && <p className="text-text-muted text-sm">No recent WebSocket events.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
