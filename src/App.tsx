import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { PortalHub } from './components/PortalHub';
import { RestrictedPage } from './components/RestrictedPage';
import { User } from './types';
import { supabase } from './config/supabaseClient';
import './styles/global.css';

function checkIsRestrictedUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    params.get('restricted') === 'true' ||
    params.get('restricted') === '1' ||
    hash.includes('restricted') ||
    path.endsWith('/restricted')
  );
}

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('portal_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('portal_current_user');
      return null;
    }
  });

  const [isRestricted, setIsRestricted] = useState<boolean>(checkIsRestrictedUrl);

  useEffect(() => {
    const syncRestricted = () => setIsRestricted(checkIsRestrictedUrl());
    window.addEventListener('popstate', syncRestricted);
    window.addEventListener('hashchange', syncRestricted);
    return () => {
      window.removeEventListener('popstate', syncRestricted);
      window.removeEventListener('hashchange', syncRestricted);
    };
  }, []);

  // Keep current user status synced with Supabase realtime updates
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`public:users:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${currentUser.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            handleLogout();
          } else if (payload.new) {
            const updated = payload.new as User;
            if (updated.status === 'Inactive') {
              alert('Your account has been deactivated.');
              handleLogout();
            } else {
              setCurrentUser(updated);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Persist logged-in user in localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('portal_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('portal_current_user');
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('portal_current_user');
  };

  const handleGoToHub = () => {
    const cleanUrl = window.location.href.split('?')[0].split('#')[0];
    window.history.replaceState({}, '', cleanUrl);
    setIsRestricted(false);
  };

  if (isRestricted) {
    return <RestrictedPage onGoToHub={handleGoToHub} />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <PortalHub currentUser={currentUser} onLogout={handleLogout} />;
};

export default App;
