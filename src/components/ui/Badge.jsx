import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const baseClasses = "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider border";
  
  const variants = {
    default: "bg-surface-100 text-brand-700 border-surface-200",
    success: "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
    warning: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    danger:  "bg-accent-red/10 text-accent-red border-accent-red/20"
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
