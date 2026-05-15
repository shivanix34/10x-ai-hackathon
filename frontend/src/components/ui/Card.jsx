import React from 'react';

export const Card = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`glass-card animate-in ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export const MetricCard = ({ title, value, subvalue, trend, type = 'blue' }) => {
  return (
    <div className={`metric-card glow-${type}`}>
      <div className="text-sm font-medium text-text-secondary mb-1">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-white">{value}</div>
        {subvalue && <div className="text-sm text-text-muted">{subvalue}</div>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 font-medium ${trend > 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </div>
      )}
    </div>
  );
};
