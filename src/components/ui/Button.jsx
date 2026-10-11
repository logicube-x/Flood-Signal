import React from 'react';

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-900 text-white hover:bg-brand-800 focus:ring-brand-900",
    secondary: "bg-white text-brand-900 border border-surface-200 hover:bg-surface-50 focus:ring-brand-900",
    danger: "bg-accent-red text-white hover:bg-accent-red/90 focus:ring-accent-red"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
