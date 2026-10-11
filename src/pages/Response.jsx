import React, { useState, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IncidentMap } from '../components/map/IncidentMap';
import { Search, Filter, ShieldCheck, Clock, MapPin, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { updateReportStatus } from '../lib/api';

export function Response({ incidents, onUpdateIncident }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const filteredIncidents = useMemo(() => {
    let filtered = [...incidents];
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.id.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => filterStatus === 'active' ? i.status !== 'Resolved' : i.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(i => i._priority?.label === filterPriority);
    }

    return filtered.sort((a, b) => {
      if (b._priority?.score !== a._priority?.score) return (b._priority?.score || 0) - (a._priority?.score || 0);
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [incidents, search, filterStatus, filterPriority]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const handleStatusChange = async (updates) => {
    if (!selectedIncidentId) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateReportStatus(selectedIncidentId, updates);
      onUpdateIncident(selectedIncidentId, updated);
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 border border-surface-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
            <input 
              type="text" 
              placeholder="Search ID or location..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-brand-900 focus:border-brand-900 transition-shadow text-brand-900 placeholder:text-brand-400"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 text-xs font-medium bg-surface-50 border border-surface-200 rounded-sm px-2 outline-none focus:ring-1 focus:ring-brand-900 text-brand-700">
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="Pending Crew">Pending</option>
            <option value="Investigating">Investigating</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-brand-500">
          <ShieldCheck className="w-4 h-4 text-accent-teal" />
          Dispatch Operations
          <span className="bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded-sm border border-accent-amber/20 ml-2">DEV MODE</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[500px]">
        {/* Left Col: High Density Queue */}
        <div className="w-full lg:w-5/12 flex flex-col h-full bg-white border border-surface-200 shadow-sm">
          <div className="flex bg-surface-100 border-b border-surface-200 p-2 text-[10px] uppercase tracking-wider font-semibold text-brand-600 shrink-0">
            <div className="w-12 text-center">Score</div>
            <div className="flex-1 px-2">Incident</div>
            <div className="w-20 text-right pr-2">Status</div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-brand-400">
                <Filter className="h-6 w-6 mb-2 opacity-50" />
                <p className="text-xs">No matching reports.</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-100">
                {filteredIncidents.map(inc => {
                  const isSelected = selectedIncidentId === inc.id;
                  const pLabel = inc._priority?.label || 'low';
                  return (
                    <li 
                      key={inc.id} 
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className={`flex items-center p-2 cursor-pointer transition-colors border-l-2 ${isSelected ? 'bg-surface-50 border-brand-900' : 'bg-white border-transparent hover:bg-surface-50/50'}`}
                    >
                      <div className="w-12 flex justify-center">
                        <Badge variant={pLabel === 'critical' || pLabel === 'high' ? 'danger' : pLabel === 'medium' ? 'warning' : 'success'}>
                          {inc._priority?.score || 0}
                        </Badge>
                      </div>
                      <div className="flex-1 px-3 min-w-0">
                        <p className={`text-sm font-medium truncate ${inc.status === 'Resolved' ? 'text-brand-400 line-through' : 'text-brand-900'}`}>{inc.title}</p>
                        <p className="text-[10px] text-brand-500 truncate flex items-center gap-1.5 mt-0.5">
                           <Clock className="w-3 h-3" /> {inc.time}
                           {inc.verified && <CheckCircle2 className="w-3 h-3 text-accent-teal ml-1" />}
                        </p>
                      </div>
                      <div className="w-20 text-right pr-2">
                        <span className={`text-[9px] uppercase font-semibold tracking-wider ${inc.status === 'Resolved' ? 'text-brand-400' : 'text-brand-700'}`}>
                          {inc.status === 'Pending Crew' ? 'Pending' : inc.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Col: Details & Map */}
        <div className="w-full lg:w-7/12 flex flex-col h-[500px] lg:h-full gap-4">
          <div className="h-1/2 lg:h-2/5 border border-surface-200 bg-surface-100 shadow-sm relative isolate">
            <IncidentMap 
              incidents={filteredIncidents} 
              selectedIncidentId={selectedIncidentId} 
              onIncidentClick={setSelectedIncidentId} 
            />
            {!selectedIncidentId && (
              <div className="absolute inset-0 z-[400] bg-surface-100/60 backdrop-blur-sm flex items-center justify-center">
                 <div className="bg-white px-4 py-2 border border-surface-200 text-sm font-medium text-brand-700 shadow-sm">
                   Select an incident to view location
                 </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-white border border-surface-200 shadow-sm overflow-y-auto relative p-6">
            {isUpdating && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[500] flex items-center justify-center font-medium">Updating...</div>}
            {updateError && <div className="absolute top-0 inset-x-0 bg-accent-red text-white text-xs p-2 text-center z-[501]">{updateError}</div>}
            
            {selectedIncident ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-start pb-4 border-b border-surface-200 mb-5">
                  <div>
                    <h2 className="text-2xl font-editorial font-medium text-brand-900 mb-1 leading-tight">{selectedIncident.title}</h2>
                    <p className="text-[10px] text-brand-500 font-mono tracking-widest uppercase">ID: {selectedIncident.id}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={selectedIncident._priority?.label === 'critical' || selectedIncident._priority?.label === 'high' ? 'danger' : 'success'} className="text-sm px-2 py-1">
                      Score {selectedIncident._priority?.score || 0}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h5 className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-3">Field Report</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Depth</span>
                        <span className="font-medium text-brand-900">{selectedIncident.depth} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Citizen Severity</span>
                        <span className="font-medium text-brand-900 capitalize">{selectedIncident.severity}</span>
                      </div>
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Road Blocked</span>
                        <span className="font-medium text-brand-900">{selectedIncident.roadBlocked ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Verification</span>
                        <span className={`font-medium ${selectedIncident.verified ? 'text-accent-teal' : 'text-accent-amber'}`}>
                          {selectedIncident.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-3">System Priority Rules</h5>
                    <ul className="space-y-1.5 text-xs text-brand-700 bg-surface-50 p-3 border border-surface-200">
                      {(selectedIncident._priority?.explanation || []).map((exp, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-brand-400 mt-0.5">•</span>
                          <span className="leading-tight">{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-8">
                  <h5 className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-2">Description</h5>
                  <p className="text-brand-800 text-sm leading-relaxed">
                    {selectedIncident.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-auto pt-5 border-t border-surface-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {!selectedIncident.verified && (
                       <Button size="sm" variant="secondary" onClick={() => handleStatusChange({ verified: true })} disabled={isUpdating} className="w-full sm:w-auto">
                         <ShieldCheck className="w-4 h-4 mr-2" /> Mark as Verified
                       </Button>
                    )}
                    {selectedIncident.verified && <div className="text-xs font-medium text-accent-teal flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Officially Verified</div>}
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      {['Investigating', 'Resolved'].map(status => {
                         if (selectedIncident.status === status && status === 'Resolved') return null; // hide if already resolved completely
                         const isActive = selectedIncident.status === status;
                         return (
                           <Button 
                             key={status} size="sm" disabled={isUpdating}
                             variant={isActive ? 'primary' : 'secondary'}
                             onClick={() => handleStatusChange({ status })} 
                             className="flex-1 sm:flex-none"
                           >
                             {isActive && <Check className="w-4 h-4 mr-1" />}
                             {status}
                           </Button>
                         );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-brand-400 text-center">
                <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Select an incident from the queue to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
