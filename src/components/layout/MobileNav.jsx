import React from 'react';
import { Home, Activity, AlertTriangle, ShieldAlert, FileText, User as UserIcon } from 'lucide-react';

export function MobileNav({ activePage, setActivePage, user }) {
  const navItems = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    ...(user ? [{ id: 'my-reports', icon: FileText, label: 'My Reports' }] : []),
    { id: 'report', icon: AlertTriangle, label: 'Report' },
    ...(user && (user.role === 'responder' || user.role === 'admin') 
      ? [{ id: 'response', icon: ShieldAlert, label: 'Desk' }] 
      : []),
    ...(user ? [{ id: 'profile', icon: UserIcon, label: 'Profile' }] : [{ id: 'landing', icon: Home, label: 'Home' }])
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-brand-900 border-t border-brand-800 text-brand-500 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? 'text-white' : 'hover:text-surface-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent-teal' : ''}`} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
