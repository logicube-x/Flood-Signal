import React from 'react';

/**
 * FloodSignal Brand Logo Component
 * Combines water waves with a radar/signal beacon pulse, symbolizing real-time flood monitoring.
 *
 * @param {string} size - 'sm' (24px), 'md' (32px), 'lg' (40px), 'xl' (48px)
 * @param {string} variant - 'default' (dark navy bg + teal/amber wave) | 'light' (teal bg + white wave) | 'minimal' (icon only)
 * @param {string} className - extra classes
 */
export function BrandLogo({ size = 'md', variant = 'default', className = '' }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const boxClass = sizeMap[size] || sizeMap.md;

  if (variant === 'minimal') {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${boxClass} ${className}`}
        aria-label="FloodSignal Logo"
      >
        {/* Beacon radar broadcast rings */}
        <path
          d="M10 10C13.3137 6.68629 18.6863 6.68629 22 10"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M6 6C11.5228 0.477153 20.4772 0.477153 26 6"
          stroke="#14b8a6"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.5"
        />
        
        {/* Signal beacon source dot */}
        <circle cx="16" cy="13" r="2.5" fill="#f59e0b" />

        {/* Flood dynamic water crest waves */}
        <path
          d="M4 22C7 20 10 24 13 22C16 20 19 24 22 22C25 20 28 24 30 22"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 27C7 25 10 29 13 27C16 25 19 29 22 27C25 25 28 29 30 27"
          stroke="#14b8a6"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const bgClasses = {
    default: 'bg-brand-900 border border-brand-800 shadow-inner',
    light: 'bg-accent-teal shadow-sm',
    accent: 'bg-surface-50 border border-surface-200'
  };

  return (
    <div
      className={`${boxClass} rounded-md flex items-center justify-center shrink-0 ${bgClasses[variant] || bgClasses.default} ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5/6 h-5/6"
        aria-hidden="true"
      >
        {/* Radar concentric signal waves */}
        <path
          d="M9 11C12.866 7.13401 19.134 7.13401 23 11"
          stroke={variant === 'light' ? '#ffffff' : '#14b8a6'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 7C11.0751 0.924868 20.9249 0.924868 27 7"
          stroke={variant === 'light' ? '#ffffff' : '#14b8a6'}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.6"
        />

        {/* Alert/sensor beacon node */}
        <circle
          cx="16"
          cy="14"
          r="2.5"
          fill={variant === 'light' ? '#ffffff' : '#f59e0b'}
        />

        {/* Flood water surge waves */}
        <path
          d="M4 21C7.5 19 10.5 23 14 21C17.5 19 20.5 23 24 21C26.5 19.5 28.5 22 30 21"
          stroke={variant === 'light' ? '#ffffff' : '#38bdf8'}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 26C7.5 24 10.5 28 14 26C17.5 24 20.5 28 24 26C26.5 24.5 28.5 27 30 26"
          stroke={variant === 'light' ? 'rgba(255,255,255,0.7)' : '#14b8a6'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
