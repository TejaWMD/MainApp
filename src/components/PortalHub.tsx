import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  ClipboardCheck,
  ArrowUpRight,
  Lock,
  LogOut,
  Briefcase,
  BadgeCheck,
  Bell,
  BellOff,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { User, AppItem } from '../types';
import { supabase } from '../config/supabaseClient';
import {
  getPushStatus,
  enablePushNotifications,
  disablePushNotifications,
  PushStatus,
} from '../utils/pushNotifications';
import {
  upsertUserAndSync,
  toggleUserStatusAndSync,
  resyncUserToApps,
} from '../utils/userSync';
import { UserManagement } from './UserManagement';
import wmdLogo from '../assets/wmd-logo.jpg';
import '../styles/portal-hub.css';

interface PortalHubProps {
  currentUser: User;
  onLogout: () => void;
}

const DEFAULT_APPS: AppItem[] = [
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
    id: 'purchase',
    name: 'Purchase',
    url: 'https://wmgteja.github.io/PredictionSales/',
    badge: 'Purchase',
    color: '#83121c',
    allowed_roles: ['admin'],
    allowed_departments: ['All', 'Purchase'],
  },
    {
    id: 'qaqc',
    name: 'Factory (QAQC)',
    subtitle: 'Factory QA/QC',
    url: 'https://tejawmd.github.io/QAQCWeb/',
    badge: 'QAQC',
    color: '#0f766e',
    allowed_roles: ['admin'],
    allowed_departments: ['All'],
  },
  {
    id: 'sales',
    name: 'Sales & Collection',
    url: 'https://tejawmd.github.io/SalesDashboard/',
    badge: 'Sales & Collection',
    color: '#1080a7',
    allowed_roles: ['admin', 'manager', 'account_manager'],
    allowed_departments: ['Sales', 'All'],
  }
];

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  sales: TrendingUp,
  manager: ShieldCheck,
  purchase: ShoppingCart,
  prediction: ShoppingCart,
  qaqc: ClipboardCheck,
};

const APP_DISPLAY_ORDER = ['manager', 'purchase', 'qaqc', 'sales'];

function sortAppsForDisplay(items: AppItem[]): AppItem[] {
  return [...items].sort((a, b) => {
    const idxA = APP_DISPLAY_ORDER.indexOf(a.id);
    const idxB = APP_DISPLAY_ORDER.indexOf(b.id);
    const rankA = idxA === -1 ? APP_DISPLAY_ORDER.length : idxA;
    const rankB = idxB === -1 ? APP_DISPLAY_ORDER.length : idxB;
    return rankA - rankB;
  });
}

function normalizeAppRecord(app: AppItem): AppItem {
  if (app.id === 'prediction' || app.id === 'purchase') {
    return {
      ...app,
      id: 'purchase',
      name: 'Purchase',
      badge: app.badge === 'Forecasting' ? 'Purchase' : app.badge || 'Purchase',
    };
  }
  if (app.id === 'qaqc') {
    return {
      ...app,
      name: 'Factory (QAQC)',
    };
  }
  return app;
}

async function fetchChildSiteSignature(baseUrl: string): Promise<string | null> {
  if (!navigator.onLine) return null;
  try {
    const probeUrl = new URL(baseUrl);
    probeUrl.searchParams.set('_t', String(Date.now()));
    const response = await fetch(probeUrl.toString(), {
      cache: 'no-store',
      headers: {
        pragma: 'no-cache',
        'cache-control': 'no-cache, no-store, must-revalidate',
      },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const assetMatches = Array.from(
      html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)[^"']*)["']/gi),
      (m) => m[1]
    ).join('|');
    const etag = response.headers.get('etag') || '';
    const lastModified = response.headers.get('last-modified') || '';

    return `${assetMatches}::${etag}::${lastModified}` || html.slice(0, 500);
  } catch {
    return null;
  }
}

const TEAM_ACCESS_OWNER_EMAIL = 'wmgteja@gmail.com';

export const PortalHub: React.FC<PortalHubProps> = ({ currentUser, onLogout }) => {
  const canManageTeam =
    currentUser.role === 'admin' &&
    currentUser.email.trim().toLowerCase() === TEAM_ACCESS_OWNER_EMAIL;
  const [activeView, setActiveView] = useState<'hub' | 'users'>('hub');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [activeApp, setActiveApp] = useState<{
    app: AppItem;
    baseUrl: string;
    url: string;
  } | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [pushBanner, setPushBanner] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeSignatureRef = useRef<string | null>(null);
  const pendingLaunchAppIdRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('app')
  );
  const pendingLaunchPathRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('path')
  );

  const buildAuthenticatedAppUrl = useCallback(
    (targetUrl: string, hashPath?: string | null): string => {
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
      const [baseWithoutHash, existingHash] = targetUrl.split('#');
      const separator = baseWithoutHash.includes('?') ? '&' : '?';
      const normalizedHash = hashPath
        ? `#${hashPath.startsWith('/') ? hashPath : `/${hashPath}`}`
        : existingHash
          ? `#${existingHash}`
          : '';
      return `${baseWithoutHash}${separator}sso_token=${encodeURIComponent(ssoToken)}&_v=${Date.now()}${normalizedHash}`;
    },
    [currentUser]
  );

  const closeActiveApp = useCallback((fromPopState = false) => {
    setActiveApp(null);
    setIsAppLoading(false);
    activeSignatureRef.current = null;
    if (!fromPopState && window.history.state?.wmdActiveApp) {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (activeApp) {
        closeActiveApp(true);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'WMD_RETURN_TO_HUB') {
        if (event.data.restricted) {
          window.location.search = '?restricted=true';
          return;
        }
        closeActiveApp(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('message', handleMessage);
    };
  }, [activeApp, closeActiveApp]);

  // Monitor the currently open child website for new GitHub Pages deployments
  useEffect(() => {
    if (!activeApp) return;

    let cancelled = false;

    const checkChildWebsiteUpdate = async () => {
      const latestSignature = await fetchChildSiteSignature(activeApp.baseUrl);
      if (cancelled || !latestSignature) return;

      if (!activeSignatureRef.current) {
        activeSignatureRef.current = latestSignature;
        return;
      }

      if (latestSignature !== activeSignatureRef.current) {
        activeSignatureRef.current = latestSignature;
        try {
          await fetch(activeApp.baseUrl, { cache: 'reload', mode: 'no-cors' });
        } catch {
          // Ignore cache reload errors
        }
        setActiveApp((prev) =>
          prev
            ? {
                ...prev,
                url: buildAuthenticatedAppUrl(prev.baseUrl),
              }
            : null
        );
      }
    };

    void checkChildWebsiteUpdate();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkChildWebsiteUpdate();
      }
    };
    const handleFocus = () => {
      void checkChildWebsiteUpdate();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    const intervalId = window.setInterval(() => {
      void checkChildWebsiteUpdate();
    }, 60 * 1000);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [activeApp?.baseUrl, buildAuthenticatedAppUrl]);

  useEffect(() => {
    async function loadApps() {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .eq('is_active', true);
        if (!error && data && data.length > 0) {
          const normalized = (data as AppItem[]).map(normalizeAppRecord);
          const deduped = Array.from(
            new Map(normalized.map((item) => [item.id, item])).values()
          );
          setApps(sortAppsForDisplay(deduped));
        }
      } catch (err) {
        console.warn('Could not load apps from Supabase, using defaults', err);
      }
    }
    loadApps();
  }, []);

  const loadAllUsers = useCallback(async () => {
    if (!canManageTeam) return;
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setAllUsers(data as User[]);
      }
    } catch (err) {
      console.warn('Could not load users from Supabase', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [canManageTeam]);

  useEffect(() => {
    if (canManageTeam && activeView === 'users') {
      void loadAllUsers();
    }
  }, [canManageTeam, activeView, loadAllUsers]);

  const handleSaveUser = async (user: User) => {
    const res = await upsertUserAndSync(currentUser, user);
    if (res.ok) {
      await loadAllUsers();
    }
    return res;
  };

  const handleToggleUserStatus = async (userId: string) => {
    const res = await toggleUserStatusAndSync(currentUser, userId);
    if (res.ok) {
      await loadAllUsers();
    }
    return res;
  };

  const handleResyncUser = async (userId: string) => {
    const res = await resyncUserToApps(currentUser, userId);
    if (res.ok) {
      await loadAllUsers();
    }
    return res;
  };

  const checkAppAccess = (app: AppItem): boolean => {
    if (currentUser.role === 'admin') return true;
    // ManagerDashboard (Query Portal) is strictly not for staff
    if (app.id === 'manager' && currentUser.role === 'staff') return false;
    const userApps = Array.isArray(currentUser.accessible_apps)
      ? currentUser.accessible_apps
      : [];
    if (userApps.includes(app.id)) return true;
    // Backward-compatibility during transition if DB still has 'prediction'
    if (app.id === 'purchase' && userApps.includes('prediction')) return true;
    return false;
  };

  const resolveLaunchUrl = async (defaultUrl: string): Promise<string> => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalhost) return defaultUrl;

    const localUrl = 'http://localhost:5174/';
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 400);

    try {
      await fetch(localUrl, { mode: 'no-cors', signal: controller.signal });
      return localUrl;
    } catch {
      return defaultUrl;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const handleLaunch = useCallback(async (app: AppItem, hashPath?: string | null) => {
    if (!checkAppAccess(app)) return;
    const targetUrl = await resolveLaunchUrl(app.url);

    // Warm the browser HTTP cache for the child website so it always loads the newest deployment
    try {
      await fetch(targetUrl, { cache: 'reload', mode: 'no-cors' });
    } catch {
      // Ignore network errors
    }

    const destinationUrl = buildAuthenticatedAppUrl(targetUrl, hashPath);
    activeSignatureRef.current = null;

    // Open inside the PWA's own full-screen shell so mobile OS browsers
    // do not show an external URL bar / close-banner sheet.
    window.history.pushState({ wmdActiveApp: app.id }, '');
    setIsAppLoading(true);
    setActiveApp({ app, baseUrl: targetUrl, url: destinationUrl });
  }, [apps, buildAuthenticatedAppUrl, currentUser]);

  const getPushContext = useCallback(() => {
    const managerApp = apps.find((a) => a.id === 'manager');
    const qaqcApp = apps.find((a) => a.id === 'qaqc');
    return {
      userId: currentUser.id,
      userEmail: currentUser.email,
      hasManagerAccess: managerApp ? checkAppAccess(managerApp) : false,
      hasQaqcAccess: qaqcApp ? checkAppAccess(qaqcApp) : false,
    };
  }, [apps, currentUser]);

  // Sync push notification status on login / mount / apps loaded
  useEffect(() => {
    let cancelled = false;
    getPushStatus(getPushContext()).then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [getPushContext]);

  // Open target app when launched from a notification tap (?app=manager or ?app=qaqc&path=/downtime)
  useEffect(() => {
    const appId = pendingLaunchAppIdRef.current;
    if (!appId) return;
    const target = apps.find((a) => a.id === appId);
    if (!target) return;

    const hashPath = pendingLaunchPathRef.current;
    pendingLaunchAppIdRef.current = null;
    pendingLaunchPathRef.current = null;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('app');
    cleanUrl.searchParams.delete('path');
    window.history.replaceState({}, '', cleanUrl.toString());
    void handleLaunch(target, hashPath);
  }, [apps, handleLaunch]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WMD_OPEN_APP_FROM_NOTIFICATION') {
        const appId = event.data.appId || 'manager';
        const hashPath = typeof event.data.path === 'string' ? event.data.path : null;
        const target = apps.find((a) => a.id === appId);
        if (target) {
          void handleLaunch(target, hashPath);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [apps, handleLaunch]);

  const handleTogglePush = async () => {
    if (isPushBusy) return;
    setIsPushBusy(true);
    setPushBanner(null);

    try {
      const pushCtx = getPushContext();
      if (pushStatus?.isSubscribed) {
        const res = await disablePushNotifications(pushCtx);
        setPushStatus(res.status);
        setPushBanner({ type: 'info', text: 'Push notifications turned off on this device.' });
      } else {
        const res = await enablePushNotifications(pushCtx);
        setPushStatus(res.status);
        if (res.ok) {
          setPushBanner({
            type: 'info',
            text: 'Push notifications enabled! Alerts will pop up even when WMD Hub is closed.',
          });
        } else if (res.message) {
          setPushBanner({ type: 'error', text: res.message });
        }
      }
    } finally {
      setIsPushBusy(false);
    }
  };

  const handleIframeLoad = () => {
    setIsAppLoading(false);
    try {
      const frameLocation = iframeRef.current?.contentWindow?.location;
      if (!frameLocation) return;
      const mainPath = window.location.pathname.replace(/\/+$/, '') || '/';
      const framePath = frameLocation.pathname.replace(/\/+$/, '') || '/';
      if (frameLocation.origin === window.location.origin && framePath === mainPath) {
        closeActiveApp(false);
      }
    } catch {
      // Cross-origin frame is expected for apps hosted on another origin.
    }
  };

  const accessibleCount = apps.filter(checkAppAccess).length;

  return (
    <div className="hub-wrapper">
      <div className="hub-container">
        {/* Top Bar */}
        <header className="hub-topbar">
          <div className="hub-brand">
            <h1 className="hub-brand-title">
              WMD <span className="hub-brand-accent">Hub</span>
            </h1>
          </div>

          <div className="hub-topbar-actions">
            {canManageTeam && (
              <button
                type="button"
                onClick={() => setActiveView((prev) => (prev === 'users' ? 'hub' : 'users'))}
                className={`hub-notify-btn ${activeView === 'users' ? 'is-enabled' : ''}`}
                title={
                  activeView === 'users'
                    ? 'Back to Workspaces Hub'
                    : 'Manage Team Members & Website Access'
                }
              >
                {activeView === 'users' ? (
                  <LayoutGrid className="hub-notify-icon" />
                ) : (
                  <Users className="hub-notify-icon" />
                )}
                <span className="hub-notify-label">
                  {activeView === 'users' ? 'Workspaces' : 'Team & Access'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={isPushBusy}
              className={`hub-notify-btn ${pushStatus?.isSubscribed ? 'is-enabled' : ''}`}
              title={
                pushStatus?.isSubscribed
                  ? 'Notifications enabled on this device (click to disable)'
                  : 'Enable push notifications on this device'
              }
            >
              {pushStatus?.isSubscribed ? (
                <Bell className="hub-notify-icon" />
              ) : (
                <BellOff className="hub-notify-icon" />
              )}
              <span className="hub-notify-label">
                {isPushBusy
                  ? 'Saving…'
                  : pushStatus?.isSubscribed
                    ? 'Alerts On'
                    : 'Enable Alerts'}
              </span>
            </button>
            <button type="button" onClick={onLogout} className="hub-signout-btn">
              <LogOut className="hub-signout-icon" />
              <span className="hub-signout-label">Sign Out</span>
            </button>
            <div className="hub-brand-logo">
              <img src={wmdLogo} alt="WMD Hub" />
            </div>
          </div>
        </header>

        {pushBanner && (
          <div className={`hub-push-banner ${pushBanner.type === 'error' ? 'is-error' : 'is-info'}`}>
            <span>{pushBanner.text}</span>
            <button
              type="button"
              className="hub-push-banner-close"
              onClick={() => setPushBanner(null)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {canManageTeam && activeView === 'users' ? (
          <UserManagement
            users={allUsers}
            isLoading={isLoadingUsers}
            onSaveUser={handleSaveUser}
            onToggleStatus={handleToggleUserStatus}
            onResyncUser={handleResyncUser}
          />
        ) : (
          <>
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
                const Icon = ICON_MAP[app.id] || ShoppingCart;
                const hasAccess = checkAppAccess(app);

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleLaunch(app)}
                    disabled={!hasAccess}
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
                          <span className="hub-card-cta">Open</span>
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
          </>
        )}
      </div>

      {activeApp && (
        <div className="app-shell-overlay" role="dialog" aria-label={activeApp.app.name}>
          {isAppLoading && (
            <div className="app-shell-loader">
              <img src={wmdLogo} alt="WMD Hub" className="app-shell-loader-logo" />
              <div className="app-shell-spinner" aria-hidden="true" />
              <p className="app-shell-loader-text">Opening {activeApp.app.name}…</p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={activeApp.url}
            title={activeApp.app.name}
            className="app-shell-iframe"
            allow="clipboard-read; clipboard-write; fullscreen; geolocation; camera; microphone"
            onLoad={handleIframeLoad}
          />
        </div>
      )}
    </div>
  );
};
