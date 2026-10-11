import React from 'react';
import { RefreshCw } from 'lucide-react';

export function Header({ activePage, setActivePage }) {
  const getPageContext = () => {
    switch (activePage) {
      case 'overview': return { title: 'System Overview', section: 'MUNICIPALITY OF VADODARA' };
      case 'my-reports': return { title: 'My Submitted Reports', section: 'CITIZEN TRACKER' };
      case 'profile': return { title: 'Account Profile', section: 'CITIZEN SETTINGS' };
      case 'report': return { title: 'File a Report', section: 'CITIZEN PORTAL' };
      case 'response': return { title: 'Municipal Operations', section: 'DISPATCH DESK' };
      case 'login': return { title: 'Account Access', section: 'AUTHENTICATION PORTAL' };
      case 'register': return { title: 'Citizen Registration', section: 'AUTHENTICATION PORTAL' };
      default: return { title: 'FloodSignal', section: '' };
    }
  };

  const { title, section } = getPageContext();

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
      <div>
        <div className="text-[10px] md:text-xs font-semibold tracking-widest text-brand-500 uppercase mb-0.5">
          {section}
        </div>
        <h1 className="text-xl md:text-2xl font-editorial font-medium text-brand-900 leading-none">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Network Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface-50 border border-surface-200 rounded-full text-xs font-medium text-brand-700">
           <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse"></span>
           Live Feed Active
        </div>

        {setActivePage && (
          <button 
            type="button"
            onClick={() => setActivePage('landing')}
            className="text-xs font-medium text-brand-600 hover:text-brand-900 transition-colors hidden sm:block"
          >
            Public Site
          </button>
        )}
        
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>
    </header>
  );
}
