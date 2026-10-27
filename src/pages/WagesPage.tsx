import { ArrowLeft, ArrowRight, HandCoins } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WorkerIdentity from '../components/WorkerIdentity';
import { getWeekDates, formatDate, formatWeek, getWeekStart, shiftDate } from '../utils/dates';
import { formatCurrency, formatNumber } from '../utils/format';
import { calculateWeeklyPaymentTotals } from '../utils/payments';
import { calculateWeeklyWages, deduplicateAttendanceRecords } from '../utils/wages';

export default function WagesPage() {
  const { workers, attendance, payments, language, today, weekStart, setWeekStart, togglePayment, t } = useApp();
  const savedRecords = deduplicateAttendanceRecords(attendance);
  const weeklyRows = calculateWeeklyWages(workers, savedRecords, weekStart);
  const weeklyRecords = savedRecords.filter((record) => getWeekDates(weekStart).includes(record.date));
  const paymentTotals = calculateWeeklyPaymentTotals(weeklyRows, payments, weekStart);
  const weekDates = getWeekDates(weekStart);
  const daysElapsed = weekDates.filter((date) => date <= today).length;
  const activeWorkerIds = new Set(workers.filter((worker) => worker.active).map((worker) => worker.id));
  const savedActiveEntries = new Set(weeklyRecords.filter((record) => activeWorkerIds.has(record.workerId)).map((record) => `${record.workerId}:${record.date}`));
  const shouldCheckCompleteness = weekStart === getWeekStart(today) || weeklyRecords.length > 0;
  const missingEntries = shouldCheckCompleteness
    ? Math.max(0, workers.filter((worker) => worker.active).length * daysElapsed - savedActiveEntries.size)
    : 0;
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';

  function changeWeek(offset: number) {
    setWeekStart(shiftDate(weekStart, offset * 7));
  }

  return (
    <div className="page-stack">
      <div className="page-heading"><div><p className="eyebrow">{t('totalWages')}</p><h1>{t('wages')}</h1></div></div>

      <section className="week-toolbar">
        <button className="week-arrow" aria-label={t('previousWeek')} onClick={() => changeWeek(-1)}><ArrowLeft size={19} aria-hidden="true" /></button>
        <div className="week-range"><strong>{formatWeek(weekStart, locale)}</strong><span>{t('week')}: {formatDate(weekStart, locale, { weekday: 'short' })} – {formatDate(shiftDate(weekStart, 6), locale, { weekday: 'short' })}</span></div>
        <button className="week-arrow" aria-label={t('nextWeek')} onClick={() => changeWeek(1)}><ArrowRight size={19} aria-hidden="true" /></button>
        <label className="week-picker-label" htmlFor="week-date">{t('week')}</label>
        <input id="week-date" className="date-input" type="date" value={weekStart} onChange={(event) => setWeekStart(getWeekStart(event.target.value))} />
      </section>

      <section className="wage-summary-grid" aria-label={t('totalWages')}>
        <article className="wage-summary-card summary-total"><span>{t('totalWages')}</span><strong>{formatCurrency(paymentTotals.total, language)}</strong></article>
        <article className="wage-summary-card summary-paid"><span>{t('paidTotal')}</span><strong>{formatCurrency(paymentTotals.paid, language)}</strong></article>
        <article className="wage-summary-card summary-outstanding"><span>{t('outstandingTotal')}</span><strong>{formatCurrency(paymentTotals.outstanding, language)}</strong></article>
      </section>

      {missingEntries > 0 && (
        <div className="incomplete-banner" role="status"><span className="note-dot" /><strong>{missingEntries}</strong> {t('incompleteEntries')}. {t('unmarked')} {t('workersUnmarked')}</div>
      )}

      {weeklyRecords.length === 0 ? (
        <div className="empty-state">{t('noWages')}</div>
      ) : (
        <section className="wage-list" aria-label={t('workers')}>
          <div className="wage-table-heading"><span>{t('workers')}</span><span>{t('fullDays')} / {t('halfDays')}</span><span>{t('equivalentDays')}</span><span>{t('applicableWage')}</span><span>{t('totalWage')}</span><span>{t('paymentStatus')}</span></div>
          {weeklyRows.map((row) => {
            const worker = workers.find((item) => item.id === row.workerId);
            if (!worker) return null;
            const isPaid = payments.find((payment) => payment.workerId === worker.id && payment.weekStart === weekStart)?.paid ?? false;
            const rateLabel = row.wageRates.length > 1
              ? row.wageRates.map((rate) => formatCurrency(rate, language)).join(' · ')
              : formatCurrency(row.wageRates[0] ?? worker.dailyWage, language);
            return (
              <article className="wage-worker" key={worker.id}>
                <WorkerIdentity name={worker.name} nameTag="h2" className="wage-worker-name">
                  <span className="wage-mobile-caption">{t('applicableWage')}: {rateLabel}</span>
                </WorkerIdentity>
                <div className="wage-days"><span className="mobile-caption">{t('fullDays')} / {t('halfDays')}</span><strong>{formatNumber(row.fullDays, language)} / {formatNumber(row.halfDays, language)}</strong></div>
                <div className="wage-equivalent"><span className="mobile-caption">{t('equivalentDays')}</span><strong>{formatNumber(row.equivalentDays, language)}</strong></div>
                <div className="wage-rate"><span className="mobile-caption">{t('applicableWage')}</span><strong>{rateLabel}</strong></div>
                <div className="wage-total"><span className="mobile-caption">{t('totalWage')}</span><strong>{formatCurrency(row.totalWage, language)}</strong></div>
                <div className="wage-payment">
                  <span className={`payment-badge ${isPaid ? 'is-paid' : 'is-unpaid'}`}>{t(isPaid ? 'paid' : 'unpaid')}</span>
                  <button className={`payment-toggle ${isPaid ? 'marked-paid' : ''}`} aria-label={t(isPaid ? 'markUnpaid' : 'markPaid')} onClick={() => togglePayment(worker.id, weekStart, !isPaid)}>
                    <HandCoins size={16} aria-hidden="true" /><span>{t(isPaid ? 'markUnpaid' : 'markPaid')}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}