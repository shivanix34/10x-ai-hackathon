import React from 'react';

const iconMap = {
  blue: '👥',
  emerald: '💚',
  rose: '⚠️',
  amber: '💤',
  cyan: '🔗',
  violet: '🔌',
};

export const Card = ({ children, className = '', title, subtitle, icon }) => {
  return (
    <div className={`glass-card animate-in ${className}`}>
      {(title || subtitle) && (
        <div className="card-header">
          <div className="card-title">
            {icon && <span className="card-title-icon">{icon}</span>}
            {title}
          </div>
          {subtitle && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
};

export const MetricCard = ({ title, value, subvalue, trend, type = 'blue', icon, onClick, active }) => {
  const defaultIcon = icon || iconMap[type] || '📈';
  const isClickable = !!onClick;

  return (
    <div
      className={`metric-card type-${type} animate-in ${isClickable ? 'metric-card-clickable' : ''} ${active ? 'metric-card-active' : ''}`}
      onClick={onClick}
      style={isClickable ? { cursor: 'pointer' } : {}}
    >
      <div className={`metric-icon type-${type}`}>
        {defaultIcon}
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {value}
        </div>
        {subvalue && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subvalue}</div>}
      </div>
      {trend && (
        <div style={{
          fontSize: '0.75rem',
          marginTop: '8px',
          fontWeight: 600,
          color: trend > 0 ? 'var(--im-green)' : 'var(--im-red)',
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </div>
      )}
      {isClickable && (
        <div style={{ fontSize: '0.7rem', color: 'var(--im-blue)', marginTop: '8px', fontWeight: 500 }}>
          Click to view details →
        </div>
      )}
    </div>
  );
};
