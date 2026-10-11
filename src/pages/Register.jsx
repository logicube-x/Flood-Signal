import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { register } from '../lib/auth';
import { AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function Register({ onRegister, onNavigateToLogin, onNavigateToHome }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    setIsLoading(true);
    setError(null);
    try {
      const { confirmPassword, ...payload } = formData;
      const data = await register(payload);
      onRegister(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
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

        <h2 className="text-2xl font-editorial font-medium text-center text-brand-900 mb-2">Citizen Registration</h2>
        <p className="text-center text-sm text-brand-500 mb-6 uppercase tracking-wider font-semibold">Public Access Portal</p>
        
        <div className="mb-6 p-3 bg-surface-50 border border-surface-200 text-xs text-brand-700 flex gap-2">
           <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0" />
           <span>This form creates a standard citizen account. Municipal access requires administrative approval.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
              className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm"
              placeholder="Jane Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData(prev => ({...prev, email: e.target.value}))}
              className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm"
              placeholder="jane@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                minLength={8}
                value={formData.password}
                onChange={e => setFormData(prev => ({...prev, password: e.target.value}))}
                className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm pr-10"
                placeholder="Minimum 8 characters"
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

          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1.5">Confirm Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              required
              minLength={8}
              value={formData.confirmPassword}
              onChange={e => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
              className="w-full p-2.5 bg-surface-50 border border-surface-200 focus:ring-brand-900 rounded-sm focus:outline-none focus:ring-1 text-sm"
              placeholder="Re-enter password"
            />
          </div>

          {error && <div className="p-3 bg-accent-red/10 border-l-2 border-accent-red text-accent-red text-xs font-medium">{error}</div>}
          
          <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-brand-600">
          Already have an account?{' '}
          <button onClick={onNavigateToLogin} className="font-semibold text-brand-900 hover:underline">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
