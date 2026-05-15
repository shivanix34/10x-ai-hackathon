import React, { useEffect, useState } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge, LivePulse } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket(null, ['sales']);

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
      // Opt to reload data to keep things simple for dashboard
      loadData();
    }
  }, [lastMessage]);

  const resolveIntervention = async (id) => {
    await api.resolveIntervention(id);
    loadData();
  };

  if (loading || !data) return <div className="text-center p-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-rose to-accent-amber bg-clip-text text-transparent">
            Sales & Retention Console
          </h1>
          <p className="text-text-secondary mt-1">Real-time ecosystem intelligence</p>
        </div>
        <LivePulse />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Active Sellers" value={data.total_active_sellers} type="blue" />
        <MetricCard title="Avg Ecosystem Health" value={`${Math.round(data.avg_health_score)}/100`} type="emerald" />
        <MetricCard title="High Risk (Churning)" value={data.churning_count} type="rose" />
        <MetricCard title="Lazy Sellers" value={data.lazy_seller_count} type="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="High Risk Sellers">
          <div className="space-y-3">
            {data.high_risk_sellers?.map((s) => (
              <div key={s.seller_id} className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border-glass">
                <div>
                  <Link to={`/seller/${s.seller_id}`} className="font-semibold text-accent-blue hover:underline">
                    Seller ID: {s.seller_id}
                  </Link>
                  <div className="text-xs text-text-muted mt-1">Health: {Math.round(s.health_score)} • Eng: {Math.round(s.engagement_score)}</div>
                </div>
                <div className="text-right">
                  <Badge type="high">High Risk</Badge>
                </div>
              </div>
            ))}
            {!data.high_risk_sellers?.length && <p className="text-text-muted">No high risk sellers detected.</p>}
          </div>
        </Card>

        <Card title="Pending Interventions">
          <div className="space-y-3">
            {data.interventions?.map((inv) => (
              <div key={inv.id} className="p-4 rounded-lg bg-bg-secondary border border-accent-rose shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-white">{inv.company_name}</span>
                    <span className="text-xs text-text-muted ml-2">ID: {inv.seller_id}</span>
                  </div>
                  <Badge type={inv.priority === 'CRITICAL' ? 'hot' : 'warm'}>{inv.priority}</Badge>
                </div>
                <p className="text-sm text-text-secondary mb-3">{inv.reason}</p>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-semibold text-accent-rose">{inv.intervention_type}</div>
                  <Button variant="primary" onClick={() => resolveIntervention(inv.id)}>Mark Resolved</Button>
                </div>
              </div>
            ))}
            {!data.interventions?.length && <p className="text-text-muted">No pending interventions.</p>}
          </div>
        </Card>
      </div>

      <Card title="Recent Activity Feed">
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {data.recent_activity?.map((act) => (
            <div key={act.event_id} className="flex justify-between items-center text-sm p-2 hover:bg-bg-secondary rounded">
              <div>
                <span className="font-semibold text-accent-cyan">{act.company_name}</span>
                <span className="text-text-muted mx-2">did</span>
                <span className="text-white bg-bg-secondary px-2 py-1 rounded text-xs">{act.event_type}</span>
              </div>
              <div className="text-text-muted text-xs">
                {new Date(act.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SalesDashboard;
