import React from 'react';
import { Activity, Map, AlertTriangle, ShieldAlert, LogOut, User as UserIcon, Home, FileText, Settings } from 'lucide-react';
import { logout } from '../../lib/auth';

export function NavigationRail({ activePage, setActivePage, user, setUser }) {
  const navItems = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    ...(user ? [{ id: 'my-reports', icon: FileText, label: 'My Reports' }] : []),
    { id: 'report', icon: AlertTriangle, label: 'Report Incident' },
    ...(!user || user.role === 'responder' || user.role === 'admin' 
      ? [{ id: 'response', icon: ShieldAlert, label: 'Municipal Desk' }] 
      : [])
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setActivePage('landing');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="hidden md:flex flex-col w-20 lg:w-56 bg-brand-900 border-r border-brand-800 text-white shrink-0 shadow-xl z-20">
      <button 
        type="button"
        onClick={() => setActivePage('landing')}
        title="View Public Landing Page"
        className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-brand-800 hover:bg-brand-800/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent-teal flex items-center justify-center shadow-inner shrink-0">
            <Map className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:block">
            <span className="font-editorial font-semibold text-lg tracking-wide block leading-none">FloodSignal</span>
            <span className="text-[9px] text-brand-400 font-mono uppercase tracking-wider block mt-0.5">Public Site ↗</span>
          </div>
        </div>
      </button>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-3 lg:px-4">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col lg:flex-row items-center lg:justify-start justify-center gap-2 lg:gap-3 py-3 lg:py-2.5 px-2 lg:px-3 rounded transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-800 text-white' 
                  : 'text-brand-500 hover:bg-brand-800/50 hover:text-surface-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-accent-teal' : 'group-hover:text-surface-200'}`} />
              <span className="text-[10px] lg:text-sm font-medium tracking-wide lg:tracking-normal">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-brand-800 flex flex-col items-center lg:items-start gap-2.5">
        <button 
          type="button"
          onClick={() => setActivePage('landing')} 
          className="flex items-center gap-2 text-brand-400 hover:text-white transition-colors text-xs py-1 w-full justify-center lg:justify-start"
          title="Return to Public Landing Page"
        >
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline">Public Site</span>
        </button>
        {user ? (
          <>
            <button
              type="button"
              onClick={() => setActivePage('profile')}
              title="Manage Citizen Account"
              className={`flex items-center gap-2.5 w-full p-1.5 rounded transition-colors text-left group ${
                activePage === 'profile' ? 'bg-brand-800 text-white' : 'hover:bg-brand-800/40 text-brand-300'
              }`}
            >
               <div className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center text-xs font-semibold text-accent-teal border border-brand-700 shrink-0">
                 {user.name.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col min-w-0 hidden lg:block">
                 <span className="text-xs font-medium text-white truncate block">{user.name}</span>
                 <span className="text-[10px] text-brand-400 capitalize block">{user.role} · Profile</span>
               </div>
            </button>
            <div className="flex items-center justify-between w-full pt-1">
              <button 
                type="button"
                onClick={() => setActivePage('profile')} 
                className="hidden lg:flex items-center gap-1.5 text-brand-400 hover:text-white transition-colors text-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
              <button 
                type="button"
                onClick={handleLogout} 
                className="flex items-center gap-1.5 text-brand-400 hover:text-accent-red transition-colors text-xs"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setActivePage('login')} className="flex items-center justify-center lg:justify-start gap-2 w-full text-brand-500 hover:text-white transition-colors text-xs lg:text-sm py-2">
            <UserIcon className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden lg:inline font-medium">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
