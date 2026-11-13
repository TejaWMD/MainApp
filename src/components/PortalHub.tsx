import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, Sparkles, ArrowUpRight, Lock, LogOut, Briefcase, BadgeCheck } from 'lucide-react';
import { User, AppItem } from '../types';
import { supabase } from '../config/supabaseClient';
import wmdLogo from '../assets/wmd-logo.jpg';
import '../styles/portal-hub.css';

interface PortalHubProps {
  currentUser: User;
  onLogout: () => void;
}

const DEFAULT_APPS: AppItem[] = [
  {
    id: 'sales',
    name: 'Sales & Collection Dashboard',
    url: 'https://tejawmd.github.io/SalesDashboard/',
    badge: 'Sales & Collection',
    color: '#1080a7',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'All'],
  },
  {
    id: 'manager',
    name: 'Query Portal',
    url: 'https://tejawmd.github.io/ManagerDashboard/',
    badge: 'Query',
    color: '#bf944b',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'Logistics', 'Fin & Acc', 'QAQC', 'HR', 'All'],
  },
  {
    id: 'prediction',
    name: 'Sales prediction',
    url: 'https://wmgteja.github.io/PredictionSales/',
    badge: 'Forecasting',
    color: '#83121c',
    allowed_roles: ['admin'],
    allowed_departments: ['All', 'Sales'],
  },
];

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  sales: TrendingUp,
  manager: ShieldCheck,
  prediction: Sparkles,
};

export const PortalHub: React.FC<PortalHubProps> = ({ currentUser, onLogout }) => {
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [redirectingApp, setRedirectingApp] = useState<string | null>(null);

  useEffect(() => {
    const resetRedirectState = () => setRedirectingApp(null);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') setRedirectingApp(null);
    };
    window.addEventListener('pageshow', resetRedirectState);
    window.addEventListener('popstate', resetRedirectState);
    window.addEventListener('focus', resetRedirectState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', resetRedirectState);
      window.removeEventListener('popstate', resetRedirectState);
      window.removeEventListener('focus', resetRedirectState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    async function loadApps() {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .eq('is_active', true);
        if (!error && data && data.length > 0) setApps(data as AppItem[]);
      } catch (err) {
        console.warn('Could not load apps from Supabase, using defaults', err);
      }
    }
    loadApps();
  }, []);

  const checkAppAccess = (app: AppItem): boolean => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.accessible_apps && currentUser.accessible_apps.includes(app.id)) return true;
    const roleMatch = app.allowed_roles?.includes(currentUser.role);
    const deptMatch =
      currentUser.department === 'All' ||
      app.allowed_departments?.includes(currentUser.department);
    return Boolean(roleMatch && deptMatch);
  };

  const handleLaunch = (app: AppItem) => {
    if (!checkAppAccess(app)) return;
    setRedirectingApp(app.name);
    const ssoPayload = {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
      role_label: currentUser.role_label,
      department: currentUser.department,
      avatar_initials: currentUser.avatar_initials,
      phone: currentUser.phone || '',
      portal_url: window.location.href.split('?')[0].split('#')[0],
      issued_at: Date.now(),
    };
    const ssoToken = btoa(encodeURIComponent(JSON.stringify(ssoPayload)));
    const separator = app.url.includes('?') ? '&' : '?';
    const destinationUrl = `${app.url}${separator}sso_token=${encodeURIComponent(ssoToken)}`;
    const fallbackTimer = window.setTimeout(() => setRedirectingApp(null), 3000);
    window.setTimeout(() => {
      window.clearTimeout(fallbackTimer);
      window.location.href = destinationUrl;
    }, 200);
  };

  const accessibleCount = apps.filter(checkAppAccess).length;

  return (
    <div className="hub-wrapper">
      <div className="hub-container">
        {/* Top Bar */}
        <header className="hub-topbar">
          <div className="hub-brand">
            <div className="hub-brand-logo">
              <img src={wmdLogo} alt="WMD Hub" />
            </div>
            <h1 className="hub-brand-title">
              WMD <span className="hub-brand-accent">Hub</span>
            </h1>
          </div>

          <button type="button" onClick={onLogout} className="hub-signout-btn">
            <LogOut className="hub-signout-icon" />
            <span className="hub-signout-label">Sign Out</span>
          </button>
        </header>

        {/* Greeting Banner */}
        <section className="hub-greeting-card">
          <div className="hub-greeting-inner">
            <p className="hub-greeting-eyebrow">Welcome back</p>
            <h2 className="hub-title">
              Hello, <span className="hub-title-accent">{currentUser.name}</span>
            </h2>
          </div>

          <div className="hub-greeting-badges">
            <span className="hub-badge hub-badge-role">
              <BadgeCheck className="hub-badge-icon" />
              <span>{currentUser.role_label || currentUser.role}</span>
            </span>
            <span className="hub-badge hub-badge-dept">
              <Briefcase className="hub-badge-icon" />
              <span>{currentUser.department}</span>
            </span>
          </div>
        </section>

        {/* Apps Header */}
        <div className="hub-apps-header">
          <h3 className="hub-apps-title">Your Workspaces</h3>
          <span className="hub-apps-count">{accessibleCount} available</span>
        </div>

        {/* Workspace Grid */}
        <section className="hub-card-grid" aria-label="Workspaces">
          {apps.map((app) => {
            const Icon = ICON_MAP[app.id] || Sparkles;
            const hasAccess = checkAppAccess(app);

            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleLaunch(app)}
                disabled={!hasAccess || Boolean(redirectingApp)}
                className="hub-workspace-card group"
                style={{
                  opacity: hasAccess ? 1 : 0.6,
                  cursor: hasAccess ? 'pointer' : 'not-allowed',
                }}
              >
                <div className="hub-card-top">
                  <div className="hub-card-icon-box" style={{ backgroundColor: app.color }}>
                    <Icon className="hub-card-icon" />
                  </div>
                  <span
                    className="hub-card-tag"
                    style={{
                      backgroundColor: `${app.color}18`,
                      color: app.color,
                      border: `1px solid ${app.color}38`,
                    }}
                  >
                    {app.badge}
                  </span>
                </div>

                <div className="hub-card-body">
                  <h3 className="hub-card-name">{app.name}</h3>
                </div>

                <div className="hub-card-footer">
                  {hasAccess ? (
                    <>
                      <span className="hub-card-cta">
                        {redirectingApp === app.name ? 'Opening…' : 'Open'}
                      </span>
                      <div className="hub-circle-arrow" style={{ backgroundColor: app.color }}>
                        <ArrowUpRight className="hub-circle-arrow-icon" />
                      </div>
                    </>
                  ) : (
                    <div className="hub-card-restricted">
                      <Lock className="hub-card-restricted-icon" />
                      <span>Restricted</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </section>
      </div>

      {/* Redirecting Toast */}
      {redirectingApp && (
        <div className="hub-toast" role="status" aria-live="polite">
          <span className="hub-toast-text">Opening {redirectingApp}…</span>
          <span className="hub-toast-status">Redirecting</span>
        </div>
      )}
    </div>
  );
};