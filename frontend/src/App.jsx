import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SalesDashboard from './pages/SalesDashboard';
import SellerDashboard from './pages/SellerDashboard';
import SalesSellerReview from './pages/SalesSellerReview';
import MonitoringDashboard from './pages/MonitoringDashboard';

function App() {
  const [showMonitoring, setShowMonitoring] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
        {/* ─── Top Navigation (only Sales + Seller) ─── */}
        <nav className="nav-container">
          <div className="nav-logo">
            <img src="/indiamart.png" alt="IndiaMART" className="nav-logo-img" />
            <div>
              <div className="nav-logo-text">IndiaMART</div>
              <span className="nav-logo-sub">Intelligence Platform</span>
            </div>
          </div>

          <div className="nav-links">
            <NavLink to="/sales" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-link-icon">📊</span>
              Sales Console
            </NavLink>
            <NavLink to="/seller/64000001" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-link-icon">🏪</span>
              Seller Experience
            </NavLink>
          </div>

          <div className="nav-status">
            <div className="live-badge">
              <span className="live-dot"></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--im-green)' }}>Live</span>
            </div>
          </div>
        </nav>

        {/* ─── Main Content ─── */}
        <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/sales" replace />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/sales/seller/:id" element={<SalesSellerReview />} />
            <Route path="/seller/:id" element={<SellerDashboard />} />
          </Routes>
        </main>

        {/* ─── Footer ─── */}
        <footer className="footer">
          Powered by <strong style={{ color: 'var(--im-blue)' }}>IndiaMART</strong> — AI-driven Seller Intelligence &amp; BuyLead Orchestration
        </footer>

        {/* ─── Floating System Health Button ─── */}
        <button
          className="floating-health-btn"
          onClick={() => setShowMonitoring(!showMonitoring)}
          title="System Health"
        >
          ⚙️
        </button>

        {/* ─── System Health Overlay ─── */}
        {showMonitoring && (
          <>
            <div className="monitoring-overlay" onClick={() => setShowMonitoring(false)} />
            <div className="monitoring-panel animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>⚙️ System Health</h2>
                <button className="drilldown-close" onClick={() => setShowMonitoring(false)}>✕</button>
              </div>
              <MonitoringDashboard />
            </div>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
