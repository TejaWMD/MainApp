export type Role = 'admin' | 'manager' | 'account_manager';

export type Department = 
  | 'Sales' 
  | 'Logistics' 
  | 'Fin & Acc' 
  | 'QAQC' 
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
  subtitle: string;
  url: string;
  badge: string;
  color: string;
  allowed_roles: string[];
  allowed_departments: string[];
  is_active?: boolean;
}
