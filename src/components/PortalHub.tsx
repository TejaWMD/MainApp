import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, Sparkles, ArrowUpRight, Lock, Plus, ExternalLink } from 'lucide-react';
import { User, AppItem } from '../types';
import { supabase } from '../config/supabaseClient';
import '../styles/portal-hub.css';

interface PortalHubProps {
  currentUser: User;
  onNavigateToUsers: () => void;
}

const DEFAULT_APPS: AppItem[] = [
  {
    id: 'sales',
    name: 'Sales Dashboard',
    subtitle: 'Revenue, performance & orders',
    url: 'https://tejawmd.github.io/SalesDashboard/',
    badge: 'Sales & Orders',
    color: '#1080a7',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'All'],
  },
  {
    id: 'manager',
    name: 'Manager Dashboard',
    subtitle: 'Team approvals & operations',
    url: 'https://tejawmd.github.io/ManagerDashboard/',
    badge: 'Management',
    color: '#bf944b',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'Logistics', 'Fin & Acc', 'QAQC', 'HR', 'All'],
  },
  {
    id: 'prediction',
    name: 'Prediction Sales',
    subtitle: 'AI forecast & market trends',
    url: 'https://wmgteja.github.io/PredictionSales/',
    badge: 'AI Forecasting',
    color: '#a55c2a',
    allowed_roles: ['admin'],
    allowed_departments: ['All', 'Sales'],
  },
];

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  sales: TrendingUp,
  manager: ShieldCheck,
  prediction: Sparkles,
};

export const PortalHub: React.FC<PortalHubProps> = ({
  currentUser,
  onNavigateToUsers,
}) => {
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [redirectingApp, setRedirectingApp] = useState<string | null>(null);

  useEffect(() => {
    // Fetch registered apps from Supabase
    async function loadApps() {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          setApps(data as AppItem[]);
        }
      } catch (err) {
        console.warn('Could not load apps from Supabase, using defaults', err);
      }
    }
    loadApps();
  }, []);

  const checkAppAccess = (app: AppItem): boolean => {
    // Admin has full access to all apps
    if (currentUser.role === 'admin') return true;

    // Explicit user permission list
    if (currentUser.accessible_apps && currentUser.accessible_apps.includes(app.id)) {
      return true;
    }

    // Role + Department rules
    const roleMatch = app.allowed_roles?.includes(currentUser.role);
    const deptMatch =
      currentUser.department === 'All' ||
      app.allowed_departments?.includes(currentUser.department);

    return Boolean(roleMatch && deptMatch);
  };

  const handleLaunch = (app: AppItem) => {
    if (!checkAppAccess(app)) return;

    setRedirectingApp(app.name);

    // Build signed SSO payload
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

    // Redirect to the destination website
    setTimeout(() => {
      window.location.href = destinationUrl;
    }, 400);
  };

  const visibleApps = apps;

  return (
    <div className="hub-container">
      {/* Simple Header */}
      <div>
        <h2 className="hub-title">
          Hello, {currentUser.name.split(' ')[0]} ✨
        </h2>
        <p className="hub-subtitle">
          Department: <span className="text-[#bf944b] font-bold">{currentUser.department}</span> • Role: <span className="text-[#193116] font-bold">{currentUser.role_label || currentUser.role}</span>
        </p>
      </div>

      {/* App Buttons */}
      <div className="hub-card-grid">
        {visibleApps.map((app) => {
          const Icon = ICON_MAP[app.id] || Sparkles;
          const hasAccess = checkAppAccess(app);

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => handleLaunch(app)}
              disabled={!hasAccess || Boolean(redirectingApp)}
              className="hub-bubbly-card group"
              style={{
                opacity: hasAccess ? 1 : 0.55,
                cursor: hasAccess ? 'pointer' : 'not-allowed',
              }}
            >
              {/* Top: Icon + Badge */}
              <div className="flex items-center justify-between w-full">
                <div
                  className="hub-card-icon-box"
                  style={{ backgroundColor: app.color }}
                >
                  <Icon className="w-7 h-7" />
                </div>

                <span
                  className="hub-card-tag"
                  style={{ backgroundColor: app.color }}
                >
                  {app.badge}
                </span>
              </div>

              {/* Middle: Name & Subtitle */}
              <div className="mt-6 w-full text-left">
                <h3 className="hub-card-name group-hover:text-[#bf944b]">
                  {app.name}
                </h3>
                <p className="hub-card-desc">
                  {app.subtitle}
                </p>
              </div>

              {/* Bottom: Action Pill */}
              <div className="hub-card-footer w-full">
                {hasAccess ? (
                  <>
                    <span className="text-xs font-extrabold text-[#193116]">
                      {redirectingApp === app.name ? 'Opening...' : 'Launch App'}
                    </span>
                    <div
                      className="hub-circle-arrow"
                      style={{ backgroundColor: app.color }}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[#83121c] font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>No Department Access</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback alert when redirecting */}
      {redirectingApp && (
        <div className="mt-8 p-4 rounded-2xl bg-[#193116] text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <span>🚀 Redirecting to {redirectingApp}...</span>
          <span className="text-[#bf944b]">Enjoy your session!</span>
        </div>
      )}

      {/* Manage permissions prompt for Admins */}
      {currentUser.role === 'admin' && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onNavigateToUsers}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold text-[#193116]/75 hover:text-[#193116] bg-[#bcbeab]/25 hover:bg-[#bcbeab]/40 transition-colors cursor-pointer border border-[#bcbeab]/40"
          >
            <Plus className="w-3.5 h-3.5 text-[#bf944b]" />
            <span>Manage Users & Team Access</span>
          </button>
        </div>
      )}
    </div>
  );
};
