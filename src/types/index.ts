export type Language = 'en' | 'kn';
export type ViewName = 'dashboard' | 'attendance' | 'workers' | 'wages' | 'history';
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

export interface WeeklyWorkerWage {
  workerId: string;
  fullDays: number;
  halfDays: number;
  equivalentDays: number;
  totalWage: number;
  wageRates: number[];
}