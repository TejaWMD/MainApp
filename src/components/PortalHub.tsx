import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, ShieldCheck, Sparkles, ArrowUpRight, Lock, LogOut, Briefcase, BadgeCheck, Bell, BellOff } from 'lucide-react';
import { User, AppItem } from '../types';
import { supabase } from '../config/supabaseClient';
import {
  getPushStatus,
  enablePushNotifications,
  disablePushNotifications,
  PushStatus,
} from '../utils/pushNotifications';
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
    id: 'prediction',
    name: 'Sales Prediction',
    url: 'https://wmgteja.github.io/PredictionSales/',
    badge: 'Forecasting',
    color: '#83121c',
    allowed_roles: ['admin'],
    allowed_departments: ['All', 'Sales'],
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
  prediction: Sparkles,
};

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

export const PortalHub: React.FC<PortalHubProps> = ({ currentUser, onLogout }) => {
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

  const buildAuthenticatedAppUrl = useCallback(
    (targetUrl: string): string => {
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
      const separator = targetUrl.includes('?') ? '&' : '?';
      return `${targetUrl}${separator}sso_token=${encodeURIComponent(ssoToken)}&_v=${Date.now()}`;
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

  const handleLaunch = useCallback(async (app: AppItem) => {
    if (!checkAppAccess(app)) return;
    const targetUrl = await resolveLaunchUrl(app.url);

    // Warm the browser HTTP cache for the child website so it always loads the newest deployment
    try {
      await fetch(targetUrl, { cache: 'reload', mode: 'no-cors' });
    } catch {
      // Ignore network errors
    }

    const destinationUrl = buildAuthenticatedAppUrl(targetUrl);
    activeSignatureRef.current = null;

    // Open inside the PWA's own full-screen shell so mobile OS browsers
    // do not show an external URL bar / close-banner sheet.
    window.history.pushState({ wmdActiveApp: app.id }, '');
    setIsAppLoading(true);
    setActiveApp({ app, baseUrl: targetUrl, url: destinationUrl });
  }, [apps, buildAuthenticatedAppUrl, currentUser]);

  // Sync push notification status on login / mount
  useEffect(() => {
    let cancelled = false;
    getPushStatus(currentUser.id).then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  // Open target app when launched from a notification tap (?app=manager or SW postMessage)
  useEffect(() => {
    const appId = pendingLaunchAppIdRef.current;
    if (!appId) return;
    const target = apps.find((a) => a.id === appId);
    if (!target) return;

    pendingLaunchAppIdRef.current = null;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('app');
    window.history.replaceState({}, '', cleanUrl.toString());
    void handleLaunch(target);
  }, [apps, handleLaunch]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WMD_OPEN_APP_FROM_NOTIFICATION') {
        const appId = event.data.appId || 'manager';
        const target = apps.find((a) => a.id === appId);
        if (target) {
          void handleLaunch(target);
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
      if (pushStatus?.isSubscribed) {
        const res = await disablePushNotifications(currentUser.id);
        setPushStatus(res.status);
        setPushBanner({ type: 'info', text: 'Push notifications turned off on this device.' });
      } else {
        const res = await enablePushNotifications(currentUser.id);
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
