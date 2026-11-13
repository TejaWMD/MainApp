import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Shield, User as UserIcon, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../config/supabaseClient';
import wmdLogo from '../assets/wmd-logo.jpg';
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
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
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
        setError('No account found with this email.');
        setIsLoading(false);
        return;
      }

      if (String(data.password).trim() !== cleanPassword) {
        setError('Incorrect password.');
        setIsLoading(false);
        return;
      }

      const isAdminRole = data.role === 'admin';

      if (activeTab === 'staff' && isAdminRole) {
        setError('Please switch to the Admin tab to sign in.');
        setIsLoading(false);
        return;
      }

      if (activeTab === 'admin' && !isAdminRole) {
        setError('Staff accounts must sign in under Staff.');
        setIsLoading(false);
        return;
      }

      if (data.status === 'Inactive') {
        setError('Account inactive. Contact your administrator.');
        setIsLoading(false);
        return;
      }

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
      setError(err?.message || 'Sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="login-logo-frame">
            <img src={wmdLogo} alt="WMD Hub" className="login-logo-img" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#193116] tracking-tight">
            WMD <span className="text-[#bf944b]">Hub</span>
          </h1>
        </div>

        {/* Sign-in Area */}
        <div className="login-form-box">
          {/* Role Switcher */}
          <div className="flex p-1 mb-4 rounded-xl bg-[#bcbeab]/30 border border-[#b4ad8f]/35">
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-white text-[#193116] shadow-sm'
                  : 'text-[#193116]/60 hover:text-[#193116]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#1080a7]" />
              <span>Staff</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#193116] text-white shadow-sm'
                  : 'text-[#193116]/60 hover:text-[#193116]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#bf944b]" />
              <span>Admin</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-xl bg-[#83121c]/10 border border-[#83121c]/20 text-xs font-semibold text-[#83121c] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#193116]/80 mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@westmalayan.com"
                  autoComplete="email"
                  className="login-input"
                  required
                />
                <Mail className="login-input-icon left-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193116]/80 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="login-input pr-10"
                  required
                />
                <Lock className="login-input-icon left-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#193116]/45 hover:text-[#193116] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
