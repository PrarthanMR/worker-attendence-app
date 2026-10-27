import type { WeeklyPayment, WeeklyWorkerWage } from '../types';

export interface WeeklyPaymentTotals {
  total: number;
  paid: number;
  outstanding: number;
}

export function calculateWeeklyPaymentTotals(
  wages: WeeklyWorkerWage[],
  payments: WeeklyPayment[],
  weekStart: string,
): WeeklyPaymentTotals {
  const total = wages.reduce((sum, wage) => sum + wage.totalWage, 0);
  const paid = wages.reduce((sum, wage) => {
    const isPaid = payments.find(
      (payment) => payment.workerId === wage.workerId && payment.weekStart === weekStart,
    )?.paid ?? false;
    return sum + (isPaid ? wage.totalWage : 0);
  }, 0);

  return { total, paid, outstanding: total - paid };
}

export function setWeeklyPaymentStatus(
  payments: WeeklyPayment[],
  workerId: string,
  weekStart: string,
  paid: boolean,
): WeeklyPayment[] {
  const nextPayments: WeeklyPayment[] = [];
  let updated = false;

  for (const payment of payments) {
    if (payment.workerId === workerId && payment.weekStart === weekStart) {
      if (!updated) {
        nextPayments.push({ workerId, weekStart, paid });
        updated = true;
      }
    } else {
      nextPayments.push(payment);
    }
  }

  if (!updated) nextPayments.push({ workerId, weekStart, paid });
  return nextPayments;
}