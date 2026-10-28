import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { seedAttendance, seedPayments, seedWorkers } from '../data/seed';
import { translate, translations } from '../i18n/translations';
import type {
  AttendanceDraftStatus,
  AttendanceRecord,
  Language,
  WeeklyPayment,
  Worker,
} from '../types';
import { getWeekStart, shiftDate, toDateKey } from '../utils/dates';
import { saveAttendanceForDate, type AttendanceSaveResult } from '../utils/attendance';
import { setWeeklyPaymentStatus } from '../utils/payments';
import { saveWorkerRecord, type WorkerSaveResult } from '../utils/workers';

type MessageKey = keyof typeof translations.en;

interface AppContextValue {
  workers: Worker[];
  attendance: AttendanceRecord[];
  payments: WeeklyPayment[];
  language: Language;
  today: string;
  selectedDate: string;
  weekStart: string;
  historyDate: string;
  historyWeek: string;
  message: MessageKey | null;
  setLanguage: (language: Language) => void;
  setSelectedDate: (date: string) => void;
  setWeekStart: (date: string) => void;
  setHistoryDate: (date: string) => void;
  setHistoryWeek: (date: string) => void;
  setMessage: (message: MessageKey | null) => void;
  t: (key: MessageKey) => string;
  saveWorker: (worker: Worker, mode: 'add' | 'edit') => WorkerSaveResult;
  setWorkerActive: (workerId: string, active: boolean) => void;
  saveAttendance: (date: string, statuses: Record<string, AttendanceDraftStatus>) => AttendanceSaveResult;
  togglePayment: (workerId: string, week: string, paid: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [workers, setWorkers] = useState<Worker[]>(seedWorkers);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(seedAttendance);
  const [payments, setPayments] = useState<WeeklyPayment[]>(seedPayments);
  const [language, setLanguage] = useState<Language>('en');
  const [today] = useState(() => toDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [historyDate, setHistoryDate] = useState(() => shiftDate(today, -1));
  const [historyWeek, setHistoryWeek] = useState(() => getWeekStart(shiftDate(today, -1)));
  const [message, setMessage] = useState<MessageKey | null>(null);

  function saveWorker(worker: Worker, mode: 'add' | 'edit'): WorkerSaveResult {
    const outcome = saveWorkerRecord(workers, worker, mode);
    if (outcome.result === 'success') setWorkers(outcome.workers);
    return outcome.result;
  }

  function setWorkerActive(workerId: string, active: boolean) {
    setWorkers((current) => current.map((worker) => worker.id === workerId ? { ...worker, active } : worker));
  }

  function saveAttendance(date: string, statuses: Record<string, AttendanceDraftStatus>): AttendanceSaveResult {
    const outcome = saveAttendanceForDate(attendance, workers, date, statuses);
    if (outcome.result === 'success') setAttendance(outcome.records);
    return outcome.result;
  }

  function togglePayment(workerId: string, week: string, paid: boolean) {
    setPayments((current) => setWeeklyPaymentStatus(current, workerId, week, paid));
  }

  const value: AppContextValue = {
    workers,
    attendance,
    payments,
    language,
    today,
    selectedDate,
    weekStart,
    historyDate,
    historyWeek,
    message,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}