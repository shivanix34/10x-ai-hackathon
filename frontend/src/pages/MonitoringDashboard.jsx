import React, { useEffect, useState } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';
import { LivePulse } from '../components/ui/Badge';

const MonitoringDashboard = () => {
  const [data, setData] = useState(null);
  const { lastMessage } = useWebSocket(null, ['monitoring']);

  const loadData = async () => {
    try {
      const res = await api.getMonitoring();
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // refresh HTTP stats every 5s
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="text-center p-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">
            System Telemetry
          </h1>
          <p className="text-text-secondary mt-1">Real-time infrastructure monitoring</p>
        </div>
        <LivePulse />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Leads Routed" value={data.leads_routed} type="emerald" />
        <MetricCard title="Events Processed" value={data.events_processed} type="blue" />
        <MetricCard title="Active Consumers" value={data.active_consumers} type="cyan" />
        <MetricCard title="Active WS Conns" value={data.ws_connections} type="violet" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="RabbitMQ Queue Depths">
          <div className="space-y-4">
            {Object.entries(data.queue_depths).map(([q, depth]) => (
              <div key={q}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary font-mono">{q}</span>
                  <span className="font-bold text-white">{depth} msgs</span>
                </div>
                <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${depth > 100 ? 'bg-accent-rose' : 'bg-accent-emerald'}`}
                    style={{ width: `${Math.min((depth / 500) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Platform Metrics">
          <ul className="space-y-3">
            <li className="flex justify-between items-center p-3 rounded bg-bg-secondary">
              <span className="text-text-secondary">Leads Consumed</span>
              <span className="font-bold text-white text-lg">{data.leads_consumed}</span>
            </li>
            <li className="flex justify-between items-center p-3 rounded bg-bg-secondary">
              <span className="text-text-secondary">Behavior State Mutations</span>
              <span className="font-bold text-white text-lg">{data.mutation_count}</span>
            </li>
            <li className="flex justify-between items-center p-3 rounded bg-bg-secondary">
              <span className="text-text-secondary">Redis Lock Acquisitions</span>
              <span className="font-bold text-white text-lg">{data.lock_acquisitions}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
