import type { PersistedAppData } from '../types';
import { STORAGE_SCHEMA_VERSION, validatePersistedData } from './persistence';

export const BACKUP_FORMAT = 'coffee-estate-labour-tracker-backup';

export interface BackupDocument extends PersistedAppData {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
}

export type BackupDecodeResult =
  | { valid: true; backup: BackupDocument }
  | { valid: false; error: 'invalid-json' | 'invalid-backup' | 'unsupported-version' };

export function createBackup(data: PersistedAppData, exportedAt = new Date().toISOString()): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt,
    language: data.language,
    workers: data.workers,
    attendance: data.attendance,
    archivedAttendance: data.archivedAttendance,
    payments: data.payments,
  };
}

export function decodeBackup(serialized: string): BackupDecodeResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { valid: false, error: 'invalid-json' };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'invalid-backup' };
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.format !== BACKUP_FORMAT) return { valid: false, error: 'invalid-backup' };
  if (candidate.schemaVersion !== STORAGE_SCHEMA_VERSION) return { valid: false, error: 'unsupported-version' };
  if (typeof candidate.exportedAt !== 'string' || !Number.isFinite(Date.parse(candidate.exportedAt))) {
    return { valid: false, error: 'invalid-backup' };
  }

  const validation = validatePersistedData(candidate);
  if (!validation.valid) {
    return { valid: false, error: validation.error === 'unsupported-version' ? 'unsupported-version' : 'invalid-backup' };
  }

  return {
    valid: true,
    backup: { ...createBackup(validation.data, candidate.exportedAt), exportedAt: candidate.exportedAt },
  };
}