import React from 'react';
import { 
  Map, 
  ArrowRight, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  SlidersHorizontal, 
  Compass, 
  ExternalLink,
  User as UserIcon,
  LogIn
} from 'lucide-react';
import { IncidentMap } from '../components/map/IncidentMap';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BrandLogo } from '../components/ui/BrandLogo';

export function Landing({ 
  onExploreMap, 
  onEnterWorkspace,
  onReport, 
  onSignIn, 
  onGetStarted, 
  user,
  incidents = [] 
}) {
  const activeCount = incidents.filter(i => i.status !== 'Resolved').length;
  const criticalCount = incidents.filter(i => i.status !== 'Resolved' && (i._priority?.label || '').toLowerCase() === 'critical').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;
  const handleOpenWorkspace = onEnterWorkspace || onExploreMap;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-brand-900 flex flex-col font-sans selection:bg-accent-teal/20">
      
      {/* 1. COMPACT TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" variant="default" />
            <div>
              <span className="font-editorial font-semibold text-lg tracking-wide text-brand-900 block leading-tight">
                FloodSignal
              </span>
              <span className="text-[10px] text-brand-500 font-mono tracking-wider uppercase hidden sm:block">
                Vadodara Civic Pilot
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-700">
            <button 
              onClick={() => scrollToSection('about')} 
              className="hover:text-brand-900 transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="hover:text-brand-900 transition-colors"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('stakeholders')} 
              className="hover:text-brand-900 transition-colors"
            >
              Who It's For
            </button>
            <button 
              onClick={onExploreMap} 
              className="hover:text-brand-900 transition-colors flex items-center gap-1.5"
            >
              <span>Live Map</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse"></span>
            </button>
          </nav>

          {/* Right Action / Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-brand-900">{user.name}</span>
                  <span className="text-[10px] font-mono uppercase text-brand-500">{user.role}</span>
                </div>
                <Button 
                  onClick={handleOpenWorkspace}
                  size="sm"
                  className="bg-brand-900 text-white hover:bg-brand-800"
                >
                  Enter Workspace
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onSignIn}
                  className="text-brand-700 hover:text-brand-900"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Sign In
                </Button>
                <Button 
                  size="sm" 
                  onClick={onGetStarted}
                  className="bg-brand-900 text-white hover:bg-brand-800"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="border-b border-surface-200 bg-gradient-to-b from-white to-surface-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            
            {/* Category / Eyebrow */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-100 border border-surface-200 rounded-sm text-xs font-mono font-medium text-brand-700 uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-teal"></span>
              Civic Hydrometry & Rapid Triage
            </div>

            {/* Restrained Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-medium text-brand-900 tracking-tight leading-[1.12] mb-6">
              Community-powered flood reporting for urban resilience.
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-brand-600 font-light leading-relaxed mb-6">
              FloodSignal connects verified citizen observations with a deterministic severity-scoring engine. During heavy monsoon waterlogging, reports are prioritised by estimated depth, traffic blockage, and facility risk—giving municipal responders immediate clarity on where water rises first.
            </p>

            {/* Authenticated User Quick Action Banner */}
            {user && (
              <div className="mb-8 p-3.5 bg-white border border-surface-200 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse"></span>
                  <span className="text-brand-800">
                    Active session: <strong className="font-semibold text-brand-900">{user.name}</strong> ({user.role})
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={handleOpenWorkspace}
                  className="inline-flex items-center gap-1.5 font-semibold text-accent-teal hover:text-teal-800 uppercase font-mono tracking-wider transition-colors"
                >
                  <span>Continue to {user.role === 'responder' || user.role === 'admin' ? 'Municipal Desk' : 'System Overview'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <Button 
                size="lg" 
                onClick={onReport}
                className="bg-brand-900 text-white hover:bg-brand-800 justify-center h-12 px-6"
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-accent-amber" />
                Report Waterlogging
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={onExploreMap}
                className="border-surface-300 text-brand-900 hover:bg-surface-100 justify-center h-12 px-6"
              >
                <Compass className="w-4 h-4 mr-2 text-accent-teal" />
                Explore Incident Map
              </Button>
            </div>

            {/* Key Transparency Badges */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-brand-500 font-mono border-t border-surface-200 pt-6">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" />
                Vadodara Pilot Area
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" />
                Deterministic Heuristic Scoring
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" />
                No Black-Box Forecasts
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE MAP PREVIEW & LIVE METRICS */}
      <section id="live-map-preview" className="py-12 sm:py-16 bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-mono font-medium text-brand-500 uppercase tracking-widest mb-1.5">
                Live Geographic Intelligence
              </p>
              <h2 className="text-2xl sm:text-3xl font-editorial font-medium text-brand-900">
                Vadodara City Waterlogging Map
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onExploreMap}
                className="border-surface-200 text-brand-800"
              >
                Open Fullscreen Operations View
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Quick Real Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-surface-200 bg-surface-50 mb-6">
            <div className="p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-surface-200">
              <div className="text-[10px] font-mono uppercase text-brand-500 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse"></span>
                Active Waterlogging Incidents
              </div>
              <div className="text-3xl font-editorial font-medium text-brand-900">
                {activeCount}
              </div>
              <p className="text-xs text-brand-500 mt-1">Pending investigation or de-watering</p>
            </div>
            
            <div className="p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-surface-200">
              <div className="text-[10px] font-mono uppercase text-brand-500 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-red"></span>
                Critical Priority Bottlenecks
              </div>
              <div className="text-3xl font-editorial font-medium text-accent-red">
                {criticalCount}
              </div>
              <p className="text-xs text-brand-500 mt-1">Blocked arterial roads or medical routes</p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="text-[10px] font-mono uppercase text-brand-500 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-teal"></span>
                Resolved Reports
              </div>
              <div className="text-3xl font-editorial font-medium text-brand-900">
                {resolvedCount}
              </div>
              <p className="text-xs text-brand-500 mt-1">Cleared and drained today</p>
            </div>
          </div>

          {/* Map View Frame */}
          <div className="h-[420px] w-full border border-surface-200 shadow-sm relative isolate bg-surface-100">
            <IncidentMap 
              incidents={incidents} 
              onReportClick={onReport}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-brand-500 font-mono mt-3">
            <span>Tile Source: OpenStreetMap contributors</span>
            <span>Data State: Public verified reports & labelled sample scenario data</span>
          </div>

        </div>
      </section>

      {/* 4. THREE-STEP TRIAGE EXPLANATION */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-surface-50 border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono font-medium text-brand-500 uppercase tracking-widest mb-1.5">
              Operational Workflow
            </p>
            <h2 className="text-3xl font-editorial font-medium text-brand-900 mb-3">
              How FloodSignal functions under severe weather.
            </h2>
            <p className="text-sm sm:text-base text-brand-600 font-light leading-relaxed">
              When intense rainfall overwhelms drainage infrastructure, standard helpline call volumes spike. FloodSignal transforms fragmented citizen phone calls into structured, geocoded triage signals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-brand-400 uppercase tracking-wider mb-4">
                  Phase 01
                </div>
                <h3 className="text-xl font-editorial font-medium text-brand-900 mb-2">
                  01. Report
                </h3>
                <p className="text-sm text-brand-600 leading-relaxed">
                  Citizens submit on-the-ground observations by dropping a map pin or entering coordinates. Reports capture measured depth in centimetres, observed severity, and whether vehicles are halted.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-100 text-xs text-brand-500 font-mono">
                Input: GPS coords · Depth (0-500 cm) · Obstruction
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-accent-teal uppercase tracking-wider mb-4">
                  Phase 02
                </div>
                <h3 className="text-xl font-editorial font-medium text-brand-900 mb-2">
                  02. Prioritise
                </h3>
                <p className="text-sm text-brand-600 leading-relaxed">
                  A transparent scoring engine computes a 0–100 priority score. Weights scale with depth, blocked arterial avenues, and proximity to electrical substations or hospitals. Outdated reports (older than 6 hours) are flagged stale.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-100 text-xs text-brand-500 font-mono">
                Formula: Depth factor + Blockage + Facility + Freshness
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 sm:p-8 border border-surface-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-brand-900 uppercase tracking-wider mb-4">
                  Phase 03
                </div>
                <h3 className="text-xl font-editorial font-medium text-brand-900 mb-2">
                  03. Respond
                </h3>
                <p className="text-sm text-brand-600 leading-relaxed">
                  Municipal responders log into their dispatch console. High-priority incidents trigger immediate pump routing. Responders verify field conditions, adjust status to "Investigating", and record resolution.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-100 text-xs text-brand-500 font-mono">
                Output: Verified status · Dispatch audit trail · Resolution
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. STAKEHOLDER BENEFITS: CITIZENS & RESPONDERS */}
      <section id="stakeholders" className="py-16 sm:py-20 bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-mono font-medium text-brand-500 uppercase tracking-widest mb-1.5">
              Dual-Sided Impact
            </p>
            <h2 className="text-3xl font-editorial font-medium text-brand-900 mb-3">
              Designed for public transparency and operational command.
            </h2>
            <p className="text-sm text-brand-600 font-light">
              Bridging the gap between the citizen experiencing road waterlogging and the crew operating the de-watering pumps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* For Citizens */}
            <div className="border border-surface-200 bg-surface-50 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded bg-brand-900 text-white flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-editorial font-medium text-brand-900">
                    For Citizens & Commuters
                  </h3>
                  <span className="text-xs font-mono text-brand-500 uppercase">Public Reporting Portal</span>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-brand-700">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Frictionless reporting:</strong> File an incident in under 60 seconds with simple map tap or GPS coordinates.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Report tracking:</strong> Track the lifecycle of your submission from "Pending Crew" to "Investigating" and "Resolved".</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Route safety:</strong> Check known water depths at underpasses (like Alkapuri or Fatehgunj) before traveling in monsoon storms.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Data privacy:</strong> Secure sessions with HttpOnly cookies, zero advertising trackers, and transparent handling of submission details.</span>
                </li>
              </ul>
            </div>

            {/* For Municipal Responders */}
            <div className="border border-surface-200 bg-brand-900 text-white p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded bg-accent-teal text-white flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-editorial font-medium text-white">
                    For Municipal Responders
                  </h3>
                  <span className="text-xs font-mono text-brand-400 uppercase">Authorized Dispatch Desk</span>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-brand-200">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Rule-based triage:</strong> Objective 0–100 scores eliminate subjective bias and pinpoint acute infrastructure bottlenecks.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Audited verification:</strong> Municipal officers mark verified reports with an immutable record of who inspected each location.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Stale-data prevention:</strong> Automated aging flags reports older than 6 hours so crews don't investigate receded water.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2 shrink-0"></span>
                  <span><strong>Equipment coordination:</strong> Dispatch mobile suction and de-watering pumps directly to critical hospital corridors.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 6. SAFETY, DATA VERIFICATION & AUTHENTICITY NOTE */}
      <section id="about" className="py-12 sm:py-16 bg-surface-100 border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white border-l-4 border-brand-900 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-accent-amber shrink-0 mt-0.5" />
              <div className="space-y-3">
                <h3 className="text-base font-semibold uppercase tracking-wider text-brand-900">
                  Critical Safety & Verification Disclaimers
                </h3>
                
                <p className="text-sm text-brand-700 leading-relaxed">
                  <strong>Life-Threatening Emergencies:</strong> FloodSignal is an open community intelligence pilot and prototype prioritization tool. It is <em>not</em> a substitute for official disaster emergency services. If you or someone else is in immediate danger or witnessing trapped individuals, contact the National Emergency Helpline (<strong>112</strong>) or Emergency Medical Services (<strong>108</strong>) directly.
                </p>

                <p className="text-sm text-brand-700 leading-relaxed">
                  <strong>Data Integrity & Verification:</strong> Community-reported incidents are displayed in real-time and may remain unverified until inspected on-site by municipal personnel. Sample incident markers are clearly labelled with <code className="text-xs bg-surface-100 px-1.5 py-0.5 rounded font-mono text-accent-red">SAMPLE DATA</code> and should not be confused with historical or active flood emergencies.
                </p>

                <p className="text-sm text-brand-700 leading-relaxed">
                  <strong>No Black-Box or Predictive Claims:</strong> Prioritization values represent deterministic rule heuristics calculated from user-provided water depth, road status, and asset proximity. FloodSignal does not claim to predict future rainfall, river overflow, or meteorological events.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-brand-900 text-brand-400 py-12 border-t border-brand-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-brand-800">
            
            {/* Col 1: Brand */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5 text-white">
                <div className="w-6 h-6 rounded bg-accent-teal flex items-center justify-center">
                  <Map className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-editorial text-lg font-semibold tracking-wide">
                  FloodSignal
                </span>
              </div>
              <p className="text-xs text-brand-400 max-w-sm leading-relaxed">
                An open civic-technology framework for urban waterlogging coordination, real-time depth reporting, and transparent municipal dispatch. Built for environmental resilience in Vadodara, Gujarat.
              </p>
              <div className="text-[11px] font-mono text-brand-500">
                Developed for the WeMakeDevs Environmental Hacks Hackathon.
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-300 mb-3">
                Workspace
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={onExploreMap} className="hover:text-white transition-colors">
                    System Overview Map
                  </button>
                </li>
                <li>
                  <button onClick={onReport} className="hover:text-white transition-colors">
                    Report Incident
                  </button>
                </li>
                <li>
                  <button onClick={onSignIn} className="hover:text-white transition-colors">
                    Municipal Desk Sign In
                  </button>
                </li>
                <li>
                  <button onClick={onGetStarted} className="hover:text-white transition-colors">
                    Citizen Registration
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Technical Integrity */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-300 mb-3">
                Stack & Deployment
              </h4>
              <ul className="space-y-2 text-xs font-mono text-brand-400">
                <li>React 18 + Tailwind CSS</li>
                <li>Leaflet & OpenStreetMap</li>
                <li>Node.js / Express REST API</li>
                <li>MongoDB Data Persistence</li>
                <li>AWS Amplify Frontend</li>
              </ul>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-500 font-mono">
            <div>
              &copy; {new Date().getFullYear()} FloodSignal Project. Open Civic Resilience Prototype.
            </div>
            <div>
              Not officially operated or endorsed by Vadodara Municipal Corporation (VMC).
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
