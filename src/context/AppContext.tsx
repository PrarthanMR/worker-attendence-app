import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { translate, translations } from '../i18n/translations';
import type {
  AttendanceDraftStatus,
  AttendanceRecord,
  Language,
  PersistedAppData,
  WeeklyPayment,
  Worker,
} from '../types';
import { getWeekStart, shiftDate, toDateKey } from '../utils/dates';
import { archiveAttendanceBefore, emptyAppData, loadPersistedData, savePersistedData, validatePersistedData, type StorageErrorCode, type StorageLike } from '../utils/persistence';
import { saveAttendanceForDate, type AttendanceSaveResult } from '../utils/attendance';
import { setWeeklyPaymentStatus } from '../utils/payments';
import { saveWorkerRecord, type WorkerSaveResult } from '../utils/workers';

type MessageKey = keyof typeof translations.en;

interface AppContextValue {
  workers: Worker[];
  attendance: AttendanceRecord[];
  retainedAttendance: AttendanceRecord[];
  archivedAttendance: AttendanceRecord[];
  payments: WeeklyPayment[];
  data: PersistedAppData;
  language: Language;
  today: string;
  selectedDate: string;
  weekStart: string;
  historyDate: string;
  historyWeek: string;
  message: MessageKey | null;
  persistenceError: StorageErrorCode | null;
  savedOnDevice: boolean;
  persistenceLocked: boolean;
  setLanguage: (language: Language) => void;
  setSelectedDate: (date: string) => void;
  setWeekStart: (date: string) => void;
  setHistoryDate: (date: string) => void;
  setHistoryWeek: (date: string) => void;
  setMessage: (message: MessageKey | null) => void;
  t: (key: MessageKey) => string;
  saveWorker: (worker: Worker, mode: 'add' | 'edit') => WorkerSaveResult | 'storage-error';
  setWorkerActive: (workerId: string, active: boolean) => boolean;
  saveAttendance: (date: string, statuses: Record<string, AttendanceDraftStatus>) => AttendanceSaveResult | 'storage-error';
  togglePayment: (workerId: string, week: string, paid: boolean) => boolean;
  archiveOldAttendance: (cutoffDate: string) => 'success' | 'nothing-to-archive' | 'storage-error';
  importData: (data: unknown) => 'success' | 'invalid' | 'storage-error';
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [storage] = useState<StorageLike | null>(() => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  });
  const [initialLoad] = useState(() => loadPersistedData(storage, emptyAppData()));
  const [data, setData] = useState<PersistedAppData>(initialLoad.data);
  const [language, setLanguageState] = useState<Language>(initialLoad.data.language);
  const [persistenceError, setPersistenceError] = useState<StorageErrorCode | null>(initialLoad.error);
  const [persistenceLocked, setPersistenceLocked] = useState(initialLoad.locked);
  const [today] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [historyDate, setHistoryDate] = useState(() => shiftDate(today, -1));
  const [historyWeek, setHistoryWeek] = useState(() => getWeekStart(shiftDate(today, -1)));
  const [message, setMessage] = useState<MessageKey | null>(null);

  const attendance = useMemo(
    () => [...data.attendance, ...data.archivedAttendance],
    [data.attendance, data.archivedAttendance],
  );
  const retainedAttendance = data.attendance;

  function persist(next: PersistedAppData, allowLocked = false): boolean {
    if (persistenceLocked && !allowLocked) return false;
    if (!savePersistedData(storage, next)) {
      setPersistenceError(storage ? 'storageSaveFailed' : 'storageUnavailable');
      setPersistenceLocked(true);
      return false;
    }
    setData(next);
    setLanguageState(next.language);
    setPersistenceError(null);
    setPersistenceLocked(false);
    return true;
  }

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    persist({ ...data, language: nextLanguage });
  }

  function saveWorker(worker: Worker, mode: 'add' | 'edit'): WorkerSaveResult | 'storage-error' {
    if (persistenceLocked) return 'storage-error';
    const outcome = saveWorkerRecord(data.workers, worker, mode);
    if (outcome.result !== 'success') return outcome.result;
    if (!persist({ ...data, workers: outcome.workers })) return 'storage-error';
    return outcome.result;
  }

  function setWorkerActive(workerId: string, active: boolean): boolean {
    if (persistenceLocked) return false;
    const workers = data.workers.map((worker) => worker.id === workerId ? { ...worker, active } : worker);
    return persist({ ...data, workers });
  }

  function saveAttendance(date: string, statuses: Record<string, AttendanceDraftStatus>): AttendanceSaveResult | 'storage-error' {
    if (persistenceLocked) return 'storage-error';
    const outcome = saveAttendanceForDate(attendance, data.workers, date, statuses);
    if (outcome.result !== 'success') return outcome.result;
    const archivedKeys = new Set(data.archivedAttendance.map((record) => `${record.workerId}:${record.date}`));
    const retainedAttendance = outcome.records.filter((record) => !archivedKeys.has(`${record.workerId}:${record.date}`));
    const archivedAttendance = outcome.records.filter((record) => archivedKeys.has(`${record.workerId}:${record.date}`));
    if (!persist({ ...data, attendance: retainedAttendance, archivedAttendance })) return 'storage-error';
    return outcome.result;
  }

  function togglePayment(workerId: string, week: string, paid: boolean): boolean {
    if (persistenceLocked) return false;
    const payments = setWeeklyPaymentStatus(data.payments, workerId, week, paid);
    return persist({ ...data, payments });
  }

  function archiveOldAttendance(cutoffDate: string): 'success' | 'nothing-to-archive' | 'storage-error' {
    if (persistenceLocked) return 'storage-error';
    if (!data.attendance.some((record) => record.date < cutoffDate)) return 'nothing-to-archive';
    const next = archiveAttendanceBefore(data, cutoffDate);
    return persist(next) ? 'success' : 'storage-error';
  }

  function importData(value: unknown): 'success' | 'invalid' | 'storage-error' {
    const validation = validatePersistedData(value);
    if (!validation.valid) return 'invalid';
    return persist(validation.data, true) ? 'success' : 'storage-error';
  }

  const workers = data.workers;
  const payments = data.payments;
  const value: AppContextValue = {
    workers,
    attendance,
    retainedAttendance,
    archivedAttendance: data.archivedAttendance,
    payments,
    data,
    language,
    today,
    selectedDate,
    weekStart,
    historyDate,
    historyWeek,
    message,
    persistenceError,
    savedOnDevice: Boolean(storage) && persistenceError === null,
    persistenceLocked,
    setLanguage,
    setSelectedDate,
    setWeekStart,
    setHistoryDate,
    setHistoryWeek,
    setMessage,
    t: (key) => translate(language, key),
    saveWorker,
    setWorkerActive,
    saveAttendance,
    togglePayment,
    archiveOldAttendance,
    importData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}