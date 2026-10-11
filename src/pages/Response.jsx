import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IncidentMap } from '../components/map/IncidentMap';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  UserCheck, 
  FileText, 
  Send,
  Calendar,
  User as UserIcon,
  ChevronRight,
  RefreshCw,
  Camera
} from 'lucide-react';
import { updateReportStatus, fetchResponders, getReportPhotoUrl } from '../lib/api';

export function Response({ incidents, onUpdateIncident, user }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  // Assignment & Dispatch Note Local States
  const [respondersList, setRespondersList] = useState([]);
  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [dispatchNoteInput, setDispatchNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadResponders() {
      try {
        const list = await fetchResponders();
        if (mounted && Array.isArray(list)) {
          setRespondersList(list);
        }
      } catch (err) {
        console.warn('Could not load responders list:', err.message);
      }
    }
    loadResponders();
    return () => { mounted = false; };
  }, []);

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
      filtered = filtered.filter(i => (i._priority?.label || '').toLowerCase() === filterPriority.toLowerCase());
    }

    return filtered.sort((a, b) => {
      if (b._priority?.score !== a._priority?.score) return (b._priority?.score || 0) - (a._priority?.score || 0);
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [incidents, search, filterStatus, filterPriority]);

  const getPriorityBadgeVariant = (label) => {
    const l = (label || '').toLowerCase();
    if (l === 'critical' || l === 'high') return 'danger';
    if (l === 'moderate' || l === 'medium') return 'warning';
    return 'success';
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  // Sync selected responder dropdown when selected incident changes
  useEffect(() => {
    if (selectedIncident) {
      setSelectedResponderId(selectedIncident.assignedResponderId || '');
      setDispatchNoteInput('');
      setNoteSuccess(false);
    }
  }, [selectedIncidentId, selectedIncident?.assignedResponderId]);

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

  const handleAssignResponder = async (e) => {
    e.preventDefault();
    if (!selectedIncidentId) return;
    setIsAssigning(true);
    setUpdateError(null);
    try {
      const updated = await updateReportStatus(selectedIncidentId, {
        assignedResponderId: selectedResponderId || null
      });
      onUpdateIncident(selectedIncidentId, updated);
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddDispatchNote = async (e) => {
    e.preventDefault();
    if (!selectedIncidentId || !dispatchNoteInput.trim()) return;
    setIsAddingNote(true);
    setUpdateError(null);
    setNoteSuccess(false);
    try {
      const updated = await updateReportStatus(selectedIncidentId, {
        dispatchNote: dispatchNoteInput.trim()
      });
      onUpdateIncident(selectedIncidentId, updated);
      setDispatchNoteInput('');
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatTimelineAction = (hist) => {
    switch (hist.actionType) {
      case 'CREATED':
        return { label: 'Report Created', color: 'bg-brand-900', textColor: 'text-brand-900' };
      case 'VERIFIED':
        return { label: 'Officially Verified', color: 'bg-accent-teal', textColor: 'text-accent-teal' };
      case 'UNVERIFIED':
        return { label: 'Verification Revoked', color: 'bg-accent-amber', textColor: 'text-accent-amber' };
      case 'ASSIGNED':
      case 'REASSIGNED':
        return { label: 'Crew Assigned', color: 'bg-indigo-600', textColor: 'text-indigo-600' };
      case 'DISPATCH_NOTE':
        return { label: 'Dispatch Log Note', color: 'bg-blue-500', textColor: 'text-blue-700' };
      default:
        return { label: `Status: ${hist.status}`, color: 'bg-brand-700', textColor: 'text-brand-800' };
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
            <option value="Resolved">Resolved</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="h-9 text-xs font-medium bg-surface-50 border border-surface-200 rounded-sm px-2 outline-none focus:ring-1 focus:ring-brand-900 text-brand-700">
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
          {(search || filterStatus !== 'all' || filterPriority !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); }}
              className="text-xs text-brand-500 hover:text-brand-900 underline font-medium"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-brand-500">
          <Badge variant="default" className="bg-white">
            {filteredIncidents.length} of {incidents.length} Records
          </Badge>
          <span className="bg-accent-teal/10 text-accent-teal px-1.5 py-0.5 rounded-sm border border-accent-teal/20 ml-2">AUTHENTICATED RESPONDER</span>
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
                  const pLabel = inc._priority?.label || 'Low';
                  const isSelected = inc.id === selectedIncidentId;
                  return (
                    <li 
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className={`flex items-center p-2.5 cursor-pointer transition-colors border-l-2 ${isSelected ? 'bg-surface-50 border-brand-900' : 'bg-white border-transparent hover:bg-surface-50/50'}`}
                    >
                      <div className="w-12 flex justify-center">
                        <Badge variant={getPriorityBadgeVariant(pLabel)}>
                          {inc._priority?.score || 0}
                        </Badge>
                      </div>
                      <div className="flex-1 px-3 min-w-0">
                        <p className={`text-sm font-medium truncate ${inc.status === 'Resolved' ? 'text-brand-400 line-through' : 'text-brand-900'}`}>{inc.title}</p>
                        <div className="text-[10px] text-brand-500 truncate flex items-center gap-1.5 mt-0.5">
                           <Clock className="w-3 h-3 text-brand-400" /> {inc.time}
                           {inc.verified && <CheckCircle2 className="w-3 h-3 text-accent-teal ml-1" />}
                           {inc.assignedResponderName && (
                             <span className="ml-2 font-mono text-[9px] bg-surface-200 text-brand-800 px-1 rounded-sm">
                               Assignee: {inc.assignedResponderName}
                             </span>
                           )}
                        </div>
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

        {/* Right Col: Details, Assignment, Dispatch Notes & Timeline */}
        <div className="w-full lg:w-7/12 flex flex-col h-[600px] lg:h-full gap-4">
          <div className="h-2/5 border border-surface-200 bg-surface-100 shadow-sm relative isolate shrink-0">
            <IncidentMap 
              incidents={filteredIncidents} 
              selectedIncidentId={selectedIncidentId} 
              onIncidentClick={id => setSelectedIncidentId(id)}
            />
            {!selectedIncidentId && (
              <div className="absolute inset-0 z-[400] bg-surface-100/60 backdrop-blur-sm flex items-center justify-center">
                 <div className="bg-white px-4 py-2 border border-surface-200 text-sm font-medium text-brand-700 shadow-sm">
                   Select an incident to view details & dispatch operations
                 </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-white border border-surface-200 shadow-sm overflow-y-auto relative p-6">
            {isUpdating && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[500] flex items-center justify-center font-medium">Updating...</div>}
            {updateError && (
              <div className="sticky top-0 inset-x-0 bg-accent-red text-white text-xs p-2.5 mb-4 rounded-sm flex items-center justify-between z-[501]">
                <span>{updateError}</span>
                <button onClick={() => setUpdateError(null)} className="font-bold underline ml-2">Dismiss</button>
              </div>
            )}
            
            {selectedIncident ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-surface-200">
                  <div>
                    <h2 className="text-xl font-editorial font-medium text-brand-900 mb-1 leading-tight">{selectedIncident.title}</h2>
                    <p className="text-[10px] text-brand-500 font-mono tracking-widest uppercase">ID: {selectedIncident.id}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getPriorityBadgeVariant(selectedIncident._priority?.label)} className="text-xs px-2 py-1">
                      {selectedIncident._priority?.label} (Score {selectedIncident._priority?.score || 0})
                    </Badge>
                  </div>
                </div>

                {/* 1. Responder Assignment Section */}
                <div className="bg-surface-50 p-4 border border-surface-200 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-brand-700" />
                    <h5 className="text-xs font-semibold text-brand-900 uppercase tracking-wider">Responder Assignment</h5>
                  </div>
                  
                  <form onSubmit={handleAssignResponder} className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="flex-1 w-full">
                      <select
                        value={selectedResponderId}
                        onChange={e => setSelectedResponderId(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-surface-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-900 text-brand-900"
                      >
                        <option value="">-- Unassigned (General Dispatch Queue) --</option>
                        {respondersList.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.role}) — {r.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={isAssigning}
                      className="w-full sm:w-auto"
                    >
                      {isAssigning ? 'Updating...' : (selectedResponderId ? 'Assign / Reassign' : 'Save Assignment')}
                    </Button>
                  </form>

                  {selectedIncident.assignedResponderName && (
                    <div className="mt-2 text-[11px] font-mono text-brand-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-teal inline-block"></span>
                      Currently assigned to: <span className="font-semibold text-brand-900">{selectedIncident.assignedResponderName}</span>
                    </div>
                  )}
                </div>

                {/* 2. Dispatch Notes Entry Section */}
                <div className="bg-surface-50 p-4 border border-surface-200 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-700" />
                      <h5 className="text-xs font-semibold text-brand-900 uppercase tracking-wider">Append Dispatch Note</h5>
                    </div>
                    {noteSuccess && (
                      <span className="text-[11px] text-accent-teal font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Note Logged
                      </span>
                    )}
                  </div>
                  
                  <form onSubmit={handleAddDispatchNote} className="space-y-2">
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={dispatchNoteInput}
                      onChange={e => setDispatchNoteInput(e.target.value)}
                      placeholder="Add field dispatch instructions, pump deployment details, or on-site notes..."
                      className="w-full text-xs p-2.5 bg-white border border-surface-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-900 text-brand-900 placeholder:text-brand-400"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-brand-400 font-mono">
                        {dispatchNoteInput.length} / 1000 characters
                      </span>
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={isAddingNote || !dispatchNoteInput.trim()}
                        className="px-4"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {isAddingNote ? 'Logging...' : 'Post Dispatch Note'}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* 3. Field Metrics & Scoring Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 border border-surface-200">
                    <h5 className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-2">Field Observation</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Depth</span>
                        <span className="font-semibold text-brand-900">{selectedIncident.depth} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Reported Severity</span>
                        <span className="font-semibold text-brand-900 capitalize">{selectedIncident.severity}</span>
                      </div>
                      <div className="flex justify-between border-b border-surface-100 pb-1">
                        <span className="text-brand-600">Road Blockage</span>
                        <span className="font-semibold text-brand-900">{selectedIncident.roadBlocked ? 'Blocked' : 'Passable'}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-brand-600">Critical Facility</span>
                        <span className="font-semibold text-brand-900">{selectedIncident.criticalFacility ? 'Yes' : 'None Reported'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 border border-surface-200">
                    <h5 className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-2">Heuristic Scoring Factors</h5>
                    <ul className="space-y-1 text-[11px] text-brand-700">
                      {(selectedIncident._priority?.explanation || []).map((exp, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-brand-400 mt-0.5">•</span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Photo Evidence Review */}
                {Array.isArray(selectedIncident.photos) && selectedIncident.photos.length > 0 && (
                  <div className="bg-white p-4 border border-surface-200 rounded-sm">
                    <h5 className="text-xs font-semibold text-brand-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-brand-700" />
                      Citizen Photographic Evidence ({selectedIncident.photos.length})
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedIncident.photos.map((photo, i) => (
                        <a 
                          key={i}
                          href={getReportPhotoUrl(selectedIncident.id, photo.key)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="group border border-surface-200 bg-surface-50 p-1.5 rounded-sm overflow-hidden block hover:border-brand-900 transition-colors"
                        >
                          <img 
                            src={getReportPhotoUrl(selectedIncident.id, photo.key)} 
                            alt={photo.originalName || `Evidence ${i + 1}`}
                            className="w-full h-28 object-cover rounded-sm group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="flex justify-between items-center text-[10px] text-brand-600 font-mono mt-1 px-0.5 truncate">
                            <span className="truncate">{photo.originalName || `Photo ${i + 1}`}</span>
                            <span className="text-brand-400 shrink-0 ml-1">({(photo.size / 1024).toFixed(0)}KB)</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Complete Audit Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-surface-200 pb-2">
                    <h4 className="text-xs font-semibold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
                      Response Timeline & Audit History
                    </h4>
                    <span className="text-[10px] font-mono text-brand-500">
                      {(selectedIncident.statusHistory || []).length} Logged Events
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-4 border-l-2 border-surface-200 ml-2">
                    {Array.isArray(selectedIncident.statusHistory) && selectedIncident.statusHistory.length > 0 ? (
                      selectedIncident.statusHistory.map((hist, idx) => {
                        const style = formatTimelineAction(hist);
                        return (
                          <div key={idx} className="relative text-xs">
                            <span className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ${style.color}`}></span>
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
                              <span className={`font-semibold ${style.textColor}`}>
                                {style.label}
                              </span>
                              <span className="text-[10px] font-mono text-brand-400">
                                {new Date(hist.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(hist.timestamp || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {hist.note && (
                              <p className="text-brand-700 bg-surface-50 p-2 border border-surface-100 rounded-sm mt-1 leading-relaxed">
                                {hist.note}
                              </p>
                            )}

                            <div className="text-[10px] text-brand-500 mt-1 flex items-center gap-2">
                              <span>Actor: <strong className="text-brand-800">{hist.updatedByName || 'Municipal Responder'}</strong></span>
                              {hist.updatedByRole && (
                                <span className="uppercase text-[9px] px-1 bg-surface-200 rounded font-mono">
                                  {hist.updatedByRole}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-brand-500 italic">No timeline entries recorded.</p>
                    )}
                  </div>
                </div>

                {/* 5. Status Actions & Verification Footer */}
                <div className="pt-4 border-t border-surface-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {!selectedIncident.verified ? (
                       <Button size="sm" variant="secondary" onClick={() => handleStatusChange({ verified: true })} disabled={isUpdating} className="w-full sm:w-auto">
                         <ShieldCheck className="w-4 h-4 mr-2" /> Mark as Verified
                       </Button>
                    ) : (
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-medium text-accent-teal flex items-center">
                           <CheckCircle2 className="w-4 h-4 mr-1"/> Officially Verified
                         </span>
                         <button 
                           onClick={() => handleStatusChange({ verified: false })}
                           disabled={isUpdating}
                           className="text-[11px] text-brand-500 hover:text-accent-red underline ml-2"
                         >
                           Revoke
                         </button>
                       </div>
                    )}
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      {['Pending Crew', 'Investigating', 'Resolved'].map(status => {
                         const isActive = selectedIncident.status === status;
                         return (
                           <Button 
                             key={status} size="sm" disabled={isUpdating}
                             variant={isActive ? 'primary' : 'secondary'}
                             onClick={() => handleStatusChange({ status })} 
                             className="flex-1 sm:flex-none"
                           >
                             {isActive && <Check className="w-3.5 h-3.5 mr-1" />}
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
                <p className="text-sm">Select an incident from the queue to view details and dispatch actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
