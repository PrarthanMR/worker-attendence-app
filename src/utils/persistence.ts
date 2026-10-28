import type { AttendanceRecord, PersistedAppData, WeeklyPayment, Worker } from '../types';
import { getWeekStart, isDateKey } from './dates';
import { deduplicateAttendanceRecords } from './wages';

export const STORAGE_KEY = 'coffee-estate-labour-tracker';
export const STORAGE_SCHEMA_VERSION = 1 as const;

export type StorageErrorCode = 'storageUnavailable' | 'storageSaveFailed' | 'storedDataInvalid';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StorageLoadResult {
  data: PersistedAppData;
  source: 'stored' | 'initial' | 'invalid' | 'unavailable';
  error: StorageErrorCode | null;
  locked: boolean;
}

export type DataValidationResult =
  | { valid: true; data: PersistedAppData }
  | { valid: false; error: 'invalid' | 'unsupported-version' };

export function emptyAppData(): PersistedAppData {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    language: 'en',
    workers: [],
    attendance: [],
    archivedAttendance: [],
    payments: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validWorkers(value: unknown): value is Worker[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();

  for (const worker of value) {
    if (!isRecord(worker)) return false;
    if (typeof worker.id !== 'string' || worker.id.trim() === '' || ids.has(worker.id)) return false;
    if (typeof worker.name !== 'string' || worker.name.trim() === '') return false;
    if (typeof worker.dailyWage !== 'number' || !Number.isFinite(worker.dailyWage) || worker.dailyWage < 0) return false;
    if (typeof worker.active !== 'boolean') return false;
    ids.add(worker.id);
  }

  return true;
}

function validAttendance(value: unknown, workerIds: Set<string>): value is AttendanceRecord[] {
  if (!Array.isArray(value)) return false;
  const keys = new Set<string>();

  for (const record of value) {
    if (!isRecord(record)) return false;
    if (typeof record.workerId !== 'string' || !workerIds.has(record.workerId)) return false;
    if (!isDateKey(record.date)) return false;
    if (record.status !== 'present' && record.status !== 'absent' && record.status !== 'half-day') return false;
    if (typeof record.wageRate !== 'number' || !Number.isFinite(record.wageRate) || record.wageRate < 0) return false;
    const key = `${record.workerId}:${record.date}`;
    if (keys.has(key)) return false;
    keys.add(key);
  }

  return true;
}

function validPayments(value: unknown, workerIds: Set<string>): value is WeeklyPayment[] {
  if (!Array.isArray(value)) return false;
  const keys = new Set<string>();

  for (const payment of value) {
    if (!isRecord(payment)) return false;
    if (typeof payment.workerId !== 'string' || !workerIds.has(payment.workerId)) return false;
    if (!isDateKey(payment.weekStart) || getWeekStart(payment.weekStart) !== payment.weekStart) return false;
    if (typeof payment.paid !== 'boolean') return false;
    const key = `${payment.workerId}:${payment.weekStart}`;
    if (keys.has(key)) return false;
    keys.add(key);
  }

  return true;
}

export function validatePersistedData(value: unknown): DataValidationResult {
  if (!isRecord(value) || value.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    return {
      valid: false,
      error: isRecord(value) && typeof value.schemaVersion === 'number' ? 'unsupported-version' : 'invalid',
    };
  }
  if (value.language !== 'en' && value.language !== 'kn') return { valid: false, error: 'invalid' };
  if (!validWorkers(value.workers)) return { valid: false, error: 'invalid' };

  const workerIds = new Set(value.workers.map((worker) => worker.id));
  if (!validAttendance(value.attendance, workerIds) || !validAttendance(value.archivedAttendance, workerIds)) {
    return { valid: false, error: 'invalid' };
  }
  if (!validPayments(value.payments, workerIds)) return { valid: false, error: 'invalid' };

  const allAttendance = [...value.attendance, ...value.archivedAttendance];
  if (deduplicateAttendanceRecords(allAttendance).length !== allAttendance.length) {
    return { valid: false, error: 'invalid' };
  }

  return {
    valid: true,
    data: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      language: value.language,
      workers: value.workers,
      attendance: value.attendance,
      archivedAttendance: value.archivedAttendance,
      payments: value.payments,
    },
  };
}

export function serializePersistedData(data: PersistedAppData): string {
  const validation = validatePersistedData(data);
  if (!validation.valid) throw new Error('Cannot save invalid app data');
  return JSON.stringify(validation.data);
}

export function loadPersistedData(storage: StorageLike | null, initialData: PersistedAppData): StorageLoadResult {
  if (!storage) {
    return { data: initialData, source: 'unavailable', error: 'storageUnavailable', locked: true };
  }

  let serialized: string | null;
  try {
    serialized = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: initialData, source: 'unavailable', error: 'storageUnavailable', locked: true };
  }

  if (serialized === null) {
    const validation = validatePersistedData(initialData);
    if (!validation.valid) {
      return { data: emptyAppData(), source: 'invalid', error: 'storedDataInvalid', locked: true };
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
      return { data: validation.data, source: 'initial', error: null, locked: false };
    } catch {
      return { data: validation.data, source: 'initial', error: 'storageSaveFailed', locked: true };
    }
  }

  try {
    const validation = validatePersistedData(JSON.parse(serialized));
    if (!validation.valid) {
      return { data: emptyAppData(), source: 'invalid', error: 'storedDataInvalid', locked: true };
    }
    return { data: validation.data, source: 'stored', error: null, locked: false };
  } catch {
    return { data: emptyAppData(), source: 'invalid', error: 'storedDataInvalid', locked: true };
  }
}

export function savePersistedData(storage: StorageLike | null, data: PersistedAppData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, serializePersistedData(data));
    return true;
  } catch {
    return false;
  }
}

export function archiveAttendanceBefore(data: PersistedAppData, cutoffDate: string): PersistedAppData {
  const retained = data.attendance.filter((record) => record.date >= cutoffDate);
  const archived = data.attendance.filter((record) => record.date < cutoffDate);

  return {
    ...data,
    attendance: retained,
    archivedAttendance: [...data.archivedAttendance, ...archived],
  };
}