import React, { useState, useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { Overview } from './pages/Overview';
import { Report } from './pages/Report';
import { Response } from './pages/Response';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Landing } from './pages/Landing';
import { MyReports } from './pages/MyReports';
import { Profile } from './pages/Profile';
import { fetchReports } from './lib/api';
import { fetchMe, logout } from './lib/auth';

function App() {
  const [activePage, setActivePage] = useState('landing');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadReports = async () => {
    try {
      const data = await fetchReports();
      setIncidents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWorkspacePage = (currentUser) => {
    if (!currentUser) return 'overview';
    return (currentUser.role === 'responder' || currentUser.role === 'admin') ? 'response' : 'overview';
  };

  const checkAuth = async () => {
    try {
      const data = await fetchMe();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    loadReports();
    const timer = setInterval(loadReports, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleAddIncident = (newIncident) => {
    setIncidents(prev => [newIncident, ...prev]);
  };

  const handleUpdateIncident = (id, updatedIncident) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? updatedIncident : inc));
  };

  if (authLoading || (loading && incidents.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface-50 text-brand-700">
        <div className="w-8 h-8 rounded bg-brand-900 flex items-center justify-center text-white mb-3 shadow">
          <span className="font-editorial text-sm font-bold">FS</span>
        </div>
        <p className="text-sm font-editorial text-brand-900">Connecting to FloodSignal network...</p>
      </div>
    );
  }

  // Render full-width standalone Landing page when active
  if (activePage === 'landing') {
    return (
      <Landing 
        onExploreMap={() => setActivePage('overview')}
        onEnterWorkspace={() => setActivePage(getWorkspacePage(user))}
        onReport={() => {
          if (user) {
            setActivePage('report');
          } else {
            setActivePage('login');
          }
        }}
        onSignIn={() => setActivePage('login')}
        onGetStarted={() => setActivePage('register')}
        user={user}
        incidents={incidents}
      />
    );
  }

  const renderPage = () => {
    if (activePage === 'login') {
      return (
        <Login 
          onLogin={(u) => { 
            setUser(u); 
            setActivePage(getWorkspacePage(u)); 
          }} 
          onNavigateToRegister={() => setActivePage('register')}
          onNavigateToHome={() => setActivePage('landing')} 
        />
      );
    }
    if (activePage === 'register') {
      return (
        <Register 
          onRegister={(u) => { 
            setUser(u); 
            setActivePage('overview'); 
          }} 
          onNavigateToLogin={() => setActivePage('login')}
          onNavigateToHome={() => setActivePage('landing')} 
        />
      );
    }

    if (error && incidents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-accent-red">
          <p>System Error: {error}</p>
          <button onClick={loadReports} className="mt-4 px-4 py-2 bg-brand-900 text-white rounded">
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activePage) {
      case 'overview':
        return <Overview setActivePage={setActivePage} incidents={incidents} user={user} />;
      case 'my-reports':
        if (!user) {
          return (
            <Login 
              onLogin={(u) => { 
                setUser(u); 
                setActivePage('my-reports'); 
              }} 
              onNavigateToRegister={() => setActivePage('register')}
              onNavigateToHome={() => setActivePage('landing')} 
            />
          );
        }
        return (
          <MyReports 
            user={user} 
            onNavigateToReport={() => setActivePage('report')} 
          />
        );
      case 'profile':
        if (!user) {
          return (
            <Login 
              onLogin={(u) => { 
                setUser(u); 
                setActivePage('profile'); 
              }} 
              onNavigateToRegister={() => setActivePage('register')}
              onNavigateToHome={() => setActivePage('landing')} 
            />
          );
        }
        return (
          <Profile 
            user={user} 
            onUpdateUser={(updated) => setUser(updated)} 
            onLogout={async () => {
              try {
                await logout();
                setUser(null);
                setActivePage('landing');
              } catch (e) {
                console.error(e);
              }
            }}
            onNavigateToMyReports={() => setActivePage('my-reports')} 
          />
        );
      case 'report':
        if (!user) {
          return (
            <Login 
              onLogin={(u) => { 
                setUser(u); 
                setActivePage('report'); 
              }} 
              onNavigateToRegister={() => setActivePage('register')}
              onNavigateToHome={() => setActivePage('landing')} 
            />
          );
        }
        return <Report onAddIncident={handleAddIncident} onNavigateToOverview={() => setActivePage('overview')} />;
      case 'response':
        if (!user) {
          return (
            <Login 
              onLogin={(u) => { 
                setUser(u); 
                setActivePage(getWorkspacePage(u)); 
              }} 
              onNavigateToRegister={() => setActivePage('register')}
              onNavigateToHome={() => setActivePage('landing')} 
            />
          );
        }
        if (user.role !== 'responder' && user.role !== 'admin') {
          return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
              <h3 className="text-xl font-editorial font-medium text-brand-900 mb-2">Access Restricted</h3>
              <p className="text-sm text-brand-600 mb-6 max-w-md">The Municipal Dispatch Desk is restricted to authorized responders. Your account does not have municipal privileges.</p>
              <button onClick={() => setActivePage('overview')} className="px-6 py-2 bg-brand-900 text-white rounded-sm font-medium hover:bg-brand-800">
                Return to Overview
              </button>
            </div>
          );
        }
        return <Response incidents={incidents} onUpdateIncident={handleUpdateIncident} user={user} />;
      default:
        return <Overview setActivePage={setActivePage} incidents={incidents} user={user} />;
    }
  };

  return (
    <Shell activePage={activePage} setActivePage={setActivePage} user={user} setUser={setUser}>
      {renderPage()}
    </Shell>
  );
}

export default App;
