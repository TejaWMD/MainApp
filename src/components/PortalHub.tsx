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
    name: 'Sales Dashboard',
    subtitle: 'Revenue & orders',
    url: 'https://tejawmd.github.io/SalesDashboard/',
    badge: 'Sales',
    color: '#1080a7',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'All'],
  },
  {
    id: 'manager',
    name: 'Manager Dashboard',
    subtitle: 'Approvals & operations',
    url: 'https://tejawmd.github.io/ManagerDashboard/',
    badge: 'Management',
    color: '#bf944b',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'Logistics', 'Fin & Acc', 'QAQC', 'HR', 'All'],
  },
  {
    id: 'prediction',
    name: 'Prediction Sales',
    subtitle: 'AI forecast & trends',
    url: 'https://wmgteja.github.io/PredictionSales/',
    badge: 'Forecasting',
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
  onLogout,
}) => {
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [redirectingApp, setRedirectingApp] = useState<string | null>(null);

  // Reset redirecting state when returning via browser Back button (bfcache / pageshow / popstate)
  useEffect(() => {
    const resetRedirectState = () => {
      setRedirectingApp(null);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRedirectingApp(null);
      }
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
    if (currentUser.role === 'admin') return true;
    if (currentUser.accessible_apps && currentUser.accessible_apps.includes(app.id)) {
      return true;
    }
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

    const fallbackTimer = window.setTimeout(() => {
      setRedirectingApp(null);
    }, 3000);

    window.setTimeout(() => {
      window.clearTimeout(fallbackTimer);
      window.location.href = destinationUrl;
    }, 200);
  };

  return (
    <div className="hub-wrapper">
      <div className="hub-container">
        {/* Top Bar */}
        <header className="hub-topbar">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hub-brand-logo">
              <img src={wmdLogo} alt="WMD Hub" />
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#193116] tracking-tight truncate">
              WMD <span className="text-[#bf944b]">Hub</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="hub-signout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Compact Greeting & Role/Department */}
        <section className="hub-greeting-card">
          <h2 className="hub-title truncate">
            Hello, {currentUser.name}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#193116]/8 text-[#193116] border border-[#193116]/15">
              <BadgeCheck className="w-3.5 h-3.5 text-[#a1a568]" />
              <span>{currentUser.role_label || currentUser.role}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#bf944b]/15 text-[#a55c2a] border border-[#bf944b]/30">
              <Briefcase className="w-3.5 h-3.5 text-[#bf944b]" />
              <span>{currentUser.department}</span>
            </span>
          </div>
        </section>

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
                className="hub-bubbly-card group"
                style={{
                  opacity: hasAccess ? 1 : 0.55,
                  cursor: hasAccess ? 'pointer' : 'not-allowed',
                }}
              >
                {/* Top: Icon + Badge */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div
                    className="hub-card-icon-box"
                    style={{ backgroundColor: app.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span
                    className="hub-card-tag"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.badge}
                  </span>
                </div>

                {/* Middle: Name & Short Subtitle */}
                <div className="mt-3.5 w-full text-left">
                  <h3 className="hub-card-name group-hover:text-[#bf944b]">
                    {app.name}
                  </h3>
                  <p className="hub-card-desc">
                    {app.subtitle}
                  </p>
                </div>

                {/* Bottom: Action */}
                <div className="hub-card-footer w-full">
                  {hasAccess ? (
                    <>
                      <span className="text-xs font-bold text-[#193116]">
                        {redirectingApp === app.name ? 'Opening...' : 'Open'}
                      </span>
                      <div
                        className="hub-circle-arrow"
                        style={{ backgroundColor: app.color }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[#83121c] font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Restricted</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </section>

        {/* Redirecting Toast */}
        {redirectingApp && (
          <div className="p-3.5 rounded-xl bg-[#193116] text-white text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-lg">
            <span>Opening {redirectingApp}...</span>
            <span className="text-[#bf944b] shrink-0">Redirecting</span>
          </div>
        )}
      </div>
    </div>
  );
};
