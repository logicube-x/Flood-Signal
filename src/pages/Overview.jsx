import React from 'react';
import { Badge } from '../components/ui/Badge';
import { Clock, Map as MapIcon, ArrowUpRight, User as UserIcon } from 'lucide-react';
import { IncidentMap } from '../components/map/IncidentMap';
import { EnvironmentalContextWidget } from '../components/EnvironmentalContextWidget';
import { VADODARA_CENTER } from '../lib/config';

export function Overview({ setActivePage, incidents, user }) {
  const sortedIncidents = [...incidents].sort((a, b) => {
    if (b._priority.score !== a._priority.score) {
      return (b._priority?.score || 0) - (a._priority?.score || 0);
    }
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  const activeCount = incidents.filter(i => i.status !== 'Resolved').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;
  const criticalCount = incidents.filter(i => i.status !== 'Resolved' && (i._priority?.label || '').toLowerCase() === 'critical').length;

  const getPriorityBadgeVariant = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'critical' || l === 'high') return 'danger';
    if (l === 'moderate' || l === 'medium') return 'warning';
    return 'success';
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Top Metrics Row - Editorial Style */}
      <div className="flex flex-col sm:flex-row bg-white border border-surface-200 shadow-sm shrink-0">
        <div className="flex-1 p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-surface-200">
          <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse"></span>
            Active Incidents
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-editorial font-medium text-brand-900">{activeCount}</span>
            <span className="text-sm font-medium text-accent-amber">Elevated</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-surface-200 bg-surface-50/50">
          <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-1.5">Resolved Today</p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-editorial font-medium text-brand-900">{resolvedCount}</span>
            <span className="text-sm font-medium text-accent-teal">On Track</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-6">
          <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red"></span>
            Critical Priority
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-editorial font-medium text-accent-red">{criticalCount}</span>
            <span className="text-sm font-medium text-brand-600">Action Required</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        
        {/* Map Area */}
        <div className="w-full lg:w-2/3 flex flex-col h-[500px] lg:h-full bg-white border border-surface-200 shadow-sm relative">
           <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent-teal via-brand-500 to-brand-900 z-0"></div>
           <IncidentMap incidents={incidents} onReportClick={() => setActivePage('report')} />
        </div>

        {/* Priority Queue & Environmental Context Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* Environmental Context Widget */}
          <EnvironmentalContextWidget coords={{ lat: VADODARA_CENTER[0], lng: VADODARA_CENTER[1] }} />

          {/* Priority Queue Area */}
          <div className="flex-1 flex flex-col min-h-[350px] bg-white border border-surface-200 shadow-sm relative">
            <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-editorial font-medium text-lg text-brand-900 leading-tight">Priority Queue</h3>
                <p className="text-[10px] text-brand-500 uppercase tracking-wider mt-0.5">Live Incident Feed</p>
              </div>
              <Badge variant="default" className="bg-white">{sortedIncidents.length} Total</Badge>
            </div>
          
          <ul className="flex-1 overflow-y-auto divide-y divide-surface-200 no-scrollbar">
            {sortedIncidents.map(report => {
              const pLabel = report._priority?.label || 'low';
              const isMine = user && report.authorId === user.id;
              
              return (
                <li key={report.id} className={`p-4 hover:bg-surface-50/80 transition-colors group cursor-pointer border-l-2 ${isMine ? 'border-accent-teal bg-surface-50/30' : 'border-transparent hover:border-brand-900'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-medium text-sm pr-3 leading-tight ${report._priority?.isStale ? 'text-brand-700 opacity-70' : 'text-brand-900'} ${report.status === 'Resolved' ? 'line-through text-brand-400' : ''}`}>
                      {report.title}
                    </span>
                    <Badge variant={getPriorityBadgeVariant(pLabel)} className="shrink-0">
                      {report._priority?.score || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-brand-500 justify-between">
                    <span className="flex items-center gap-3">
                       <span className="flex items-center"><Clock className="h-3 w-3 mr-1 opacity-70" /> {report.time}</span>
                       {isMine && <span className="flex items-center text-accent-teal font-medium"><UserIcon className="w-3 h-3 mr-1" /> Your Report</span>}
                    </span>
                    <div className="flex items-center gap-2">
                       {report._priority?.isStale && <span className="text-accent-red font-semibold text-[10px] uppercase tracking-wide">Stale</span>}
                       <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </li>
              );
            })}
            {sortedIncidents.length === 0 && (
              <li className="p-8 text-center text-brand-500 text-sm">
                No active incidents.
              </li>
            )}
          </ul>
        </div>
        </div>

      </div>
    </div>
  );
}
