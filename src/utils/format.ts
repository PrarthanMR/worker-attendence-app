import type { Language } from '../types';

export function formatCurrency(amount: number, language: Language): string {
  return new Intl.NumberFormat(language === 'kn' ? 'kn-IN' : 'en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'kn' ? 'kn-IN' : 'en-IN', {
    maximumFractionDigits: 1,
  }).format(value);
}