import bootsProductsData from '@/data/boots-products.json'
import bootsStoresData from '@/data/boots-stores.json'
import bootsSalesData from '@/data/boots-sales.json'
import { type BootsCategory, getBootsCategory, ALL_CATEGORIES } from '@/lib/boots-categories'

// ---------------------------------------------------------------------------
// Lookup maps (built once at module load)
// ---------------------------------------------------------------------------
const productMap = new Map(bootsProductsData.map((p) => [p.id, p]))
const storeMap = new Map(bootsStoresData.map((s) => [s.id, s]))

// Store code -> storeId lookup
const storeByCode = new Map(bootsStoresData.map((s) => [s.code, s]))

// Online store IDs (codes 4910 and 4915)
const onlineStoreIds = new Set(
  bootsStoresData.filter((s) => s.format === 'online').map((s) => s.id),
)

// Total physical (non-online) stores
const totalPhysicalStores = bootsStoresData.filter(
  (s) => s.format !== 'online',
).length

// ---------------------------------------------------------------------------
// Helper: ISO week start (Monday)
// ---------------------------------------------------------------------------
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Helper: filter sales by date range
// ---------------------------------------------------------------------------
function filterSales(params: { startDate: string; endDate: string }) {
  return bootsSalesData.filter(
    (s) => s.date >= params.startDate && s.date <= params.endDate,
  )
}

// ---------------------------------------------------------------------------
// Helper: weeks in period (minimum 1)
// ---------------------------------------------------------------------------
function weeksInPeriod(startDate: string, endDate: string): number {
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const endMs = new Date(endDate + 'T00:00:00').getTime()
  return Math.max(1, (endMs - startMs) / (7 * 24 * 60 * 60 * 1000))
}

// ---------------------------------------------------------------------------
// 1. getBootsDataDateRange (NOT async)
// ---------------------------------------------------------------------------
export function getBootsDataDateRange(): { minDate: string; maxDate: string } {
  let minDate = bootsSalesData[0]?.date ?? ''
  let maxDate = bootsSalesData[0]?.date ?? ''
  for (const s of bootsSalesData) {
    if (s.date < minDate) minDate = s.date
    if (s.date > maxDate) maxDate = s.date
  }
  return { minDate, maxDate }
}

// ---------------------------------------------------------------------------
// 2. getBootsSalesForPeriod
// ---------------------------------------------------------------------------
export async function getBootsSalesForPeriod(params: {
  startDate: string
  endDate: string
}): Promise<{ totalUnits: number; totalRevenue: number }> {
  const data = filterSales(params)
  let totalUnits = 0
  let totalRevenue = 0
  for (const s of data) {
    totalUnits += s.units
    totalRevenue += Number(s.revenue)
  }
  return { totalUnits, totalRevenue }
}

// ---------------------------------------------------------------------------
// 3. getBootsStoresScanning
// ---------------------------------------------------------------------------
export async function getBootsStoresScanning(params: {
  startDate: string
  endDate: string
}): Promise<{ count: number; total: number }> {
  const data = filterSales(params)
  // Only count physical stores (exclude online)
  const scanningPhysical = new Set(
    data.filter((s) => !onlineStoreIds.has(s.storeId)).map((s) => s.storeId),
  )
  return { count: scanningPhysical.size, total: totalPhysicalStores }
}

// ---------------------------------------------------------------------------
// 4. getBootsOnlineShare
// ---------------------------------------------------------------------------
export async function getBootsOnlineShare(params: {
  startDate: string
  endDate: string
}): Promise<{ onlineRevenue: number; totalRevenue: number; share: number }> {
  const data = filterSales(params)
  let onlineRevenue = 0
  let totalRevenue = 0
  for (const s of data) {
    const rev = Number(s.revenue)
    totalRevenue += rev
    if (onlineStoreIds.has(s.storeId)) {
      onlineRevenue += rev
    }
  }
  const share = totalRevenue > 0 ? (onlineRevenue / totalRevenue) * 100 : 0
  return { onlineRevenue, totalRevenue, share }
}

// ---------------------------------------------------------------------------
// 5. getBootsChannelSplit
// ---------------------------------------------------------------------------
export async function getBootsChannelSplit(params: {
  startDate: string
  endDate: string
}): Promise<{ channel: string; revenue: number; units: number; pct: number }[]> {
  const data = filterSales(params)

  const store4910 = storeByCode.get('4910')
  const store4915 = storeByCode.get('4915')
  const id4910 = store4910?.id
  const id4915 = store4915?.id

  let inStoreRevenue = 0
  let inStoreUnits = 0
  let ukRevenue = 0
  let ukUnits = 0
  let roiRevenue = 0
  let roiUnits = 0

  for (const s of data) {
    const rev = Number(s.revenue)
    if (s.storeId === id4910) {
      ukRevenue += rev
      ukUnits += s.units
    } else if (s.storeId === id4915) {
      roiRevenue += rev
      roiUnits += s.units
    } else {
      inStoreRevenue += rev
      inStoreUnits += s.units
    }
  }

  const totalRevenue = inStoreRevenue + ukRevenue + roiRevenue
  const pct = (rev: number) => (totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0)

  return [
    { channel: 'In-Store', revenue: inStoreRevenue, units: inStoreUnits, pct: pct(inStoreRevenue) },
    { channel: 'Boots.com UK', revenue: ukRevenue, units: ukUnits, pct: pct(ukRevenue) },
    { channel: 'Boots.com ROI', revenue: roiRevenue, units: roiUnits, pct: pct(roiRevenue) },
  ]
}

// ---------------------------------------------------------------------------
// 6. getBootsWeeklySales
// ---------------------------------------------------------------------------
export async function getBootsWeeklySales(params: {
  startDate: string
  endDate: string
}): Promise<{ weekStart: string; units: number; revenue: number }[]> {
  const data = filterSales(params)
  const map = new Map<string, { units: number; revenue: number }>()
  for (const s of data) {
    const weekStart = getMonday(s.date)
    const existing = map.get(weekStart)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      map.set(weekStart, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  return Array.from(map.entries())
    .map(([weekStart, v]) => ({
      weekStart,
      units: v.units,
      revenue: v.revenue,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// ---------------------------------------------------------------------------
// 6b. getBootsWeeklySalesByProduct
// ---------------------------------------------------------------------------
export async function getBootsWeeklySalesByProduct(params: {
  startDate: string
  endDate: string
}): Promise<
  {
    productId: number
    name: string
    category: BootsCategory
    weeks: { weekStart: string; revenue: number }[]
  }[]
> {
  const data = filterSales(params)

  // productId -> weekStart -> revenue
  const map = new Map<number, Map<string, number>>()
  for (const s of data) {
    const weekStart = getMonday(s.date)
    let productWeeks = map.get(s.productId)
    if (!productWeeks) {
      productWeeks = new Map()
      map.set(s.productId, productWeeks)
    }
    productWeeks.set(weekStart, (productWeeks.get(weekStart) ?? 0) + Number(s.revenue))
  }

  const results: {
    productId: number
    name: string
    category: BootsCategory
    weeks: { weekStart: string; revenue: number }[]
  }[] = []

  for (const [productId, weekMap] of Array.from(map.entries())) {
    const product = productMap.get(productId)
    const name = product?.name ?? ''
    const category = getBootsCategory(name)
    const weeks = Array.from(weekMap.entries())
      .map(([weekStart, revenue]) => ({ weekStart, revenue }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    results.push({ productId, name, category, weeks })
  }

  // Sort by total revenue desc
  results.sort(
    (a, b) =>
      b.weeks.reduce((s, w) => s + w.revenue, 0) -
      a.weeks.reduce((s, w) => s + w.revenue, 0),
  )

  return results
}

// ---------------------------------------------------------------------------
// 7. getBootsSkuPerformance
// ---------------------------------------------------------------------------
export async function getBootsSkuPerformance(params: {
  startDate: string
  endDate: string
}): Promise<
  {
    productId: number
    name: string
    category: BootsCategory
    revenue: number
    units: number
    storesScanning: number
    ros: number
    asp: number
  }[]
> {
  const data = filterSales(params)
  const weeks = weeksInPeriod(params.startDate, params.endDate)

  const aggMap = new Map<
    number,
    { revenue: number; units: number; stores: Set<number> }
  >()
  for (const s of data) {
    let agg = aggMap.get(s.productId)
    if (!agg) {
      agg = { revenue: 0, units: 0, stores: new Set() }
      aggMap.set(s.productId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
    agg.stores.add(s.storeId)
  }

  const results: {
    productId: number
    name: string
    category: BootsCategory
    revenue: number
    units: number
    storesScanning: number
    ros: number
    asp: number
  }[] = []

  for (const entry of Array.from(aggMap.entries())) {
    const [productId, agg] = entry
    // Filter out SKUs with zero revenue and zero units
    if (agg.revenue === 0 && agg.units === 0) continue

    const product = productMap.get(productId)
    const name = product?.name ?? ''
    const category = getBootsCategory(name)
    const storesScanning = agg.stores.size
    const ros =
      storesScanning > 0 ? agg.revenue / storesScanning / weeks : 0
    const asp = agg.units > 0 ? agg.revenue / agg.units : 0

    results.push({
      productId,
      name,
      category,
      revenue: agg.revenue,
      units: agg.units,
      storesScanning,
      ros,
      asp,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// 8. getBootsStorePerformance
// ---------------------------------------------------------------------------
export async function getBootsStorePerformance(params: {
  startDate: string
  endDate: string
}): Promise<
  {
    storeId: number
    code: string
    name: string
    format: string
    revenue: number
    units: number
    skusScanned: number
    ros: number
    asp: number
  }[]
> {
  const data = filterSales(params)
  const weeks = weeksInPeriod(params.startDate, params.endDate)

  const aggMap = new Map<
    number,
    { revenue: number; units: number; products: Set<number> }
  >()
  for (const s of data) {
    let agg = aggMap.get(s.storeId)
    if (!agg) {
      agg = { revenue: 0, units: 0, products: new Set() }
      aggMap.set(s.storeId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
    agg.products.add(s.productId)
  }

  const results: {
    storeId: number
    code: string
    name: string
    format: string
    revenue: number
    units: number
    skusScanned: number
    ros: number
    asp: number
  }[] = []

  for (const entry of Array.from(aggMap.entries())) {
    const [storeId, agg] = entry
    // Filter out stores with zero revenue and zero units
    if (agg.revenue === 0 && agg.units === 0) continue

    const store = storeMap.get(storeId)
    const code = store?.code ?? ''
    const storeName = store?.name ?? ''
    const name = `${code} - ${storeName}`
    const format = store?.format ?? ''
    const skusScanned = agg.products.size
    const ros = agg.revenue / weeks
    const asp = agg.units > 0 ? agg.revenue / agg.units : 0

    results.push({
      storeId,
      code,
      name,
      format,
      revenue: agg.revenue,
      units: agg.units,
      skusScanned,
      ros,
      asp,
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// 9. getBootsHeatmapData
// ---------------------------------------------------------------------------
export async function getBootsHeatmapData(params: {
  startDate: string
  endDate: string
  categories?: BootsCategory[]
}): Promise<{
  stores: { storeId: number; code: string; name: string; format: string }[]
  products: { productId: number; name: string; category: BootsCategory }[]
  cells: Map<string, { revenue: number; units: number }>
}> {
  const data = filterSales(params)

  // Build product category map and optional category filter
  const categoryFilter =
    params.categories && params.categories.length > 0
      ? new Set(params.categories)
      : null

  // Determine which productIds to include based on category filter
  const productCategories = new Map<number, BootsCategory>()
  for (const p of bootsProductsData) {
    const cat = getBootsCategory(p.name)
    if (!categoryFilter || categoryFilter.has(cat)) {
      productCategories.set(p.id, cat)
    }
  }

  // Build cells map and track store/product totals
  const cells = new Map<string, { revenue: number; units: number }>()
  const storeTotals = new Map<number, number>() // storeId -> totalRevenue

  for (const s of data) {
    // Skip products not in category filter
    if (!productCategories.has(s.productId)) continue

    const key = `${s.storeId}-${s.productId}`
    const rev = Number(s.revenue)

    const existing = cells.get(key)
    if (existing) {
      existing.revenue += rev
      existing.units += s.units
    } else {
      cells.set(key, { revenue: rev, units: s.units })
    }

    // Track store revenue totals
    storeTotals.set(s.storeId, (storeTotals.get(s.storeId) ?? 0) + rev)
  }

  // Build stores list: only stores with non-zero revenue, sorted by totalRevenue desc
  const stores = Array.from(storeTotals.entries())
    .filter(([, rev]) => rev > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([storeId]) => {
      const store = storeMap.get(storeId)
      return {
        storeId,
        code: store?.code ?? '',
        name: store?.name ?? '',
        format: store?.format ?? '',
      }
    })

  // Build products list: sorted by category order then name
  const categoryOrder = new Map(ALL_CATEGORIES.map((c, i) => [c, i]))

  // Collect products that appear in cells
  const productIdsInCells = new Set<number>()
  for (const key of Array.from(cells.keys())) {
    const productId = Number(key.split('-')[1])
    productIdsInCells.add(productId)
  }

  const products = Array.from(productCategories.entries())
    .filter(([pid]) => productIdsInCells.has(pid))
    .map(([productId, category]) => {
      const product = productMap.get(productId)
      return {
        productId,
        name: product?.name ?? '',
        category,
      }
    })
    .sort((a, b) => {
      const catDiff =
        (categoryOrder.get(a.category) ?? 999) -
        (categoryOrder.get(b.category) ?? 999)
      if (catDiff !== 0) return catDiff
      return a.name.localeCompare(b.name)
    })

  return { stores, products, cells }
}

// ---------------------------------------------------------------------------
// 10. getBootsStoreDetail
// ---------------------------------------------------------------------------
export async function getBootsStoreDetail(params: {
  storeId: number
  startDate: string
  endDate: string
}): Promise<{
  store: { storeId: number; code: string; name: string; format: string }
  summary: { revenue: number; units: number; skusScanned: number; ros: number; asp: number }
  weeklyTrend: { date: string; units: number; revenue: number }[]
  productBreakdown: {
    productId: number
    name: string
    category: BootsCategory
    revenue: number
    units: number
    ros: number
    asp: number
  }[]
}> {
  const data = filterSales(params).filter((s) => s.storeId === params.storeId)
  const weeks = weeksInPeriod(params.startDate, params.endDate)

  const storeInfo = storeMap.get(params.storeId)
  const store = {
    storeId: params.storeId,
    code: storeInfo?.code ?? '',
    name: storeInfo ? `${storeInfo.code} - ${storeInfo.name}` : '',
    format: storeInfo?.format ?? '',
  }

  // Summary
  let totalRevenue = 0
  let totalUnits = 0
  const productIds = new Set<number>()
  for (const s of data) {
    totalRevenue += Number(s.revenue)
    totalUnits += s.units
    productIds.add(s.productId)
  }
  const skusScanned = productIds.size
  const ros = totalRevenue / weeks
  const asp = totalUnits > 0 ? totalRevenue / totalUnits : 0
  const summary = { revenue: totalRevenue, units: totalUnits, skusScanned, ros, asp }

  // Weekly trend
  const weekMap = new Map<string, { units: number; revenue: number }>()
  for (const s of data) {
    const weekStart = getMonday(s.date)
    const existing = weekMap.get(weekStart)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      weekMap.set(weekStart, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  const weeklyTrend = Array.from(weekMap.entries())
    .map(([date, v]) => ({ date, units: v.units, revenue: v.revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Product breakdown
  const prodMap = new Map<number, { revenue: number; units: number }>()
  for (const s of data) {
    let agg = prodMap.get(s.productId)
    if (!agg) {
      agg = { revenue: 0, units: 0 }
      prodMap.set(s.productId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
  }
  const productBreakdown = Array.from(prodMap.entries())
    .filter(([, agg]) => agg.revenue > 0 || agg.units > 0)
    .map(([productId, agg]) => {
      const product = productMap.get(productId)
      const name = product?.name ?? ''
      const category = getBootsCategory(name)
      const prodRos = agg.revenue / weeks
      const prodAsp = agg.units > 0 ? agg.revenue / agg.units : 0
      return { productId, name, category, revenue: agg.revenue, units: agg.units, ros: prodRos, asp: prodAsp }
    })
    .sort((a, b) => b.revenue - a.revenue)

  return { store, summary, weeklyTrend, productBreakdown }
}

// ---------------------------------------------------------------------------
// 11. getBootsProductDetail
// ---------------------------------------------------------------------------
export async function getBootsProductDetail(params: {
  productId: number
  startDate: string
  endDate: string
}): Promise<{
  product: { productId: number; name: string; category: BootsCategory }
  summary: { revenue: number; units: number; storesScanning: number; ros: number; asp: number }
  weeklyTrend: { date: string; units: number; revenue: number }[]
  storeBreakdown: {
    storeId: number
    code: string
    name: string
    format: string
    revenue: number
    units: number
    ros: number
    asp: number
  }[]
}> {
  const data = filterSales(params).filter((s) => s.productId === params.productId)
  const weeks = weeksInPeriod(params.startDate, params.endDate)

  const productInfo = productMap.get(params.productId)
  const productName = productInfo?.name ?? ''
  const product = {
    productId: params.productId,
    name: productName,
    category: getBootsCategory(productName),
  }

  // Summary
  let totalRevenue = 0
  let totalUnits = 0
  const storeIds = new Set<number>()
  for (const s of data) {
    totalRevenue += Number(s.revenue)
    totalUnits += s.units
    storeIds.add(s.storeId)
  }
  const storesScanning = storeIds.size
  const ros = storesScanning > 0 ? totalRevenue / storesScanning / weeks : 0
  const asp = totalUnits > 0 ? totalRevenue / totalUnits : 0
  const summary = { revenue: totalRevenue, units: totalUnits, storesScanning, ros, asp }

  // Weekly trend
  const weekMap = new Map<string, { units: number; revenue: number }>()
  for (const s of data) {
    const weekStart = getMonday(s.date)
    const existing = weekMap.get(weekStart)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      weekMap.set(weekStart, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  const weeklyTrend = Array.from(weekMap.entries())
    .map(([date, v]) => ({ date, units: v.units, revenue: v.revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Store breakdown
  const storeAggMap = new Map<number, { revenue: number; units: number }>()
  for (const s of data) {
    let agg = storeAggMap.get(s.storeId)
    if (!agg) {
      agg = { revenue: 0, units: 0 }
      storeAggMap.set(s.storeId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
  }
  const storeBreakdown = Array.from(storeAggMap.entries())
    .filter(([, agg]) => agg.revenue > 0 || agg.units > 0)
    .map(([storeId, agg]) => {
      const storeInfo = storeMap.get(storeId)
      const code = storeInfo?.code ?? ''
      const name = storeInfo ? `${storeInfo.code} - ${storeInfo.name}` : ''
      const format = storeInfo?.format ?? ''
      const storeRos = agg.revenue / weeks
      const storeAsp = agg.units > 0 ? agg.revenue / agg.units : 0
      return { storeId, code, name, format, revenue: agg.revenue, units: agg.units, ros: storeRos, asp: storeAsp }
    })
    .sort((a, b) => b.revenue - a.revenue)

  return { product, summary, weeklyTrend, storeBreakdown }
}
