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
      setError('Enter your email and password.');
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
        setError('Connection error. Try again.');
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('No account found for this email.');
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
        setError('Use the Admin tab to sign in.');
        setIsLoading(false);
        return;
      }

      if (activeTab === 'admin' && !isAdminRole) {
        setError('Use the Staff tab to sign in.');
        setIsLoading(false);
        return;
      }

      if (data.status === 'Inactive') {
        setError('Account inactive. Contact admin.');
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
        {/* Brand Header — logo above title */}
        <div className="login-brand">
          <div className="login-logo-frame">
            <img src={wmdLogo} alt="WMD Hub" className="login-logo-img" />
          </div>
          <div className="login-brand-text">
            <span className="login-brand-name">WMD</span>
            <span className="login-brand-accent">Hub</span>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="login-tabs">
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setError(''); }}
            className={`login-tab ${activeTab === 'staff' ? 'is-active' : ''}`}
          >
            <UserIcon className="login-tab-icon" />
            <span>Staff</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setError(''); }}
            className={`login-tab ${activeTab === 'admin' ? 'is-active' : ''}`}
          >
            <Shield className="login-tab-icon" />
            <span>Admin</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" role="alert">
              <AlertCircle className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="login-input"
              required
            />
            <Mail className="login-input-icon" />
          </div>

          <div className="login-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="login-input"
              required
            />
            <Lock className="login-input-icon" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="login-eye-btn"
            >
              {showPassword ? <EyeOff className="login-eye-icon" /> : <Eye className="login-eye-icon" />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="login-submit-btn">
            {isLoading ? (
              <span>Signing in…</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="login-submit-arrow" />
              </>
            )}
          </button>
        </form>

        <p className="login-footnote">WEST MALAYAN</p>
      </div>
    </div>
  );
};