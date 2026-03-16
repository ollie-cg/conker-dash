export interface FilterParams {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  productIds: number[]
  regions: string[]
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse filters from URL search params.
 * Defaults: last 4 weeks, all products, all regions.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): FilterParams {
  // startDate: from search params or default to 28 days ago
  let startDate: string
  const fromParam = searchParams.from
  if (typeof fromParam === 'string' && fromParam.length > 0) {
    startDate = fromParam
  } else {
    const d = new Date()
    d.setDate(d.getDate() - 28)
    startDate = formatDate(d)
  }

  // endDate: from search params or default to yesterday
  let endDate: string
  const toParam = searchParams.to
  if (typeof toParam === 'string' && toParam.length > 0) {
    endDate = toParam
  } else {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    endDate = formatDate(d)
  }

  // productIds: comma-separated string -> number[], or empty = all
  let productIds: number[] = []
  const productsParam = searchParams.products
  if (typeof productsParam === 'string' && productsParam.length > 0) {
    productIds = productsParam
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n))
  }

  // regions: comma-separated string -> string[], or empty = all
  let regions: string[] = []
  const regionsParam = searchParams.regions
  if (typeof regionsParam === 'string' && regionsParam.length > 0) {
    regions = regionsParam.split(',').filter((s) => s.length > 0)
  }

  return { startDate, endDate, productIds, regions }
}
