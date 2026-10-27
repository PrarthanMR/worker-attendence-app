import type { AttendanceRecord, WeeklyWorkerWage, Worker } from '../types';
import { getWeekDates } from './dates';

export function deduplicateAttendanceRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  const uniqueRecords = new Map<string, AttendanceRecord>();

  for (const record of records) {
    const key = `${record.workerId}:${record.date}`;
    if (!uniqueRecords.has(key)) uniqueRecords.set(key, record);
  }

  return [...uniqueRecords.values()];
}

export function calculateWeeklyWages(
  workers: Worker[],
  records: AttendanceRecord[],
  weekStart: string,
): WeeklyWorkerWage[] {
  const weekDates = new Set(getWeekDates(weekStart));
  const uniqueRecords = deduplicateAttendanceRecords(records);

  return workers.map((worker) => {
    const workerRecords = uniqueRecords.filter(
      (record) => record.workerId === worker.id && weekDates.has(record.date),
    );
    const fullDays = workerRecords.filter((record) => record.status === 'present').length;
    const halfDays = workerRecords.filter((record) => record.status === 'half-day').length;
    const equivalentDays = fullDays + halfDays * 0.5;
    const totalWage = workerRecords.reduce((total, record) => {
      const attendanceMultiplier = record.status === 'present' ? 1 : record.status === 'half-day' ? 0.5 : 0;
      return total + attendanceMultiplier * record.wageRate;
    }, 0);

    return {
      workerId: worker.id,
      fullDays,
      halfDays,
      equivalentDays,
      totalWage,
      wageRates: [...new Set(workerRecords.map((record) => record.wageRate))],
    };
  });
}
