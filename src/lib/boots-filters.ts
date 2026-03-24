import { getBootsDataDateRange } from './boots-queries'

export function parseBootsFilters(
  searchParams: Record<string, string | string[] | undefined>,
): { startDate: string; endDate: string } {
  const { maxDate } = getBootsDataDateRange()

  let endDate: string
  const toParam = searchParams.to
  if (typeof toParam === 'string' && toParam.length > 0) {
    endDate = toParam
  } else {
    endDate = maxDate
  }

  let startDate: string
  const fromParam = searchParams.from
  if (typeof fromParam === 'string' && fromParam.length > 0) {
    startDate = fromParam
  } else {
    const d = new Date(endDate + 'T00:00:00')
    d.setDate(d.getDate() - 28)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    startDate = `${year}-${month}-${day}`
  }

  return { startDate, endDate }
}
