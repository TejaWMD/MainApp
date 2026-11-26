import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, User as UserIcon, Lock, Mail, Phone, Hash, Globe } from 'lucide-react';
import { User, Role, WEBSITE_CATALOG } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUser: (user: User) => Promise<{ ok: boolean; error?: string }>;
  initialUser?: User | null;
}

const ROLES_LIST: { role: Role; label: string }[] = [
  { role: 'staff', label: 'Staff' },
  { role: 'account_manager', label: 'Account Manager' },
  { role: 'manager', label: 'Manager' },
  { role: 'admin', label: 'Admin' },
];

const DEPARTMENTS_LIST = ['Sales', 'Logistics', 'Fin & Acc', 'QAQC', 'Purchase', 'HR', 'All'];

function generateDefaultId(role: Role): string {
  const prefix =
    role === 'admin' ? 'adm' : role === 'manager' ? 'mgr' : role === 'account_manager' ? 'am' : 'stf';
  return `${prefix}-${Date.now().toString().slice(-4)}`;
}

function normalizeAppsList(apps?: string[]): string[] {
  if (!Array.isArray(apps)) return [];
  return Array.from(
    new Set(apps.map((a) => (a === 'prediction' ? 'purchase' : a)))
  );
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSaveUser,
  initialUser = null,
}) => {
  const isEditing = Boolean(initialUser);

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [department, setDepartment] = useState('QAQC');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [accessibleApps, setAccessibleApps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setIsSaving(false);

    if (initialUser) {
      setUserId(initialUser.id);
      setName(initialUser.name || '');
      setEmail(initialUser.email || '');
      setPassword(initialUser.password || '');
      setRole(initialUser.role);
      setDepartment(initialUser.department || 'All');
      setPhone(initialUser.phone || '');
      setStatus(initialUser.status === 'Inactive' ? 'Inactive' : 'Active');
      const normalized = normalizeAppsList(initialUser.accessible_apps);
      setAccessibleApps(
        initialUser.role === 'admin'
          ? WEBSITE_CATALOG.map((w) => w.id)
          : initialUser.role === 'staff'
            ? normalized.filter((a) => a !== 'manager')
            : normalized
      );
    } else {
      setRole('staff');
      setUserId(generateDefaultId('staff'));
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('QAQC');
      setPhone('');
      setStatus('Active');
      setAccessibleApps([]);
    }
  }, [isOpen, initialUser]);

  if (!isOpen) return null;

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    if (!isEditing) {
      setUserId(generateDefaultId(nextRole));
    }
    if (nextRole === 'admin') {
      setAccessibleApps(WEBSITE_CATALOG.map((w) => w.id));
    } else if (nextRole === 'staff') {
      setAccessibleApps((prev) => prev.filter((id) => id !== 'manager'));
    }
  };

  const toggleAppAccess = (appId: string) => {
    if (role === 'admin') return;
    if (role === 'staff' && appId === 'manager') return;

    setAccessibleApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanId = userId.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanId || !cleanName || !cleanEmail) {
      setFormError('ID, full name, and email are required.');
      return;
    }

    if (!isEditing && !cleanPassword) {
      setFormError('Password is required for a new user.');
      return;
    }

    const roleObj = ROLES_LIST.find((r) => r.role === role);
    const initials =
      cleanName
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'WM';

    const finalApps =
      role === 'admin'
        ? WEBSITE_CATALOG.map((w) => w.id)
        : role === 'staff'
          ? accessibleApps.filter((a) => a !== 'manager')
          : accessibleApps;

    const payload: User = {
      id: cleanId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword || initialUser?.password || '',
      role,
      role_label: roleObj?.label || 'Staff',
      department,
      avatar_initials: initials,
      phone: phone.trim() || null,
      status,
      accessible_apps: finalApps,
    };

    setIsSaving(true);
    try {
      const res = await onSaveUser(payload);
      if (res.ok) {
        onClose();
      } else {
        setFormError(res.error || 'Could not save user. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#193116]/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#bcbeab]/40 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#bf944b]/20 text-[#bf944b] flex items-center justify-center">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#193116]">
                {isEditing ? 'Edit Team Member & Access' : 'Add Team Member'}
              </h3>
              <p className="text-xs font-semibold text-[#193116]/60">
                Saves to MainApp and syncs automatically to selected websites
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-[#193116]/40 hover:text-[#193116] hover:bg-[#bcbeab]/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-[#83121c]/10 border border-[#83121c]/25 text-[#83121c] text-xs font-bold">
            {formError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#193116] mb-1">
                User ID {isEditing && <span className="text-[10px] font-semibold text-[#193116]/50">(locked)</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isEditing}
                  placeholder="e.g. mgr-9 or stf-101"
                  className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-mono font-bold text-[#193116] focus:outline-none focus:border-[#bf944b] disabled:opacity-60 disabled:bg-[#bcbeab]/15"
                  required
                />
                <Hash className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="block text-xs font-bold text-[#193116] mb-1">
                {isEditing ? 'Password / PIN' : 'Initial Password / PIN'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditing ? 'Leave blank to keep current' : 'e.g. 180403'}
                  className="w-full px-4 py-2.5 pl-10 rounded-2xl border border-[#bcbeab]/60 bg-white/70 text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b]"
                  required={!isEditing}
                />
                <Lock className="w-4 h-4 text-[#bcbeab] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#193116] mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
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

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-[#193116] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#bcbeab]/60 bg-white text-xs font-bold text-[#193116] focus:outline-none focus:border-[#bf944b] cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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

          {/* Per-User Website Access Checkboxes */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-extrabold text-[#193116]">
                <Globe className="w-3.5 h-3.5 text-[#bf944b]" />
                <span>Website Access</span>
              </label>
              {role === 'admin' && (
                <span className="text-[10px] font-bold text-[#83121c]">
                  Admins have access to all websites
                </span>
              )}
              {role === 'staff' && (
                <span className="text-[10px] font-bold text-[#193116]/60">
                  Query Portal is restricted from Staff
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WEBSITE_CATALOG.map((site) => {
                const isDisabled = role === 'admin' || (role === 'staff' && !site.allowStaff);
                const isChecked =
                  role === 'admin' ? true : accessibleApps.includes(site.id);

                return (
                  <label
                    key={site.id}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                      isDisabled
                        ? 'opacity-60 cursor-not-allowed bg-[#bcbeab]/10 border-[#bcbeab]/30'
                        : isChecked
                          ? 'cursor-pointer bg-[#193116]/5 border-[#193116]/35'
                          : 'cursor-pointer bg-white border-[#bcbeab]/50 hover:border-[#bf944b]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => toggleAppAccess(site.id)}
                      className="w-4 h-4 rounded accent-[#193116] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: site.color }}
                    />
                    <span className="text-[#193116] truncate">{site.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#bcbeab]/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#193116]/70 hover:bg-[#bcbeab]/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-[#193116] hover:bg-[#193116]/90 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving & Syncing…' : isEditing ? 'Save & Sync' : 'Add & Sync Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
