import React, { useState, useEffect } from 'react';
import { fetchMyReports, getReportPhotoUrl } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Droplets,
  Activity,
  Layers,
  X,
  Camera
} from 'lucide-react';

export function MyReports({ user, onNavigateToReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyReports();
      setReports(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load your reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'reported') return r.status === 'Pending Crew';
    if (statusFilter === 'investigating') return r.status === 'Investigating';
    if (statusFilter === 'resolved') return r.status === 'Resolved';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'Investigating':
        return <Badge variant="warning">Investigating</Badge>;
      default:
        return <Badge variant="default" className="bg-surface-200 text-brand-800">Reported (Pending)</Badge>;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold bg-accent-red/10 text-accent-red border border-accent-red/20 uppercase">Critical</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold bg-accent-amber/10 text-accent-amber border border-accent-amber/20 uppercase">Medium</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold bg-accent-teal/10 text-accent-teal border border-accent-teal/20 uppercase">Low</span>;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Top Header & Metrics Bar */}
      <div className="bg-white border border-surface-200 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-semibold text-brand-500 uppercase tracking-widest">Citizen Incident Tracker</span>
            <span className="text-surface-300">·</span>
            <span className="text-xs font-mono text-accent-teal">{reports.length} Total Submitted</span>
          </div>
          <h2 className="text-2xl font-editorial font-medium text-brand-900 leading-tight">
            My Submitted Incident Reports
          </h2>
          <p className="text-xs text-brand-600 mt-1">
            Track real-time municipal inspection, verification, and de-watering statuses for your submissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadReports}
            disabled={loading}
            className="border-surface-200 text-brand-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={onNavigateToReport}
            className="bg-brand-900 text-white hover:bg-brand-800"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-accent-amber" />
            File New Report
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        
        {/* Left List Area */}
        <div className="w-full lg:w-7/12 flex flex-col bg-white border border-surface-200 shadow-sm">
          
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 border-b border-surface-200 bg-surface-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono text-brand-500 uppercase text-[10px] mr-1 hidden sm:inline">Status:</span>
              {[
                { id: 'all', label: 'All', count: reports.length },
                { id: 'reported', label: 'Reported', count: reports.filter(r => r.status === 'Pending Crew').length },
                { id: 'investigating', label: 'Investigating', count: reports.filter(r => r.status === 'Investigating').length },
                { id: 'resolved', label: 'Resolved', count: reports.filter(r => r.status === 'Resolved').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-brand-900 text-white'
                      : 'text-brand-600 hover:bg-surface-200 hover:text-brand-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1 rounded ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-200 text-brand-700'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {lastRefreshed && (
              <span className="text-[10px] font-mono text-brand-400">
                Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-200">
            {loading && reports.length === 0 ? (
              <div className="p-12 text-center text-brand-600">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-brand-400" />
                <p className="text-sm font-medium">Fetching your field observations...</p>
                <p className="text-xs text-brand-400 mt-1">Connecting to authenticated report vault</p>
              </div>
            ) : error ? (
              <div className="p-10 text-center text-accent-red">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">{error}</p>
                <Button size="sm" variant="outline" onClick={loadReports} className="mt-4">
                  Retry Connection
                </Button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center text-brand-600">
                <FileText className="w-8 h-8 mx-auto mb-3 text-brand-300" />
                <h4 className="text-base font-editorial text-brand-900 mb-1">
                  {statusFilter === 'all' ? 'No reports submitted yet' : `No reports under '${statusFilter}' status`}
                </h4>
                <p className="text-xs text-brand-500 max-w-sm mx-auto mb-6">
                  {statusFilter === 'all' 
                    ? 'When you submit waterlogging reports using the reporting tool, they will be archived here for live tracking.' 
                    : 'Try selecting a different filter tab or file a new report.'}
                </p>
                {statusFilter === 'all' && (
                  <Button size="sm" onClick={onNavigateToReport} className="bg-brand-900 text-white">
                    Submit Your First Report
                  </Button>
                )}
              </div>
            ) : (
              filteredReports.map(report => {
                const isSelected = selectedReport?.id === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 transition-colors cursor-pointer border-l-4 ${
                      isSelected
                        ? 'border-brand-900 bg-surface-50'
                        : 'border-transparent hover:bg-surface-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-brand-900 leading-snug truncate">
                          {report.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-brand-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand-400" />
                            {report.time}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-brand-400" />
                            {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {getStatusBadge(report.status)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-100 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-brand-700 font-mono text-[11px]">
                          <Droplets className="w-3 h-3 text-accent-teal" />
                          <span>{report.depth} cm</span>
                        </div>
                        {getSeverityBadge(report.severity)}
                      </div>

                      <div className="flex items-center gap-2">
                        {report.verified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent-teal">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified by Crew
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-400">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Verification
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-brand-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="w-full lg:w-5/12 flex flex-col bg-white border border-surface-200 shadow-sm">
          {selectedReport ? (
            <div className="flex flex-col h-full">
              
              {/* Detail Header */}
              <div className="p-4 sm:p-5 border-b border-surface-200 bg-surface-50 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase text-brand-500 block mb-1">
                    Report ID: {selectedReport.id.replace('sample-', '#').replace('rep-', '#')}
                  </span>
                  <h3 className="text-lg font-editorial font-medium text-brand-900 leading-snug">
                    {selectedReport.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-1 text-brand-400 hover:text-brand-900 lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-brand-700">
                
                {/* Status & Verification Alert Box */}
                <div className={`p-4 border rounded-sm flex items-start gap-3 ${
                  selectedReport.status === 'Resolved' 
                    ? 'bg-accent-teal/5 border-accent-teal/20 text-brand-800' 
                    : selectedReport.status === 'Investigating'
                    ? 'bg-accent-amber/5 border-accent-amber/20 text-brand-800'
                    : 'bg-surface-100 border-surface-200 text-brand-800'
                }`}>
                  <ShieldCheck className="w-5 h-5 text-accent-teal shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-brand-900">Current Municipal Status:</span>
                      {getStatusBadge(selectedReport.status)}
                    </div>
                    <p className="text-xs text-brand-600 leading-relaxed">
                      {selectedReport.status === 'Resolved'
                        ? 'Municipal de-watering operations completed. Roadway reported cleared.'
                        : selectedReport.status === 'Investigating'
                        ? 'Incident has been acknowledged by municipal response and is currently under field investigation.'
                        : 'Report logged into the civic dispatch queue. Awaiting inspection by municipal field crews.'}
                    </p>
                  </div>
                </div>

                {/* Field Observation Details */}
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-500 mb-2">
                    Reported Observation
                  </h4>
                  <div className="bg-surface-50 p-3.5 border border-surface-200 rounded-sm text-sm text-brand-800 leading-relaxed">
                    {selectedReport.description}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-50 p-3 border border-surface-200">
                    <span className="text-[10px] font-mono uppercase text-brand-500 block mb-1">Water Depth</span>
                    <span className="text-lg font-editorial font-medium text-brand-900">
                      {typeof selectedReport.depth === 'number' ? `${selectedReport.depth} cm` : 'Unrecorded'}
                    </span>
                  </div>
                  <div className="bg-surface-50 p-3 border border-surface-200">
                    <span className="text-[10px] font-mono uppercase text-brand-500 block mb-1">Reported Severity</span>
                    <span className="capitalize text-sm font-medium text-brand-900">{selectedReport.severity || 'Unspecified'}</span>
                  </div>
                  <div className="bg-surface-50 p-3 border border-surface-200">
                    <span className="text-[10px] font-mono uppercase text-brand-500 block mb-1">Road Impassable</span>
                    <span className="text-xs font-medium text-brand-900">
                      {selectedReport.roadBlocked ? 'Yes, Blocked' : 'No, Traffic Moving'}
                    </span>
                  </div>
                  <div className="bg-surface-50 p-3 border border-surface-200">
                    <span className="text-[10px] font-mono uppercase text-brand-500 block mb-1">Critical Facility</span>
                    <span className="text-xs font-medium text-brand-900">
                      {selectedReport.criticalFacility ? 'Near Critical Facility' : 'None Reported'}
                    </span>
                  </div>
                </div>

                {/* Attached Photographic Evidence */}
                {Array.isArray(selectedReport.photos) && selectedReport.photos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-500 mb-2.5 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Attached Photo Evidence ({selectedReport.photos.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedReport.photos.map((photo, i) => (
                        <a 
                          key={i}
                          href={getReportPhotoUrl(selectedReport.id, photo.key)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="group border border-surface-200 bg-white p-1 rounded-sm overflow-hidden block hover:border-brand-900 transition-colors"
                        >
                          <img 
                            src={getReportPhotoUrl(selectedReport.id, photo.key)} 
                            alt={photo.originalName || `Incident Photo ${i + 1}`}
                            className="w-full h-24 object-cover rounded-sm group-hover:scale-105 transition-transform duration-200"
                          />
                          <span className="block text-[10px] text-brand-600 truncate font-mono mt-1 px-0.5">
                            {photo.originalName || `Photo ${i + 1}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geolocation */}
                <div className="border border-surface-200 p-3.5 bg-surface-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <span className="font-mono text-brand-700">
                      Latitude: {selectedReport.lat.toFixed(6)}, Longitude: {selectedReport.lng.toFixed(6)}
                    </span>
                  </div>
                  <a 
                    href={`https://www.openstreetmap.org/?mlat=${selectedReport.lat}&mlon=${selectedReport.lng}#map=16/${selectedReport.lat}/${selectedReport.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-teal hover:underline font-mono"
                  >
                    View OSM ↗
                  </a>
                </div>

                {/* Status Timeline History */}
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-500 mb-3">
                    Response Timeline & Lifecycle Log
                  </h4>
                  <div className="space-y-3.5 border-l-2 border-surface-200 pl-4 ml-1">
                    {selectedReport.statusHistory && selectedReport.statusHistory.length > 0 ? (
                      selectedReport.statusHistory.map((hist, idx) => {
                        const isVerified = hist.actionType === 'VERIFIED';
                        const isNote = hist.actionType === 'DISPATCH_NOTE';
                        const isAssigned = hist.actionType === 'ASSIGNED' || hist.actionType === 'REASSIGNED';
                        const dotColor = isVerified ? 'bg-accent-teal' : isNote ? 'bg-blue-500' : isAssigned ? 'bg-indigo-600' : 'bg-brand-900';

                        return (
                          <div key={idx} className="relative text-xs">
                            <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`}></span>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-brand-900">
                                {hist.actionType === 'VERIFIED' ? 'Verified by Municipal Crew' :
                                 hist.actionType === 'DISPATCH_NOTE' ? 'Municipal Field Update' :
                                 hist.actionType === 'ASSIGNED' || hist.actionType === 'REASSIGNED' ? 'Crew Assigned' :
                                 hist.status}
                              </span>
                              <span className="text-brand-400 text-[10px] font-mono">
                                {new Date(hist.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(hist.timestamp || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            {hist.note && (
                              <p className="text-brand-600 bg-surface-50 p-2 border border-surface-100 rounded-sm mt-1 leading-relaxed text-[11px]">
                                {hist.note}
                              </p>
                            )}
                            {hist.updatedByName && (
                              <div className="text-[10px] text-brand-400 mt-0.5">
                                Logged by: {hist.updatedByName} {hist.updatedByRole === 'citizen' ? '(Citizen)' : '(Municipal Response)'}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="relative text-xs">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-900 border-2 border-white"></span>
                        <div className="font-semibold text-brand-900">{selectedReport.status}</div>
                        <div className="text-brand-500 text-[11px] font-mono">{selectedReport.time}</div>
                        <div className="text-brand-600 mt-0.5">Report submitted by citizen</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-brand-500">
              <FileText className="w-8 h-8 text-brand-300 mb-2" />
              <p className="text-sm font-medium text-brand-800">No report selected</p>
              <p className="text-xs text-brand-500 max-w-xs mt-1">
                Click any report from the list on the left to inspect detailed field notes, status history, and municipal verification.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
