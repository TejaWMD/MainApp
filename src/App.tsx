import React, { useState, useEffect, useCallback } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { PortalHub } from './components/PortalHub';
import { UserManagement } from './components/UserManagement';
import { User } from './types';
import { supabase } from './config/supabaseClient';
import './styles/global.css';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('portal_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'hub' | 'users'>('hub');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch users from Supabase Central Database
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        setUsers(data as User[]);
      }
    } catch (err) {
      console.error('Error fetching users from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime updates on users table
    const channel = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

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
    setActiveTab('hub');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('portal_current_user');
  };

  const handleAddUser = async (newUser: User) => {
    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) {
        alert(`Error adding user: ${error.message}`);
        return;
      }
      setUsers((prev) => [...prev, newUser]);
    } catch (err: any) {
      alert(`Failed to add user: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (users.length <= 1) {
      alert('You cannot remove the last remaining member.');
      return;
    }
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) {
        alert(`Error deleting user: ${error.message}`);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUser?.id === userId) {
        handleLogout();
      }
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const newStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        alert(`Error updating status: ${error.message}`);
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );

      if (currentUser?.id === userId && newStatus === 'Inactive') {
        alert('Your account has been deactivated.');
        handleLogout();
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar with Profile & Navigation */}
      <Sidebar
        currentUser={currentUser}
        allUsers={users}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'hub' ? (
          <PortalHub
            currentUser={currentUser}
            onNavigateToUsers={() => setActiveTab('users')}
          />
        ) : (
          currentUser.role === 'admin' && (
            <UserManagement
              users={users}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleStatus}
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;
