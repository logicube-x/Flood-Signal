import React from 'react';
import { NavigationRail } from './NavigationRail';
import { MobileNav } from './MobileNav';
import { Header } from './Header';

export function Shell({ activePage, setActivePage, user, setUser, children }) {
  return (
    <div className="h-screen w-full flex bg-surface-50 overflow-hidden text-brand-900">
      <NavigationRail activePage={activePage} setActivePage={setActivePage} user={user} setUser={setUser} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header activePage={activePage} setActivePage={setActivePage} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:px-8 md:py-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
        
        <MobileNav activePage={activePage} setActivePage={setActivePage} user={user} setUser={setUser} />
      </div>
    </div>
  );
}
