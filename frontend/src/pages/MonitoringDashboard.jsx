import React, { useEffect, useState } from 'react';
import { api } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, MetricCard } from '../components/ui/Card';


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

  if (!data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading system metrics...</span>
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
              <div className="section-header-icon" style={{ background: 'var(--im-green-light)', color: 'var(--im-green)' }}>⚙️</div>
              <h1 className="section-title">System Telemetry</h1>
            </div>
            <p className="section-subtitle" style={{ marginLeft: '42px' }}>Real-time infrastructure monitoring & queue health</p>
          </div>
        </div>
      </div>

      {/* ─── KPI Metrics Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Leads Routed" value={data.leads_routed} type="emerald" icon="🚀" />
        <MetricCard title="Events Processed" value={data.events_processed} type="blue" icon="⚡" />
        <MetricCard title="Active Consumers" value={data.active_consumers} type="cyan" icon="🔗" />
        <MetricCard title="Active WS Conns" value={data.ws_connections} type="violet" icon="🔌" />
      </div>

      {/* ─── Queue Depths + Platform Metrics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RabbitMQ Queue Depths */}
        <Card title="RabbitMQ Queue Depths" icon="🐇">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(data.queue_depths).map(([q, depth]) => (
              <div key={q}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{q}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {depth} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>msgs</span>
                  </span>
                </div>
                <div className="queue-bar-track">
                  <div
                    className={`queue-bar-fill ${depth > 100 ? 'warning' : 'ok'}`}
                    style={{ width: `${Math.min((depth / 500) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform Metrics */}
        <Card title="Platform Metrics" icon="📊">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="platform-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--im-blue-lighter)', color: 'var(--im-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                }}>📥</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Leads Consumed</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{data.leads_consumed}</span>
            </div>

            <div className="platform-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--im-orange-light)', color: 'var(--im-orange-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                }}>🔄</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Behavior State Mutations</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{data.mutation_count}</span>
            </div>

            <div className="platform-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--im-green-light)', color: 'var(--im-green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                }}>🔐</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Redis Lock Acquisitions</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{data.lock_acquisitions}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
