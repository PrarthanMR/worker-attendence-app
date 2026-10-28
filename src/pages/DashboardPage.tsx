import { CalendarCheck2, ClipboardList, UsersRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ViewName } from '../types';
import { formatDate } from '../utils/dates';
import { formatCurrency } from '../utils/format';
import { calculateWeeklyWages, deduplicateAttendanceRecords } from '../utils/wages';

interface DashboardPageProps {
  navigate: (view: ViewName) => void;
}

export default function DashboardPage({ navigate }: DashboardPageProps) {
  const { workers, attendance, language, today, weekStart, t } = useApp();
  const savedRecords = deduplicateAttendanceRecords(attendance);
  const activeWorkers = workers.filter((worker) => worker.active);
  const activeWorkerIds = new Set(activeWorkers.map((worker) => worker.id));
  const todayRecords = savedRecords.filter((record) => record.date === today && activeWorkerIds.has(record.workerId));
  const unmarkedToday = Math.max(0, activeWorkers.length - todayRecords.length);
  const weeklyRows = calculateWeeklyWages(workers, savedRecords, weekStart);
  const weeklyTotal = weeklyRows.reduce((total, row) => total + row.totalWage, 0);
  const recentDates = [...new Set(savedRecords.map((record) => record.date))]
    .filter((date) => date < today)
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 3);
  const actions: { view: ViewName; label: string; icon: typeof CalendarCheck2 }[] = [
    { view: 'attendance', label: t('markAttendance'), icon: CalendarCheck2 },
    { view: 'workers', label: t('manageWorkers'), icon: UsersRound },
    { view: 'wages', label: t('viewWages'), icon: Wallet },
    { view: 'history', label: t('viewHistory'), icon: ClipboardList },
  ];

  return (
    <div className="page-stack">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{t('today')}</p>
          <h1>{formatDate(today, language === 'kn' ? 'kn-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
        </div>
        <button className="button button-primary heading-action" onClick={() => navigate('attendance')}>
          <CalendarCheck2 size={19} aria-hidden="true" />
          {t('markAttendance')}
        </button>
      </div>

      <section className="metric-grid" aria-label={t('dashboard')}>
        <article className="metric-card metric-people">
          <span className="metric-icon"><UsersRound size={20} aria-hidden="true" /></span>
          <span className="metric-value">{activeWorkers.length}</span>
          <span className="metric-label">{t('activeWorkers')}</span>
        </article>
        <article className="metric-card metric-present">
          <span className="metric-icon"><CalendarCheck2 size={20} aria-hidden="true" /></span>
          <span className="metric-value">{todayRecords.filter((record) => record.status === 'present').length}</span>
          <span className="metric-label">{t('presentToday')}</span>
        </article>
        <article className="metric-card metric-absent">
          <span className="metric-icon"><UsersRound size={20} aria-hidden="true" /></span>
          <span className="metric-value">{todayRecords.filter((record) => record.status === 'absent').length}</span>
          <span className="metric-label">{t('absentToday')}</span>
        </article>
        <article className="metric-card metric-wages">
          <span className="metric-icon"><Wallet size={20} aria-hidden="true" /></span>
          <span className="metric-value metric-currency">{formatCurrency(weeklyTotal, language)}</span>
          <span className="metric-label">{t('thisWeekWages')}</span>
        </article>
      </section>

      {unmarkedToday > 0 && (
        <button className="dashboard-incomplete" onClick={() => navigate('attendance')}>
          <span className="note-dot" />
          <strong>{unmarkedToday}</strong> {t('workersUnmarked')}
          <span className="dashboard-incomplete-action">{t('markAttendance')} ›</span>
        </button>
      )}

      <section className="dashboard-section">
        <div className="section-heading"><h2>{t('quickActions')}</h2></div>
        <div className="action-grid">
          {actions.map(({ view, label, icon: Icon }) => (
            <button className="action-tile" key={view} onClick={() => navigate(view)}>
              <span className="action-icon"><Icon size={20} aria-hidden="true" /></span>
              <span>{label}</span>
              <span className="action-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-section recent-section">
        <div className="section-heading">
          <h2>{t('recentAttendance')}</h2>
          <button className="text-button" onClick={() => navigate('history')}>{t('viewHistory')}</button>
        </div>
        {recentDates.length === 0 ? (
          <div className="empty-state">{t('noRecentAttendance')}</div>
        ) : (
          <div className="recent-list">
            {recentDates.map((date) => {
              const records = savedRecords.filter((record) => record.date === date);
              const present = records.filter((record) => record.status === 'present').length;
              const half = records.filter((record) => record.status === 'half-day').length;
              return (
                <div className="recent-row" key={date}>
                  <span className="recent-date">{formatDate(date, language === 'kn' ? 'kn-IN' : 'en-IN')}</span>
                  <span className="recent-counts"><strong>{present}</strong> {t('present')} <span>·</span> <strong>{half}</strong> {t('halfDay')}</span>
                  <span className="recent-total">{formatCurrency(records.reduce((sum, record) => sum + (record.status === 'present' ? record.wageRate : record.status === 'half-day' ? record.wageRate / 2 : 0), 0), language)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}