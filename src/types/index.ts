export type Language = 'en' | 'kn';
export type ViewName = 'dashboard' | 'attendance' | 'workers' | 'wages' | 'history' | 'backup';
export type AttendanceStatus = 'present' | 'absent' | 'half-day';
export type AttendanceDraftStatus = AttendanceStatus | 'unmarked';

export interface Worker {
  id: string;
  name: string;
  dailyWage: number;
  active: boolean;
}

export interface AttendanceRecord {
  workerId: string;
  date: string;
  status: AttendanceStatus;
  wageRate: number;
}

export interface WeeklyPayment {
  workerId: string;
  weekStart: string;
  paid: boolean;
}

export interface PersistedAppData {
  schemaVersion: 1;
  language: Language;
  workers: Worker[];
  attendance: AttendanceRecord[];
  archivedAttendance: AttendanceRecord[];
  payments: WeeklyPayment[];
}

export interface WeeklyWorkerWage {
  workerId: string;
  fullDays: number;
  halfDays: number;
  equivalentDays: number;
  totalWage: number;
  wageRates: number[];
}