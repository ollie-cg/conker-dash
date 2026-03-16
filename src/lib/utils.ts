/** Format number as GBP currency, e.g. "£1,234.56" */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}

/** Format number with commas, e.g. "1,234" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value)
}

/** Format as percentage with 1 decimal, e.g. "85.2%" */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Get Monday of the week for a given date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

/** Calculate percentage change between two values */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
