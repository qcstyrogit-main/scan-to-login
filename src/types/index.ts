export interface Employee {
  id: string;
  email: string;
  full_name: string;
  department: string;
  company?: string;
  custom_location?: string;
  designation?: string;
  role: 'employee' | 'admin';
  avatar_url?: string;
  phone?: string;
  latestCheckin?: Checkin;
}

export interface Checkin {
  id: string;
  employee_id: string;
  check_type: 'in' | 'out' | 'break_start' | 'break_end';
  timestamp: string;
  location?: string;
  scan_code?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export type ViewType = 'dashboard' | 'scan' | 'history' | 'profile' | 'admin';
