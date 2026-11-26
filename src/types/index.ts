export type Role = 'admin' | 'manager' | 'account_manager' | 'staff';

export type AppId = 'manager' | 'purchase' | 'sales' | 'qaqc';

export type Department =
  | 'Sales'
  | 'Logistics'
  | 'Fin & Acc'
  | 'QAQC'
  | 'Purchase'
  | 'HR'
  | 'All';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  role_label: string;
  department: string;
  avatar_initials: string;
  phone?: string | null;
  status: 'Active' | 'Inactive';
  accessible_apps: string[];
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppItem {
  id: string;
  name: string;
  subtitle?: string;
  url: string;
  badge: string;
  color: string;
  allowed_roles: string[];
  allowed_departments: string[];
  is_active?: boolean;
}

export interface SyncStepResult {
  ok: boolean;
  action: 'synced' | 'deactivated' | 'skipped' | 'sso_only' | 'error';
  message: string;
}

export interface UserSyncResults {
  mainapp: SyncStepResult;
  manager: SyncStepResult;
  qaqc: SyncStepResult;
  purchase: SyncStepResult;
  sales: SyncStepResult;
}

export interface UserSyncResponse {
  ok: boolean;
  user?: User;
  results?: UserSyncResults;
  error?: string;
}

export const WEBSITE_CATALOG: Array<{
  id: AppId;
  name: string;
  color: string;
  allowStaff: boolean;
}> = [
  { id: 'manager', name: 'Query Portal', color: '#bf944b', allowStaff: false },
  { id: 'purchase', name: 'Purchase', color: '#83121c', allowStaff: true },
  { id: 'qaqc', name: 'Factory (QAQC)', color: '#0f766e', allowStaff: true },
  { id: 'sales', name: 'Sales & Collection', color: '#1080a7', allowStaff: true },
];
