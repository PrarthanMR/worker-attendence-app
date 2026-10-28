import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let vite;
let calculateWeeklyWages;
let deduplicateAttendanceRecords;
let saveAttendanceForDate;
let setWeeklyPaymentStatus;
let calculateWeeklyPaymentTotals;
let saveWorkerRecord;
let translations;
let getWeekDates;
let getWeekStart;
let shiftDate;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const [wages, attendance, payments, workers, dates, i18n] = await Promise.all([
    vite.ssrLoadModule('/src/utils/wages.ts'),
    vite.ssrLoadModule('/src/utils/attendance.ts'),
    vite.ssrLoadModule('/src/utils/payments.ts'),
    vite.ssrLoadModule('/src/utils/workers.ts'),
    vite.ssrLoadModule('/src/utils/dates.ts'),
    vite.ssrLoadModule('/src/i18n/translations.ts'),
  ]);
  calculateWeeklyWages = wages.calculateWeeklyWages;
  deduplicateAttendanceRecords = wages.deduplicateAttendanceRecords;
  saveAttendanceForDate = attendance.saveAttendanceForDate;
  setWeeklyPaymentStatus = payments.setWeeklyPaymentStatus;
  calculateWeeklyPaymentTotals = payments.calculateWeeklyPaymentTotals;
  saveWorkerRecord = workers.saveWorkerRecord;
  translations = i18n.translations;
  getWeekDates = dates.getWeekDates;
  getWeekStart = dates.getWeekStart;
  shiftDate = dates.shiftDate;
});

after(async () => {
  await vite?.close();
});

const baseWorker = (id, overrides = {}) => ({
  id,
  name: `Worker ${id}`,
  dailyWage: 600,
  active: true,
  ...overrides,
});

test('worker add/edit validates details, IDs, and scales beyond 50 workers', () => {
  let workers = [];
  for (let index = 0; index < 50; index += 1) {
    const result = saveWorkerRecord(workers, baseWorker(`w-${index}`), 'add');
    assert.equal(result.result, 'success');
    workers = result.workers;
  }
  assert.equal(workers.length, 50);

  assert.equal(saveWorkerRecord(workers, baseWorker('w-50', { name: '   ' }), 'add').result, 'empty-name');
  assert.equal(saveWorkerRecord(workers, baseWorker('w-50', { dailyWage: -1 }), 'add').result, 'invalid-wage');
  assert.equal(saveWorkerRecord(workers, baseWorker('w-50', { dailyWage: Number.NaN }), 'add').result, 'invalid-wage');
  assert.equal(saveWorkerRecord(workers, baseWorker('w-0'), 'add').result, 'duplicate-id');

  const updated = saveWorkerRecord(workers, baseWorker('w-0', { name: 'Updated', dailyWage: 750 }), 'edit');
  assert.equal(updated.result, 'success');
  assert.equal(updated.workers[0].name, 'Updated');
  assert.equal(updated.workers[0].dailyWage, 750);
});

test('attendance save requires every active worker, replaces date rows, and snapshots current wages', () => {
  const workers = [baseWorker('active-1', { dailyWage: 800 }), baseWorker('active-2', { dailyWage: 500 }), baseWorker('inactive', { active: false, dailyWage: 900 })];
  const date = '2026-10-27';
  const existing = [
    { workerId: 'active-1', date, status: 'present', wageRate: 600 },
    { workerId: 'active-2', date, status: 'present', wageRate: 500 },
    { workerId: 'inactive', date, status: 'half-day', wageRate: 850 },
    { workerId: 'active-1', date: '2026-10-26', status: 'present', wageRate: 600 },
  ];

  const incomplete = saveAttendanceForDate(existing, workers, date, { 'active-1': 'present', 'active-2': 'unmarked' });
  assert.equal(incomplete.result, 'unmarked');
  assert.deepEqual(incomplete.records, existing);

  const saved = saveAttendanceForDate(existing, workers, date, { 'active-1': 'half-day', 'active-2': 'absent' });
  assert.equal(saved.result, 'success');
  const dateRecords = saved.records.filter((record) => record.date === date);
  assert.equal(dateRecords.length, 3);
  assert.deepEqual(dateRecords.find((record) => record.workerId === 'active-1'), {
    workerId: 'active-1', date, status: 'half-day', wageRate: 800,
  });
  assert.equal(dateRecords.find((record) => record.workerId === 'active-2').wageRate, 500);
  assert.equal(dateRecords.find((record) => record.workerId === 'inactive').wageRate, 850);
  assert.equal(saved.records.filter((record) => record.workerId === 'active-1' && record.date === date).length, 1);
  assert.equal(saved.records.find((record) => record.date === '2026-10-26').wageRate, 600);
});

test('attendance save handles empty active lists and normalizes pre-existing duplicates', () => {
  assert.equal(saveAttendanceForDate([], [baseWorker('off', { active: false })], '2026-10-27', {}).result, 'no-workers');
  const duplicate = [
    { workerId: 'w1', date: '2026-10-26', status: 'present', wageRate: 600 },
    { workerId: 'w1', date: '2026-10-26', status: 'half-day', wageRate: 600 },
  ];
  assert.equal(deduplicateAttendanceRecords(duplicate).length, 1);
  const saved = saveAttendanceForDate(duplicate, [baseWorker('w2')], '2026-10-27', { w2: 'present' });
  assert.equal(saved.result, 'success');
  assert.equal(saved.records.filter((record) => record.workerId === 'w1' && record.date === '2026-10-26').length, 1);
});

test('weekly wage math uses Monday through Sunday, snapshots, and unique saved records', () => {
  const monday = getWeekStart('2026-10-28');
  assert.equal(monday, '2026-10-26');
  assert.deepEqual(getWeekDates(monday), [
    '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
  ]);
  const records = [
    { workerId: 'w1', date: monday, status: 'present', wageRate: 600 },
    { workerId: 'w1', date: monday, status: 'half-day', wageRate: 999 },
    { workerId: 'w1', date: shiftDate(monday, 1), status: 'half-day', wageRate: 700 },
    { workerId: 'w1', date: shiftDate(monday, 2), status: 'absent', wageRate: 650 },
    { workerId: 'w1', date: shiftDate(monday, 6), status: 'present', wageRate: 800 },
    { workerId: 'w1', date: shiftDate(monday, 7), status: 'present', wageRate: 1000 },
  ];
  const [row] = calculateWeeklyWages([baseWorker('w1', { dailyWage: 1200 })], records, monday);
  assert.equal(row.fullDays, 2);
  assert.equal(row.halfDays, 1);
  assert.equal(row.equivalentDays, 2.5);
  assert.equal(row.totalWage, 1750);
});

test('weekly payment status is scoped to worker and week', () => {
  const initial = [
    { workerId: 'w1', weekStart: '2026-10-26', paid: false },
    { workerId: 'w1', weekStart: '2026-10-19', paid: true },
    { workerId: 'w2', weekStart: '2026-10-26', paid: false },
  ];
  const updated = setWeeklyPaymentStatus(initial, 'w1', '2026-10-26', true);
  assert.deepEqual(updated, [
    { workerId: 'w1', weekStart: '2026-10-26', paid: true },
    { workerId: 'w1', weekStart: '2026-10-19', paid: true },
    { workerId: 'w2', weekStart: '2026-10-26', paid: false },
  ]);
  assert.equal(setWeeklyPaymentStatus(updated, 'w3', '2026-10-26', false).length, 4);
});

test('paid and outstanding totals use only matching worker/week payment states', () => {
  const wages = [
    { workerId: 'w1', fullDays: 1, halfDays: 0, equivalentDays: 1, totalWage: 600, wageRates: [600] },
    { workerId: 'w2', fullDays: 1, halfDays: 1, equivalentDays: 1.5, totalWage: 900, wageRates: [600] },
  ];
  const payments = [
    { workerId: 'w1', weekStart: '2026-10-26', paid: true },
    { workerId: 'w1', weekStart: '2026-10-19', paid: false },
    { workerId: 'w2', weekStart: '2026-10-26', paid: false },
  ];
  assert.deepEqual(calculateWeeklyPaymentTotals(wages, payments, '2026-10-26'), {
    total: 1500, paid: 600, outstanding: 900,
  });
  assert.deepEqual(calculateWeeklyPaymentTotals(wages, payments, '2026-10-19'), {
    total: 1500, paid: 0, outstanding: 1500,
  });
});

test('English and Kannada dictionaries contain the same non-empty labels', () => {
  assert.deepEqual(Object.keys(translations.en).sort(), Object.keys(translations.kn).sort());
  for (const language of [translations.en, translations.kn]) {
    for (const [key, value] of Object.entries(language)) {
      assert.equal(typeof value, 'string', `${key} must be a string`);
      assert.ok(value.trim().length > 0, `${key} must have a translation`);
    }
  }
});