import { useState } from 'react';
import { CalendarClock, PencilLine } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WorkerIdentity from '../components/WorkerIdentity';
import type { ViewName } from '../types';
import { formatDate, getWeekDates, getWeekStart } from '../utils/dates';
import { formatCurrency } from '../utils/format';
import { deduplicateAttendanceRecords } from '../utils/wages';

interface HistoryPageProps {
  navigate: (view: ViewName) => void;
}

export default function HistoryPage({ navigate }: HistoryPageProps) {
  const {
    workers, attendance, language, today, historyDate, historyWeek, setHistoryDate, setHistoryWeek,
    setSelectedDate, t,
  } = useApp();
  const [mode, setMode] = useState<'date' | 'week'>('date');
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';
  const weekDates = getWeekDates(historyWeek);
  const savedRecords = deduplicateAttendanceRecords(attendance);

  function openForCorrection(date: string) {
    setSelectedDate(date);
    navigate('attendance');
  }

  const dateRecords = savedRecords.filter((record) => record.date === historyDate);
  const dateRecordMap = new Map(dateRecords.map((record) => [record.workerId, record]));
  const listedWorkers = workers.filter((worker) => worker.active || dateRecordMap.has(worker.id));
  const dateCounts = {
    present: dateRecords.filter((record) => record.status === 'present').length,
    absent: dateRecords.filter((record) => record.status === 'absent').length,
    half: dateRecords.filter((record) => record.status === 'half-day').length,
    unmarked: listedWorkers.filter((worker) => !dateRecordMap.has(worker.id)).length,
  };
  const dateWages = dateRecords.reduce((sum, record) => sum + (record.status === 'present' ? record.wageRate : record.status === 'half-day' ? record.wageRate / 2 : 0), 0);
  const weekRecords = savedRecords.filter((record) => weekDates.includes(record.date));

  function renderStatus(status: string | undefined) {
    const label = status === 'present' ? t('present') : status === 'absent' ? t('absent') : status === 'half-day' ? t('halfDay') : t('unmarked');
    const className = status ? `history-status status-${status.replace('-', '')}` : 'history-status status-unmarked';
    return <span className={className}>{label}</span>;
  }

  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">{t('recordsFor')}</p><h1>{t('history')}</h1></div></div>

      <div className="history-controls">
        <div className="segmented-control" role="group" aria-label={t('history')}>
          <button className={mode === 'date' ? 'is-selected' : ''} aria-pressed={mode === 'date'} onClick={() => setMode('date')}>{t('viewByDate')}</button>
          <button className={mode === 'week' ? 'is-selected' : ''} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>{t('viewByWeek')}</button>
        </div>
        <label className="history-date-label" htmlFor="history-date">{t(mode === 'date' ? 'historyDate' : 'historyWeek')}</label>
        <input
          id="history-date"
          className="date-input"
          type="date"
          max={mode === 'date' ? today : undefined}
          value={mode === 'date' ? historyDate : historyWeek}
          onChange={(event) => mode === 'date' ? setHistoryDate(event.target.value) : setHistoryWeek(getWeekStart(event.target.value))}
        />
      </div>

      {mode === 'date' ? (
        <>
          <section className="history-day-summary">
            <div className="history-day-title"><CalendarClock size={20} aria-hidden="true" /><h2>{formatDate(historyDate, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
            <div className="history-counts">
              <span><strong>{dateCounts.present}</strong>{t('present')}</span>
              <span><strong>{dateCounts.absent}</strong>{t('absent')}</span>
              <span><strong>{dateCounts.half}</strong>{t('halfDay')}</span>
              <span><strong>{dateCounts.unmarked}</strong>{t('unmarked')}</span>
            </div>
            <div className="history-day-footer"><span>{t('attendanceWages')}</span><strong>{formatCurrency(dateWages, language)}</strong></div>
          </section>

          <section className="history-records">
            <div className="section-heading"><h2>{t('workers')}</h2><button className="button button-primary history-correct-button" onClick={() => openForCorrection(historyDate)}><PencilLine size={17} aria-hidden="true" />{t('editRecords')}</button></div>
            {listedWorkers.length === 0 ? (
              <div className="empty-state">{t('noWorkers')}</div>
            ) : (
              <div className="history-worker-list">
                {listedWorkers.map((worker) => {
                  const record = dateRecordMap.get(worker.id);
                  const earned = !record ? null : record.status === 'present' ? record.wageRate : record.status === 'half-day' ? record.wageRate / 2 : 0;
                  return (
                    <article className="history-worker-row" key={worker.id}>
                      <WorkerIdentity name={worker.name} className="history-worker-identity">
                        {renderStatus(record?.status)}
                      </WorkerIdentity>
                      <strong className="history-earned">{earned === null ? '—' : formatCurrency(earned, language)}</strong>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="history-week-section">
          <div className="history-week-heading"><div><h2>{t('week')}</h2><p>{formatDate(historyWeek, locale)} – {formatDate(weekDates[6], locale)}</p></div><strong>{formatCurrency(weekRecords.reduce((sum, record) => sum + (record.status === 'present' ? record.wageRate : record.status === 'half-day' ? record.wageRate / 2 : 0), 0), language)}</strong></div>
          {weekRecords.length === 0 ? (
            <div className="empty-state">{t('noWeekAttendance')}</div>
          ) : (
            <div className="history-date-list">
              {weekDates.filter((date) => date <= today || savedRecords.some((record) => record.date === date)).map((date) => {
                const records = savedRecords.filter((record) => record.date === date);
                const dayWage = records.reduce((sum, record) => sum + (record.status === 'present' ? record.wageRate : record.status === 'half-day' ? record.wageRate / 2 : 0), 0);
                const present = records.filter((record) => record.status === 'present').length;
                const absent = records.filter((record) => record.status === 'absent').length;
                const half = records.filter((record) => record.status === 'half-day').length;
                return (
                  <article className="history-date-row" key={date}>
                    <div className="history-date-main"><strong>{formatDate(date, locale, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{present} {t('present')} · {half} {t('halfDay')} · {absent} {t('absent')}</span></div>
                    <strong className="history-earned">{formatCurrency(dayWage, language)}</strong>
                    <button className="history-open-button" aria-label={`${t('editRecords')}: ${formatDate(date, locale)}`} onClick={() => openForCorrection(date)}><PencilLine size={18} aria-hidden="true" /></button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}