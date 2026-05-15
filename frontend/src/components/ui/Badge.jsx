import React from 'react';

export const Badge = ({ children, type = 'hot' }) => {
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

