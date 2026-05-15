import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SalesDashboard from './pages/SalesDashboard';
import SellerDashboard from './pages/SellerDashboard';
import MonitoringDashboard from './pages/MonitoringDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
        {/* ─── Top Navigation ─── */}
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
            <NavLink to="/monitoring" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-link-icon">⚙️</span>
              System Health
            </NavLink>
          </div>

          <div className="nav-status">
          </div>
        </nav>

        {/* ─── Main Content ─── */}
        <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/sales" replace />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/seller/:id" element={<SellerDashboard />} />
            <Route path="/monitoring" element={<MonitoringDashboard />} />
          </Routes>
        </main>

        {/* ─── Footer ─── */}
        <footer className="footer">
          Powered by <strong style={{ color: 'var(--im-blue)' }}>IndiaMART</strong> — AI-driven Seller Intelligence &amp; BuyLead Orchestration
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
