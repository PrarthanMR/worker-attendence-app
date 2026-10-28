import type { AttendanceDraftStatus, AttendanceRecord, AttendanceStatus, Worker } from '../types';
import { deduplicateAttendanceRecords } from './wages';

export type AttendanceSaveResult = 'success' | 'unmarked' | 'no-workers' | 'invalid';

export interface AttendanceSaveOutcome {
  result: AttendanceSaveResult;
  records: AttendanceRecord[];
}

const savedStatuses = new Set<AttendanceStatus>(['present', 'absent', 'half-day']);

export function validateAttendance(records: AttendanceRecord[]): string | null {
  const keys = new Set<string>();

  for (const record of records) {
    if (!Number.isFinite(record.wageRate) || record.wageRate < 0) return 'invalid-wage';
    if (!savedStatuses.has(record.status)) return 'unmarked';
    const key = `${record.workerId}:${record.date}`;
    if (keys.has(key)) return 'duplicate-attendance';
    keys.add(key);
  }

  return null;
}

export function saveAttendanceForDate(
  records: AttendanceRecord[],
  workers: Worker[],
  date: string,
  statuses: Record<string, AttendanceDraftStatus>,
): AttendanceSaveOutcome {
  const activeWorkers = workers.filter((worker) => worker.active);
  if (activeWorkers.length === 0) return { result: 'no-workers', records };
  if (activeWorkers.some((worker) => !savedStatuses.has(statuses[worker.id] as AttendanceStatus))) {
    return { result: 'unmarked', records };
  }

  const activeWorkerIds = new Set(activeWorkers.map((worker) => worker.id));
  const nextRecords = deduplicateAttendanceRecords(records).filter(
    (record) => record.date !== date || !activeWorkerIds.has(record.workerId),
  );

  for (const worker of activeWorkers) {
    const status = statuses[worker.id];
    if (!status || status === 'unmarked') return { result: 'unmarked', records };
    nextRecords.push({ workerId: worker.id, date, status, wageRate: worker.dailyWage });
  }

  if (validateAttendance(nextRecords)) return { result: 'invalid', records };
  return { result: 'success', records: nextRecords };
}