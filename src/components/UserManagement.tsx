import React, { useState } from 'react';
import { UserPlus, Search, User as UserIcon, Trash2, Eye, EyeOff } from 'lucide-react';
import { User, Role } from '../types';
import { AddUserModal } from './AddUserModal';
import '../styles/user-management.css';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onDeleteUser,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role_label || user.role).toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="users-container">
      {/* Header */}
      <div className="users-header">
        <div>
          <h2 className="users-title">Team Members</h2>
          <p className="text-xs font-bold text-[#193116]/60 mt-1">
            {users.length} members with platform credentials in Supabase
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="users-add-btn cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="users-search-box">
        <Search className="w-4 h-4 text-[#bcbeab] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search member by name, email, or department..."
          className="users-search-input"
        />
      </div>

      {/* Bubbly Table Container */}
      <div className="users-table-card">
        <div className="overflow-x-auto">
          <table className="users-table">
            <thead className="users-thead">
              <tr>
                <th className="users-th">Member</th>
                <th className="users-th">Role</th>
                <th className="users-th">Department</th>
                <th className="users-th">Password</th>
                <th className="users-th">Status</th>
                <th className="users-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bcbeab]/20 text-xs font-semibold text-[#193116]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#bcbeab]">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="users-tr">
                    {/* Member Name */}
                    <td className="users-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#b4ad8f]/30 text-[#193116] flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          {user.avatar_initials || user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#193116]">{user.name}</p>
                          <p className="text-[11px] font-medium text-[#193116]/55 font-mono">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="users-td">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                          user.role
                        )}`}
                      >
                        {user.role_label || user.role}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="users-td">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#bcbeab]/25 text-[#193116]/85 text-[11px] font-semibold">
                        {user.department}
                      </span>
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
                        onClick={() => onToggleStatus(user.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                          user.status === 'Active'
                            ? 'bg-[#193116]/10 text-[#193116] hover:bg-[#193116]/20'
                            : 'bg-[#bcbeab]/30 text-[#193116]/50 hover:bg-[#bcbeab]/50'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active' ? 'bg-[#193116]' : 'bg-[#bcbeab]'
                          }`}
                        />
                        {user.status}
                      </button>
                    </td>

                    {/* Action */}
                    <td className="users-td text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteUser(user.id)}
                        className="p-2 rounded-xl text-[#83121c]/70 hover:text-[#83121c] hover:bg-[#83121c]/10 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddUser={onAddUser}
      />
    </div>
  );
};
