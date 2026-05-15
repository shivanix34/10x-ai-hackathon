import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const classMap = {
    primary: 'btn-primary',
    danger: 'btn-danger',
    orange: 'btn-orange',
    outline: 'btn-outline',
  };
  const baseClass = classMap[variant] || 'btn-primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const ProgressRing = ({ value, max = 100, radius = 44, stroke = 6, color = 'blue' }) => {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / max) * circumference;

  const colorMap = {
    blue: 'var(--im-blue)',
    'text-accent-blue': 'var(--im-blue)',
    emerald: 'var(--im-green)',
    'text-accent-emerald': 'var(--im-green)',
    amber: 'var(--im-orange)',
    'text-accent-amber': 'var(--im-orange)',
    rose: 'var(--im-red)',
    'text-accent-rose': 'var(--im-red)',
    cyan: 'var(--im-blue-light)',
    'text-accent-cyan': 'var(--im-blue-light)',
    violet: '#7C3AED',
    'text-accent-violet': '#7C3AED',
  };

  const strokeColor = colorMap[color] || 'var(--im-blue)';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          className="progress-ring-bg"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontSize: '1.2rem'
      }}>
        {Math.round(value)}
      </div>
    </div>
  );
};
