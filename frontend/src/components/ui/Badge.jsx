import React from 'react';

export const Badge = ({ children, type = 'hot' }) => {
  // Map our data values to CSS classes defined in index.css
  const colorMap = {
    'hot': 'badge-hot',
    'warm': 'badge-warm',
    'cold': 'badge-cold',
    'high': 'badge-high',
    'medium': 'badge-medium',
    'low': 'badge-low',
    'active': 'badge-low',
    'pending': 'badge-warm',
    'resolved': 'badge-cold'
  };
  
  const className = colorMap[type.toLowerCase()] || 'badge-cold';
  
  return (
    <span className={`badge ${className}`}>
      {children}
    </span>
  );
};

export const LivePulse = () => {
  return (
    <div className="flex items-center gap-2">
      <span className="live-dot"></span>
      <span className="text-xs font-semibold text-accent-emerald tracking-wider uppercase">Live</span>
    </div>
  );
};
