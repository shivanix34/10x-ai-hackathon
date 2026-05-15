import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import SalesDashboard from './pages/SalesDashboard';
import SellerDashboard from './pages/SellerDashboard';
import MonitoringDashboard from './pages/MonitoringDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <nav className="nav-container gap-4">
          <div className="font-bold text-xl mr-8 bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">
            MarketplaceOS
          </div>
          <NavLink to="/sales" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Sales Console
          </NavLink>
          <NavLink to="/seller/64000001" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Seller Experience
          </NavLink>
          <NavLink to="/monitoring" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            System Health
          </NavLink>
        </nav>

        <main className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/sales" replace />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/seller/:id" element={<SellerDashboard />} />
            <Route path="/monitoring" element={<MonitoringDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
