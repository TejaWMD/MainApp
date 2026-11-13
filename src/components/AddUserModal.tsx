import React, { useState } from 'react';
import { X, UserPlus, User as UserIcon, Lock, Mail, Phone, Building } from 'lucide-react';
import { User, Role } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: User) => void;
}

const ROLES_LIST: { role: Role; label: string }[] = [
  { role: 'account_manager', label: 'Account Manager' },
  { role: 'manager', label: 'Manager' },
  { role: 'admin', label: 'Admin' },
];

const DEPARTMENTS_LIST = ['Sales', 'Logistics', 'Fin & Acc', 'QAQC', 'HR', 'All'];

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('account_manager');
  const [department, setDepartment] = useState('Sales');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    const roleObj = ROLES_LIST.find((r) => r.role === role);
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // Default accessible apps based on role & dept
    const accessibleApps =
      role === 'admin'
        ? ['sales', 'manager', 'prediction']
        : department === 'Sales'
        ? ['sales', 'manager']
        : ['manager'];

    const newUser: User = {
      id: `${role === 'admin' ? 'adm' : role === 'manager' ? 'mgr' : 'am'}-${Date.now().toString().slice(-4)}`,
      name,
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role,
      role_label: roleObj?.label || 'Staff',
      department,
      avatar_initials: initials || 'WM',
      phone: phone.trim() || null,
      status: 'Active',
      accessible_apps: accessibleApps,
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193116]/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] max-w-md w-full p-7 shadow-2xl border border-[#bcbeab]/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#bf944b]/20 text-[#bf944b] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#193116]">Add Team Member</h3>
              <p className="text-xs font-semibold text-[#193116]/60">Create new user credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#193116]/40 hover:text-[#193116] hover:bg-[#bcbeab]/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b]"
                required
              />
              <UserIcon className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b]"
                required
              />
              <Mail className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1">Initial Password / PIN</label>
            <div className="relative">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. 180403"
                className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b]"
                required
              />
              <Lock className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#193116] mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#bcbeab]/60 bg-white text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b] cursor-pointer"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#193116] mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#bcbeab]/60 bg-white text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b] cursor-pointer"
              >
                {DEPARTMENTS_LIST.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#193116] mb-1">Phone (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+6019..."
                className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b]"
              />
              <Phone className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#bcbeab]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#193116]/70 hover:bg-[#bcbeab]/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-[#193116] hover:bg-[#193116]/90 shadow-md transition-all cursor-pointer"
            >
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
