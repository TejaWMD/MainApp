import React, { useState } from 'react';
import { Sparkles, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, User as UserIcon, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../config/supabaseClient';
import '../styles/login.css';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'admin'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter your email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Query user from Supabase Central Database
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (queryError) {
        console.error('Supabase error:', queryError);
        setError('Connection error. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('No account found with this email address.');
        setIsLoading(false);
        return;
      }

      // Check password
      if (String(data.password).trim() !== cleanPassword) {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Enforce Tab constraints
      const isAdminRole = data.role === 'admin';

      if (activeTab === 'staff' && isAdminRole) {
        setError('This is an Administrator account. Please switch to the Admin tab to sign in.');
        setIsLoading(false);
        return;
      }

      if (activeTab === 'admin' && !isAdminRole) {
        setError('Access denied. Staff members must sign in under the Staff tab.');
        setIsLoading(false);
        return;
      }

      // Check account status
      if (data.status === 'Inactive') {
        setError('This account is currently inactive. Please contact your manager or admin.');
        setIsLoading(false);
        return;
      }

      // Record last login in Supabase
      try {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);
      } catch (e) {
        console.warn('Could not record last_login', e);
      }

      onLogin(data as User);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Brand Icon Header */}
        <div className="text-center mb-6">
          <div className="login-icon-badge">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#193116] tracking-tight">
            Portal<span className="text-[#bf944b]">Hub</span>
          </h1>
          <p className="text-xs font-semibold text-[#193116]/55 mt-1">
            Sign in to access your company workspaces
          </p>
        </div>

        {/* Tab Switcher: Staff & Admin only */}
        <div className="flex p-1.5 mb-6 rounded-2xl bg-[#bcbeab]/25 border border-[#bcbeab]/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-[#193116] shadow-sm'
                : 'text-[#193116]/60 hover:text-[#193116]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Staff</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#193116] text-white shadow-sm'
                : 'text-[#193116]/60 hover:text-[#193116]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#bf944b]" />
            <span>Admin</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-[#83121c]/10 border border-[#83121c]/20 text-xs font-bold text-[#83121c] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'admin' ? 'admin1@gmail.com' : 'your.email@company.com'}
                autoComplete="email"
                className="login-input pl-10"
                required
              />
              <Mail className="login-input-icon left-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="login-input pl-10 pr-10"
                required
              />
              <Lock className="login-input-icon left-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#193116]/40 hover:text-[#193116] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-submit-btn cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign in as {activeTab === 'admin' ? 'Administrator' : 'Staff'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] font-bold text-[#193116]/40">
          WMD Operations & Management Portal
        </p>
      </div>
    </div>
  );
};
