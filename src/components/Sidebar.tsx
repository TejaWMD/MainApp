import React from 'react';
import { LayoutGrid, Users, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';
import '../styles/sidebar.css';

interface SidebarProps {
  currentUser: User;
  allUsers: User[];
  activeTab: 'hub' | 'users';
  setActiveTab: (tab: 'hub' | 'users') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  allUsers,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <aside className="sidebar-container">
      {/* Top: Logo & Navigation */}
      <div className="space-y-6">
        {/* Cute Bubbly Logo */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="sidebar-logo-icon">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#193116] leading-tight tracking-tight">
              Portal<span className="text-[#bf944b]">Hub</span>
            </h1>
            <p className="text-[11px] font-bold text-[#a1a568] tracking-wide">
              WMD Central Launcher
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="sidebar-profile-box">
          <div className="flex items-center gap-3">
            <div className="sidebar-user-avatar">
              <span className="text-xs font-black text-[#193116]">
                {currentUser.avatar_initials || currentUser.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#193116] truncate">
                {currentUser.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#bf944b]/20 text-[#a55c2a]">
                  {currentUser.role_label || currentUser.role}
                </span>
                <span className="text-[10px] font-bold text-[#193116]/60">
                  {currentUser.department}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <nav className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('hub')}
            className={`sidebar-nav-btn ${activeTab === 'hub' ? 'active' : ''}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Launchpad</span>
          </button>

          {/* Only Admins can see and access User Management */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`sidebar-nav-btn justify-between ${activeTab === 'users' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>Team & Access</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'users' ? 'bg-[#b4ad8f]/30 text-white' : 'bg-[#bcbeab]/40 text-[#193116]'
                }`}
              >
                {allUsers.length}
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom: Logout */}
      <div className="pt-4 border-t border-[#bcbeab]/30">
        <button
          type="button"
          onClick={onLogout}
          className="sidebar-logout-btn cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
