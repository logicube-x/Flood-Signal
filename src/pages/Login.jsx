import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { login } from '../lib/auth';
import { ShieldAlert, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function Login({ onLogin, onNavigateToRegister, onNavigateToHome }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await login(formData);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-6">
      <div className="w-full max-w-md bg-white border border-surface-200 shadow-sm p-8">
        {onNavigateToHome && (
          <button 
            type="button"
            onClick={onNavigateToHome}
            className="text-xs text-brand-500 hover:text-brand-900 mb-6 inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public Home
          </button>
        )}

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded bg-brand-900 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-editorial font-medium text-center text-brand-900 mb-1">Sign In to FloodSignal</h2>
        <p className="text-center text-xs text-brand-500 mb-8 uppercase tracking-wider font-semibold">Citizen & Responder Access</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData(prev => ({...prev, email: e.target.value}))}
              className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm"
              placeholder="responder@vadodara.gov"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={formData.password}
                onChange={e => setFormData(prev => ({...prev, password: e.target.value}))}
                className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm pr-10"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-900"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="p-3 bg-accent-red/10 border-l-2 border-accent-red text-accent-red text-xs font-medium">{error}</div>}
          
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-brand-600">
          <button onClick={onNavigateToRegister} className="font-semibold text-brand-900 hover:underline">
            Register a Citizen Account
          </button>
        </div>
      </div>
    </div>
  );
}
