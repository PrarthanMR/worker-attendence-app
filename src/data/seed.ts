import type { AttendanceRecord, WeeklyPayment, Worker } from '../types';
import { getWeekStart, shiftDate, toDateKey } from '../utils/dates';

export const seedWorkers: Worker[] = [
  { id: 'worker-01', name: 'Lakshmi', dailyWage: 600, active: true },
  { id: 'worker-02', name: 'Ravi', dailyWage: 650, active: true },
  { id: 'worker-03', name: 'Meena', dailyWage: 550, active: true },
  { id: 'worker-04', name: 'Suresh', dailyWage: 750, active: true },
  { id: 'worker-05', name: 'Geetha', dailyWage: 600, active: true },
  { id: 'worker-06', name: 'Manjunath', dailyWage: 500, active: true },
  { id: 'worker-07', name: 'Kavya', dailyWage: 650, active: true },
  { id: 'worker-08', name: 'Basavaraj', dailyWage: 550, active: true },
  { id: 'worker-09', name: 'Anitha', dailyWage: 750, active: true },
  { id: 'worker-10', name: 'Ramesh', dailyWage: 600, active: true },
];

const attendancePattern = [
  ['present', 'present', 'half-day', 'present', 'absent', 'present', 'present'],
  ['present', 'absent', 'present', 'present', 'half-day', 'present', 'present'],
  ['half-day', 'present', 'present', 'absent', 'present', 'present', 'present'],
  ['present', 'present', 'present', 'present', 'present', 'half-day', 'present'],
  ['absent', 'present', 'half-day', 'present', 'present', 'present', 'present'],
  ['present', 'half-day', 'present', 'present', 'absent', 'present', 'present'],
  ['present', 'present', 'absent', 'present', 'present', 'half-day', 'present'],
  ['present', 'present', 'present', 'half-day', 'present', 'present', 'absent'],
  ['half-day', 'present', 'present', 'present', 'absent', 'present', 'present'],
  ['present', 'absent', 'present', 'half-day', 'present', 'present', 'present'],
] as const;

const today = toDateKey(new Date());
const currentWeekStart = getWeekStart(today);
const firstSeedDate = shiftDate(currentWeekStart, -14);
const lastSeedDate = shiftDate(currentWeekStart, -1);

export const seedAttendance: AttendanceRecord[] = [];

for (let date = firstSeedDate; date <= lastSeedDate; date = shiftDate(date, 1)) {
  if (date === currentWeekStart) continue;
  const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  seedWorkers.forEach((worker, workerIndex) => {
    const status = attendancePattern[(workerIndex + Math.floor((new Date(`${date}T12:00:00`).getDate() - 1) / 7)) % attendancePattern.length][dayIndex];
    seedAttendance.push({ workerId: worker.id, date, status, wageRate: worker.dailyWage });
  });
}

const currentWeekDates = Array.from({ length: 7 }, (_, index) => shiftDate(currentWeekStart, index))
  .filter((date) => date < today);

currentWeekDates.forEach((date, dateIndex) => {
  const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  seedWorkers.forEach((worker, workerIndex) => {
    const status = attendancePattern[(workerIndex + dateIndex) % attendancePattern.length][dayIndex];
    seedAttendance.push({ workerId: worker.id, date, status, wageRate: worker.dailyWage });
  });
});

export const seedPayments: WeeklyPayment[] = seedWorkers.map((worker, index) => ({
  workerId: worker.id,
  weekStart: currentWeekStart,
  paid: index < 3,
}));