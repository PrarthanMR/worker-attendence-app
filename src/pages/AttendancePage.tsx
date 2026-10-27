import { useEffect, useState } from 'react';
import { Check, Circle, Search, Save, UserRoundX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WorkerIdentity from '../components/WorkerIdentity';
import type { AttendanceDraftStatus, AttendanceStatus } from '../types';
import { formatDate } from '../utils/dates';
import { formatCurrency } from '../utils/format';

const statuses: { value: AttendanceDraftStatus; label: 'unmarked' | 'present' | 'absent' | 'halfDay'; icon: typeof Circle }[] = [
  { value: 'unmarked', label: 'unmarked', icon: Circle },
  { value: 'present', label: 'present', icon: Check },
  { value: 'half-day', label: 'halfDay', icon: Check },
  { value: 'absent', label: 'absent', icon: UserRoundX },
];

export default function AttendancePage() {
  const {
    workers, attendance, language, today, selectedDate, setSelectedDate, setMessage,
    saveAttendance, t,
  } = useApp();
  const activeWorkers = workers.filter((worker) => worker.active);
  const [draft, setDraft] = useState<Record<string, AttendanceDraftStatus>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const savedByWorker = new Map(
      attendance.filter((record) => record.date === selectedDate).map((record) => [record.workerId, record.status]),
    );
    setDraft(Object.fromEntries(activeWorkers.map((worker) => [worker.id, savedByWorker.get(worker.id) ?? 'unmarked'])));
  }, [selectedDate, attendance, workers]);

  const counts = {
    present: Object.values(draft).filter((status) => status === 'present').length,
    absent: Object.values(draft).filter((status) => status === 'absent').length,
    half: Object.values(draft).filter((status) => status === 'half-day').length,
    unmarked: activeWorkers.length - Object.values(draft).filter((status) => status !== 'unmarked').length,
  };
  const visibleWorkers = activeWorkers.filter((worker) => worker.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const dateLocale = language === 'kn' ? 'kn-IN' : 'en-IN';

  function setAll(status: AttendanceStatus) {
    setDraft(Object.fromEntries(activeWorkers.map((worker) => [worker.id, status])));
  }

  function updateStatus(workerId: string, status: AttendanceDraftStatus) {
    setDraft((current) => ({ ...current, [workerId]: status }));
  }

  function handleSave() {
    const result = saveAttendance(selectedDate, draft);
    if (result === 'success') setMessage('attendanceSaved');
    else if (result === 'unmarked') setMessage('attendanceIncomplete');
    else if (result === 'no-workers') setMessage('noActiveWorkers');
    else setMessage('attendanceSaveError');
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">{t('attendanceCounts')}</p><h1>{t('attendance')}</h1></div>
        {selectedDate !== today && <button className="text-button" onClick={() => setSelectedDate(today)}>{t('backToToday')}</button>}
      </div>

      <section className="attendance-toolbar">
        <label className="field-label" htmlFor="attendance-date">{t('date')}</label>
        <input id="attendance-date" className="date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        <span className="toolbar-date-preview">{formatDate(selectedDate, dateLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </section>

      <section className="count-strip" aria-label={t('attendanceCounts')}>
        <div className="count-cell count-present"><strong>{counts.present}</strong><span>{t('present')}</span></div>
        <div className="count-cell count-absent"><strong>{counts.absent}</strong><span>{t('absent')}</span></div>
        <div className="count-cell count-half"><strong>{counts.half}</strong><span>{t('halfDay')}</span></div>
        <div className="count-cell count-unmarked"><strong>{counts.unmarked}</strong><span>{t('unmarked')}</span></div>
      </section>

      <section className="attendance-worklist">
        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input aria-label={t('searchWorkers')} placeholder={t('searchWorkers')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="bulk-actions">
            <button className="bulk-button" onClick={() => setAll('present')}>{t('markAllPresent')}</button>
            <button className="bulk-button" onClick={() => setAll('absent')}>{t('markAllAbsent')}</button>
          </div>
        </div>

        {activeWorkers.length === 0 ? (
          <div className="empty-state">{t('noActiveWorkers')}</div>
        ) : visibleWorkers.length === 0 ? (
          <div className="empty-state">{t('noSearchResults')}</div>
        ) : (
          <div className="worker-attendance-list">
            {visibleWorkers.map((worker) => {
              const status = draft[worker.id];
              const statusLabel = status === 'half-day' ? 'halfDay' : status;
              return <article className="attendance-worker" key={worker.id}>
                <div className="attendance-worker-heading">
                  <WorkerIdentity name={worker.name} nameTag="h2" className="attendance-worker-identity">
                    <span className="worker-identity-meta">{t('dailyWage')} <strong>{formatCurrency(worker.dailyWage, language)}</strong></span>
                  </WorkerIdentity>
                  <span className={`saved-indicator ${draft[worker.id] === 'unmarked' ? 'is-pending' : 'is-marked'}`}>
                    {status && t(statusLabel)}
                  </span>
                </div>
                <div className="status-options" role="group" aria-label={`${worker.name}: ${t('attendance')}`}>
                  {statuses.map(({ value, label, icon: Icon }) => (
                    <button
                      className={`status-option status-${value.replace('-', '')} ${draft[worker.id] === value ? 'is-selected' : ''}`}
                      key={value}
                      aria-pressed={draft[worker.id] === value}
                      onClick={() => updateStatus(worker.id, value)}
                    >
                      <Icon size={15} aria-hidden="true" />
                      <span>{t(label)}</span>
                    </button>
                  ))}
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <div className="attendance-save-row">
        <span className={`incomplete-note ${counts.unmarked > 0 ? 'has-incomplete' : ''}`}>
          {counts.unmarked > 0 ? `${counts.unmarked} ${t('workersUnmarked')}` : t('allWorkersMarked')}
        </span>
        <button className="button button-primary save-attendance-button" onClick={handleSave} disabled={activeWorkers.length === 0}>
          <Save size={18} aria-hidden="true" />{t('saveAttendance')}
        </button>
      </div>
    </div>
  );
}