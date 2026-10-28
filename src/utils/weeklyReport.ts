import type { Language, WeeklyPayment, WeeklyWorkerWage, Worker } from '../types';
import { translate } from '../i18n/translations';
import { formatWeek } from './dates';
import { formatCurrency, formatNumber } from './format';

export function buildWeeklyReportMessage(
  workers: Worker[],
  wages: WeeklyWorkerWage[],
  payments: WeeklyPayment[],
  weekStart: string,
  language: Language,
): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';
  const workerRows = wages.flatMap((wage) => {
    const worker = workers.find((item) => item.id === wage.workerId);
    if (!worker) return [];

    const rateText = wage.wageRates.length > 0
      ? wage.wageRates.map((rate) => formatCurrency(rate, language)).join(' / ')
      : formatCurrency(worker.dailyWage, language);
    const paid = payments.find((payment) => payment.workerId === worker.id && payment.weekStart === weekStart)?.paid ?? false;

    return [
      `${worker.name}`,
      `  ${t('fullDays')}: ${formatNumber(wage.fullDays, language)} | ${t('halfDays')}: ${formatNumber(wage.halfDays, language)} | ${t('equivalentDays')}: ${formatNumber(wage.equivalentDays, language)}`,
      `  ${t('applicableWage')}: ${rateText}`,
      `  ${t('totalWage')}: ${formatCurrency(wage.totalWage, language)} | ${t('paymentStatus')}: ${t(paid ? 'paid' : 'unpaid')}`,
    ].join('\n');
  });

  const total = wages.reduce((sum, wage) => sum + wage.totalWage, 0);
  const paid = wages.reduce((sum, wage) => {
    const isPaid = payments.find((payment) => payment.workerId === wage.workerId && payment.weekStart === weekStart)?.paid ?? false;
    return sum + (isPaid ? wage.totalWage : 0);
  }, 0);

  return [
    t('weeklyReportTitle'),
    `${t('week')}: ${formatWeek(weekStart, locale)}`,
    '',
    ...workerRows,
    '',
    `${t('totalWages')}: ${formatCurrency(total, language)}`,
    `${t('paidTotal')}: ${formatCurrency(paid, language)}`,
    `${t('outstandingTotal')}: ${formatCurrency(total - paid, language)}`,
  ].join('\n');
}