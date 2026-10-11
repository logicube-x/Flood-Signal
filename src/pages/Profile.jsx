import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { updateProfile, logout } from '../lib/auth';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Calendar, 
  Edit3, 
  Check, 
  LogOut, 
  AlertTriangle, 
  FileText, 
  CheckCircle2 
} from 'lucide-react';

export function Profile({ user, onUpdateUser, onLogout, onNavigateToMyReports }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await updateProfile({ name: name.trim() });
      if (data && data.user) {
        onUpdateUser(data.user);
        setSuccess('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setIsEditing(false);
    setError(null);
  };

  const formattedJoinDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Active Session';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Top Banner / Heading */}
      <div className="bg-white border border-surface-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-brand-900 text-white flex items-center justify-center font-editorial text-2xl font-semibold shadow-inner shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-semibold uppercase text-brand-500 tracking-wider">
                Citizen Account
              </span>
              <span className="text-surface-300">·</span>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono uppercase bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
                {user?.role || 'Citizen'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-editorial font-medium text-brand-900 leading-tight">
              {user?.name}
            </h2>
            <p className="text-xs text-brand-500 font-mono mt-0.5">
              Account ID: {user?.id || user?._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={onNavigateToMyReports}
            className="border-surface-200 text-brand-800"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-accent-teal" />
            My Reports
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="border-accent-red/30 text-accent-red hover:bg-accent-red/10"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 bg-accent-teal/10 border-l-4 border-accent-teal text-accent-teal text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-accent-red/10 border-l-4 border-accent-red text-accent-red text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Profile Details & Editable Fields */}
      <div className="bg-white border border-surface-200 shadow-sm divide-y divide-surface-200">
        
        <div className="p-6 sm:p-8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-editorial font-medium text-brand-900 leading-tight">
              Personal Information
            </h3>
            <p className="text-xs text-brand-500 mt-1">
              Manage your publicly identified contributor name. Email and role changes require administrator approval.
            </p>
          </div>

          {!isEditing && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditing(true)}
              className="border-surface-200 text-brand-800"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Content / Edit Form */}
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
              <div>
                <label className="block text-xs font-mono font-medium text-brand-700 uppercase tracking-wider mb-2">
                  Full Contributor Name <span className="text-accent-red">*</span>
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-900 text-sm font-medium text-brand-900"
                  placeholder="Your full name"
                />
                <span className="text-[10px] text-brand-400 font-mono mt-1 block">
                  Displayed on community field report submissions.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-brand-700 uppercase tracking-wider mb-1">
                  Email Address (Immutable)
                </label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="w-full p-2.5 bg-surface-100 border border-surface-200 rounded-sm text-sm text-brand-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={loading}
                  className="bg-brand-900 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  {loading ? 'Saving Changes...' : 'Save Profile'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="border border-surface-200 p-4 bg-surface-50/50">
                <dt className="text-xs font-mono uppercase text-brand-500 flex items-center gap-2 mb-1">
                  <UserIcon className="w-3.5 h-3.5 text-accent-teal" />
                  Full Contributor Name
                </dt>
                <dd className="text-base font-medium text-brand-900">
                  {user?.name}
                </dd>
              </div>

              <div className="border border-surface-200 p-4 bg-surface-50/50">
                <dt className="text-xs font-mono uppercase text-brand-500 flex items-center gap-2 mb-1">
                  <Mail className="w-3.5 h-3.5 text-accent-teal" />
                  Registered Email
                </dt>
                <dd className="text-sm font-mono text-brand-900 break-all">
                  {user?.email}
                </dd>
              </div>

              <div className="border border-surface-200 p-4 bg-surface-50/50">
                <dt className="text-xs font-mono uppercase text-brand-500 flex items-center gap-2 mb-1">
                  <Shield className="w-3.5 h-3.5 text-accent-teal" />
                  Assigned Platform Role
                </dt>
                <dd className="text-sm font-medium text-brand-900 capitalize flex items-center gap-2">
                  <span>{user?.role || 'Citizen'}</span>
                  {user?.role === 'citizen' && (
                    <span className="text-[10px] font-mono text-brand-500 lowercase">(public contributor)</span>
                  )}
                </dd>
              </div>

              <div className="border border-surface-200 p-4 bg-surface-50/50">
                <dt className="text-xs font-mono uppercase text-brand-500 flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-accent-teal" />
                  Account Registration Date
                </dt>
                <dd className="text-sm font-mono text-brand-900">
                  {formattedJoinDate}
                </dd>
              </div>

            </dl>
          )}
        </div>

        {/* Security & Data Integrity Assurance */}
        <div className="p-6 sm:p-8 bg-surface-50">
          <div className="flex items-start gap-3 text-xs text-brand-600 leading-relaxed">
            <Shield className="w-4 h-4 text-accent-teal shrink-0 mt-0.5" />
            <div>
              <strong className="text-brand-900 block mb-0.5">Authentication Security Standard</strong>
              Your session is authenticated using encrypted HttpOnly JSON Web Tokens with strict same-origin cookies. Password hashes are never sent to your browser, nor stored in client localStorage.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
