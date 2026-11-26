import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { User, Role, WEBSITE_CATALOG, UserSyncResults } from '../types';
import { AddUserModal } from './AddUserModal';
import '../styles/user-management.css';

interface UserManagementProps {
  users: User[];
  isLoading?: boolean;
  onSaveUser: (user: User) => Promise<{ ok: boolean; error?: string; results?: UserSyncResults }>;
  onToggleStatus: (userId: string) => Promise<{ ok: boolean; error?: string; results?: UserSyncResults }>;
  onResyncUser: (userId: string) => Promise<{ ok: boolean; error?: string; results?: UserSyncResults }>;
}

const SYNC_LABELS: Array<{ key: keyof UserSyncResults; label: string }> = [
  { key: 'mainapp', label: 'MainApp' },
  { key: 'manager', label: 'Query Portal' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'sales', label: 'Sales & Collection' },
  { key: 'qaqc', label: 'Factory (QAQC)' },
];

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  isLoading = false,
  onSaveUser,
  onToggleStatus,
  onResyncUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<{
    title: string;
    results?: UserSyncResults;
    error?: string;
  } | null>(null);

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    return (
      user.id.toLowerCase().includes(q) ||
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.department.toLowerCase().includes(q) ||
      (user.role_label || user.role).toLowerCase().includes(q)
    );
  });

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-[#83121c]/15 text-[#83121c] border-[#83121c]/30';
      case 'manager':
        return 'bg-[#bf944b]/20 text-[#bf944b] border-[#bf944b]/30';
      case 'account_manager':
        return 'bg-[#1080a7]/15 text-[#1080a7] border-[#1080a7]/30';
      default:
        return 'bg-[#a1a568]/20 text-[#193116] border-[#a1a568]/30';
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleModalSave = async (user: User) => {
    const res = await onSaveUser(user);
    if (res.ok) {
      setSyncReport({
        title: `${user.name} (${user.id}) saved & synced`,
        results: res.results,
      });
    } else {
      setSyncReport({
        title: `Failed to save ${user.name}`,
        error: res.error,
      });
    }
    return res;
  };

  const handleStatusClick = async (user: User) => {
    if (busyUserId) return;
    setBusyUserId(user.id);
    try {
      const res = await onToggleStatus(user.id);
      if (res.ok) {
        setSyncReport({
          title: `Updated status for ${user.name}`,
          results: res.results,
        });
      } else {
        setSyncReport({
          title: `Status update failed for ${user.name}`,
          error: res.error,
        });
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const handleResyncClick = async (user: User) => {
    if (busyUserId) return;
    setBusyUserId(user.id);
    try {
      const res = await onResyncUser(user.id);
      if (res.ok) {
        setSyncReport({
          title: `Re-synced ${user.name} across websites`,
          results: res.results,
        });
      } else {
        setSyncReport({
          title: `Re-sync failed for ${user.name}`,
          error: res.error,
        });
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const getUserApps = (user: User): string[] => {
    if (user.role === 'admin') return WEBSITE_CATALOG.map((w) => w.id);
    return Array.from(
      new Set(
        (user.accessible_apps || []).map((a) => (a === 'prediction' ? 'purchase' : a))
      )
    );
  };

  return (
    <div className="users-container">
      {/* Header */}
      <div className="users-header">
        <div>
          <h2 className="users-title">Team & Website Access</h2>
          <p className="text-xs font-bold text-[#193116]/60 mt-1">
            {users.length} total members in MainApp — synced safely to individual websites
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="users-add-btn cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Backend Sync Result Banner */}
      {syncReport && (
        <div
          className={`rounded-2xl p-4 border text-xs ${
            syncReport.error
              ? 'bg-[#83121c]/8 border-[#83121c]/25 text-[#83121c]'
              : 'bg-white/90 border-[#193116]/20 text-[#193116]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 font-extrabold">
              {syncReport.error ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] flex-shrink-0" />
              )}
              <span>{syncReport.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncReport(null)}
              className="text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer px-1"
              aria-label="Dismiss sync report"
            >
              ×
            </button>
          </div>

          {syncReport.error && <p className="font-semibold">{syncReport.error}</p>}

          {syncReport.results && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
              {SYNC_LABELS.map(({ key, label }) => {
                const item = syncReport.results?.[key];
                if (!item) return null;
                return (
                  <div
                    key={key}
                    className={`px-3 py-2 rounded-xl border ${
                      item.ok
                        ? 'bg-[#0f766e]/5 border-[#0f766e]/20'
                        : 'bg-[#83121c]/8 border-[#83121c]/25 text-[#83121c]'
                    }`}
                  >
                    <p className="font-extrabold text-[11px]">
                      {item.ok ? '✓' : '✕'} {label}
                    </p>
                    <p className="text-[10px] opacity-80 mt-0.5 leading-snug">{item.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="users-search-box">
        <Search className="w-4 h-4 text-[#bcbeab] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search member by ID, name, email, role, or department..."
          className="users-search-input"
        />
      </div>

      {/* Table Container */}
      <div className="users-table-card">
        <div className="overflow-x-auto">
          <table className="users-table">
            <thead className="users-thead">
              <tr>
                <th className="users-th">Member</th>
                <th className="users-th">Role & Dept</th>
                <th className="users-th">Website Access</th>
                <th className="users-th">Password</th>
                <th className="users-th">Status</th>
                <th className="users-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bcbeab]/20 text-xs font-semibold text-[#193116]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#193116]/60">
                    Loading team members…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#bcbeab]">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userApps = getUserApps(user);
                  const isBusy = busyUserId === user.id;

                  return (
                    <tr key={user.id} className="users-tr">
                      {/* Member Name & ID */}
                      <td className="users-td">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#b4ad8f]/30 text-[#193116] flex items-center justify-center flex-shrink-0 font-bold text-xs">
                            {user.avatar_initials || user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-[#193116]">{user.name}</p>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#bcbeab]/25 text-[#193116]/70">
                                {user.id}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-[#193116]/55 font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="users-td">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                              user.role
                            )}`}
                          >
                            {user.role_label || user.role}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-[#bcbeab]/25 text-[#193116]/85 text-[10px] font-semibold">
                            {user.department}
                          </span>
                        </div>
                      </td>

                      {/* Website Access */}
                      <td className="users-td">
                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                          {userApps.length === 0 ? (
                            <span className="text-[10px] text-[#193116]/45 italic">No website access</span>
                          ) : (
                            WEBSITE_CATALOG.filter((w) => userApps.includes(w.id)).map((site) => (
                              <span
                                key={site.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${site.color}16`,
                                  color: site.color,
                                  border: `1px solid ${site.color}38`,
                                }}
                              >
                                {site.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Password */}
                      <td className="users-td font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span>
                            {revealedPasswords[user.id]
                              ? user.password || '••••••'
                              : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordReveal(user.id)}
                            className="text-[#bcbeab] hover:text-[#193116] p-1 cursor-pointer"
                            title={revealedPasswords[user.id] ? 'Hide password' : 'Show password'}
                          >
                            {revealedPasswords[user.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="users-td">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusClick(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                            user.status === 'Active'
                              ? 'bg-[#193116]/10 text-[#193116] hover:bg-[#193116]/20'
                              : 'bg-[#bcbeab]/30 text-[#193116]/50 hover:bg-[#bcbeab]/50'
                          }`}
                          title="Click to toggle Active / Inactive (preserves child website history)"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'Active' ? 'bg-[#193116]' : 'bg-[#bcbeab]'
                            }`}
                          />
                          {user.status}
                        </button>
                      </td>

                      {/* Actions: Edit & Re-sync */}
                      <td className="users-td text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleOpenEdit(user)}
                            className="p-2 rounded-xl text-[#193116]/70 hover:text-[#193116] hover:bg-[#bcbeab]/25 transition-colors cursor-pointer disabled:opacity-40"
                            title="Edit member & website access"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleResyncClick(user)}
                            className="p-2 rounded-xl text-[#0f766e]/80 hover:text-[#0f766e] hover:bg-[#0f766e]/10 transition-colors cursor-pointer disabled:opacity-40"
                            title="Re-sync member to granted websites"
                          >
                            <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveUser={handleModalSave}
        initialUser={editingUser}
      />
    </div>
  );
};
