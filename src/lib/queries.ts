import productsData from '@/data/products.json'
import storesData from '@/data/stores.json'
import distributionDataRaw from '@/data/distribution.json'

interface DistributionRow {
  id: number
  productId: number
  storeId: number
  startDate: string
  endDate: string | null
}
const distributionData: DistributionRow[] = distributionDataRaw
import salesData from '@/data/sales.json'
import forecastsData from '@/data/forecasts.json'
import targetsData from '@/data/targets.json'
import risksAndOppsData from '@/data/risks-and-opps.json'

// ---------------------------------------------------------------------------
// Lookup maps (built once at module load)
// ---------------------------------------------------------------------------
const storeMap = new Map(storesData.map((s) => [s.id, s]))
const productMap = new Map(productsData.map((p) => [p.id, p]))

// Quick region lookup: storeId -> region
const storeRegionMap = new Map(storesData.map((s) => [s.id, s.region]))

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
// Helper: filter sales by date range and optional productIds
// ---------------------------------------------------------------------------
function filterSales(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}) {
  let data = salesData.filter(
    (s) => s.date >= params.startDate && s.date <= params.endDate,
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((s) => ids.has(s.productId))
  }
  return data
}

// ---------------------------------------------------------------------------
// NEW: getDataDateRange
// ---------------------------------------------------------------------------
export function getDataDateRange(): { minDate: string; maxDate: string } {
  let minDate = salesData[0]?.date ?? ''
  let maxDate = salesData[0]?.date ?? ''
  for (const s of salesData) {
    if (s.date < minDate) minDate = s.date
    if (s.date > maxDate) maxDate = s.date
  }
  return { minDate, maxDate }
}

// ---------------------------------------------------------------------------
// 1. getProducts
// ---------------------------------------------------------------------------
export async function getProducts() {
  return [...productsData].sort((a, b) => a.id - b.id)
}

// ---------------------------------------------------------------------------
// 2. getRegions
// ---------------------------------------------------------------------------
export async function getRegions() {
  const regions = Array.from(new Set(storesData.map((s) => s.region))).sort()
  return regions
}

// ---------------------------------------------------------------------------
// 3. getSalesForPeriod
// ---------------------------------------------------------------------------
export async function getSalesForPeriod(params: {
  productIds?: number[]
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
// 4. getSalesByDay
// ---------------------------------------------------------------------------
export async function getSalesByDay(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ date: string; units: number; revenue: number }[]> {
  const data = filterSales(params)
  const map = new Map<string, { units: number; revenue: number }>()
  for (const s of data) {
    const existing = map.get(s.date)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      map.set(s.date, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, units: v.units, revenue: v.revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ---------------------------------------------------------------------------
// 5. getSalesByRegion
// ---------------------------------------------------------------------------
export async function getSalesByRegion(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ region: string; units: number; revenue: number }[]> {
  const data = filterSales(params)
  const map = new Map<string, { units: number; revenue: number }>()
  for (const s of data) {
    const region = storeRegionMap.get(s.storeId)
    if (!region) continue
    const existing = map.get(region)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      map.set(region, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  return Array.from(map.entries())
    .map(([region, v]) => ({ region, units: v.units, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ---------------------------------------------------------------------------
// 6. getSalesByProduct
// ---------------------------------------------------------------------------
export async function getSalesByProduct(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<
  { productId: number; productName: string; units: number; revenue: number }[]
> {
  const data = filterSales(params)
  const map = new Map<number, { units: number; revenue: number }>()
  for (const s of data) {
    const existing = map.get(s.productId)
    if (existing) {
      existing.units += s.units
      existing.revenue += Number(s.revenue)
    } else {
      map.set(s.productId, { units: s.units, revenue: Number(s.revenue) })
    }
  }
  return Array.from(map.entries()).map(([productId, v]) => ({
    productId,
    productName: productMap.get(productId)?.name ?? '',
    units: v.units,
    revenue: v.revenue,
  }))
}

// ---------------------------------------------------------------------------
// 7. getStoresStocking
// ---------------------------------------------------------------------------
export async function getStoresStocking(params: {
  productIds?: number[]
  asOfDate: string
}): Promise<{ count: number }> {
  let data = distributionData.filter(
    (d) =>
      d.startDate <= params.asOfDate &&
      (d.endDate === null || d.endDate >= params.asOfDate),
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((d) => ids.has(d.productId))
  }
  const distinctStores = new Set(data.map((d) => d.storeId))
  return { count: distinctStores.size }
}

// ---------------------------------------------------------------------------
// 8. getStoresScanning
// ---------------------------------------------------------------------------
export async function getStoresScanning(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ count: number }> {
  const data = filterSales(params)
  const distinctStores = new Set(data.map((s) => s.storeId))
  return { count: distinctStores.size }
}

// ---------------------------------------------------------------------------
// 9. getWeeklySales
// ---------------------------------------------------------------------------
export async function getWeeklySales(params: {
  productIds?: number[]
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
// 10. getWeeklyStoresScanning
// ---------------------------------------------------------------------------
export async function getWeeklyStoresScanning(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ weekStart: string; count: number }[]> {
  const data = filterSales(params)
  const map = new Map<string, Set<number>>()
  for (const s of data) {
    const weekStart = getMonday(s.date)
    let storeSet = map.get(weekStart)
    if (!storeSet) {
      storeSet = new Set()
      map.set(weekStart, storeSet)
    }
    storeSet.add(s.storeId)
  }
  return Array.from(map.entries())
    .map(([weekStart, stores]) => ({ weekStart, count: stores.size }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// ---------------------------------------------------------------------------
// 11. getStoresStockingByRegion
// ---------------------------------------------------------------------------
export async function getStoresStockingByRegion(params: {
  productIds?: number[]
  asOfDate: string
}): Promise<{ region: string; count: number }[]> {
  let data = distributionData.filter(
    (d) =>
      d.startDate <= params.asOfDate &&
      (d.endDate === null || d.endDate >= params.asOfDate),
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((d) => ids.has(d.productId))
  }
  // Group by region, counting distinct stores per region
  const regionStores = new Map<string, Set<number>>()
  for (const d of data) {
    const region = storeRegionMap.get(d.storeId)
    if (!region) continue
    let storeSet = regionStores.get(region)
    if (!storeSet) {
      storeSet = new Set()
      regionStores.set(region, storeSet)
    }
    storeSet.add(d.storeId)
  }
  return Array.from(regionStores.entries())
    .map(([region, stores]) => ({ region, count: stores.size }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

// ---------------------------------------------------------------------------
// 12. getStoresScanningByRegion
// ---------------------------------------------------------------------------
export async function getStoresScanningByRegion(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ region: string; count: number }[]> {
  const data = filterSales(params)
  const regionStores = new Map<string, Set<number>>()
  for (const s of data) {
    const region = storeRegionMap.get(s.storeId)
    if (!region) continue
    let storeSet = regionStores.get(region)
    if (!storeSet) {
      storeSet = new Set()
      regionStores.set(region, storeSet)
    }
    storeSet.add(s.storeId)
  }
  return Array.from(regionStores.entries())
    .map(([region, stores]) => ({ region, count: stores.size }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

// ---------------------------------------------------------------------------
// 13. getForecasts
// ---------------------------------------------------------------------------
export async function getForecasts(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}) {
  let data = forecastsData.filter(
    (f) => f.weekStart >= params.startDate && f.weekStart <= params.endDate,
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((f) => ids.has(f.productId))
  }
  return data
    .map((f) => ({
      id: f.id,
      productId: f.productId,
      productName: productMap.get(f.productId)?.name ?? '',
      weekStart: f.weekStart,
      units: f.units,
      revenue: f.revenue,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// ---------------------------------------------------------------------------
// 14. getTargets
// ---------------------------------------------------------------------------
export async function getTargets(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}) {
  let data = targetsData.filter(
    (t) => t.weekStart >= params.startDate && t.weekStart <= params.endDate,
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((t) => ids.has(t.productId))
  }
  return data
    .map((t) => ({
      id: t.id,
      productId: t.productId,
      productName: productMap.get(t.productId)?.name ?? '',
      weekStart: t.weekStart,
      units: t.units,
      revenue: t.revenue,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

// ---------------------------------------------------------------------------
// 15. getRisksAndOpps
// ---------------------------------------------------------------------------
export async function getRisksAndOpps(params?: {
  status?: string
  type?: string
  productId?: number
}) {
  let data = [...risksAndOppsData]
  if (params?.status) {
    data = data.filter((r) => r.status === params.status)
  }
  if (params?.type) {
    data = data.filter((r) => r.type === params.type)
  }
  if (params?.productId) {
    data = data.filter((r) => r.productId === params.productId)
  }
  return data
    .map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: productMap.get(r.productId)?.name ?? null,
      type: r.type,
      title: r.title,
      description: r.description,
      status: r.status,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// ---------------------------------------------------------------------------
// 16. getProductsSummary
// ---------------------------------------------------------------------------
export async function getProductsSummary(params: {
  startDate: string
  endDate: string
  regions?: string[]
}): Promise<
  {
    id: number
    name: string
    ean: string | null
    packSize: string | null
    rrp: number
    revenue: number
    units: number
    storesStocking: number
    storesScanning: number
    ros: number
  }[]
> {
  // Calculate number of weeks in the period for ROS
  const startMs = new Date(params.startDate + 'T00:00:00').getTime()
  const endMs = new Date(params.endDate + 'T00:00:00').getTime()
  const weeks = Math.max(1, (endMs - startMs) / (7 * 24 * 60 * 60 * 1000))

  // Optional region filter: build a set of valid storeIds
  let regionStoreIds: Set<number> | null = null
  if (params.regions && params.regions.length > 0) {
    const regionSet = new Set(params.regions)
    regionStoreIds = new Set(
      storesData.filter((s) => regionSet.has(s.region)).map((s) => s.id),
    )
  }

  // Filter sales by date range (and optionally by region via storeId)
  let salesFiltered = salesData.filter(
    (s) => s.date >= params.startDate && s.date <= params.endDate,
  )
  if (regionStoreIds) {
    salesFiltered = salesFiltered.filter((s) => regionStoreIds!.has(s.storeId))
  }

  // Per-product sales aggregation
  const salesAggMap = new Map<
    number,
    { revenue: number; units: number; scanningStores: Set<number> }
  >()
  for (const s of salesFiltered) {
    let agg = salesAggMap.get(s.productId)
    if (!agg) {
      agg = { revenue: 0, units: 0, scanningStores: new Set() }
      salesAggMap.set(s.productId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
    agg.scanningStores.add(s.storeId)
  }

  // Per-product stocking (distribution) counts
  let distFiltered = distributionData.filter(
    (d) =>
      d.startDate <= params.endDate &&
      (d.endDate === null || d.endDate >= params.startDate),
  )
  if (regionStoreIds) {
    distFiltered = distFiltered.filter((d) => regionStoreIds!.has(d.storeId))
  }

  const stockingMap = new Map<number, Set<number>>()
  for (const d of distFiltered) {
    let storeSet = stockingMap.get(d.productId)
    if (!storeSet) {
      storeSet = new Set()
      stockingMap.set(d.productId, storeSet)
    }
    storeSet.add(d.storeId)
  }

  // Build result for all products, sorted by name
  const allProducts = [...productsData].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return allProducts.map((p) => {
    const sAgg = salesAggMap.get(p.id)
    const revenue = sAgg?.revenue ?? 0
    const units = sAgg?.units ?? 0
    const storesScanning = sAgg?.scanningStores.size ?? 0
    const storesStocking = stockingMap.get(p.id)?.size ?? 0
    const ros = storesScanning > 0 ? revenue / storesScanning / weeks : 0

    return {
      id: p.id,
      name: p.name,
      ean: p.ean ?? null,
      packSize: p.packSize ?? null,
      rrp: Number(p.rrp ?? 0),
      revenue,
      units,
      storesStocking,
      storesScanning,
      ros,
    }
  })
}

// ---------------------------------------------------------------------------
// 17. getStoreScanningDetail
// ---------------------------------------------------------------------------
export async function getStoreScanningDetail(params: {
  productIds?: number[]
  startDate: string
  endDate: string
  region: string
}): Promise<
  {
    storeId: number
    storeName: string
    format: string
    totalUnits: number
    totalRevenue: number
    lastScanDate: string
  }[]
> {
  // Get storeIds in the given region
  const regionStoreIds = new Set(
    storesData.filter((s) => s.region === params.region).map((s) => s.id),
  )

  // Filter sales by date range, region, and optionally productIds
  let data = salesData.filter(
    (s) =>
      s.date >= params.startDate &&
      s.date <= params.endDate &&
      regionStoreIds.has(s.storeId),
  )
  if (params.productIds && params.productIds.length > 0) {
    const ids = new Set(params.productIds)
    data = data.filter((s) => ids.has(s.productId))
  }

  // Group by store
  const storeAgg = new Map<
    number,
    { totalUnits: number; totalRevenue: number; lastScanDate: string }
  >()
  for (const s of data) {
    const existing = storeAgg.get(s.storeId)
    if (existing) {
      existing.totalUnits += s.units
      existing.totalRevenue += Number(s.revenue)
      if (s.date > existing.lastScanDate) existing.lastScanDate = s.date
    } else {
      storeAgg.set(s.storeId, {
        totalUnits: s.units,
        totalRevenue: Number(s.revenue),
        lastScanDate: s.date,
      })
    }
  }

  return Array.from(storeAgg.entries()).map(([storeId, v]) => {
    const store = storeMap.get(storeId)
    return {
      storeId,
      storeName: store?.name ?? '',
      format: store?.format ?? '',
      totalUnits: v.totalUnits,
      totalRevenue: v.totalRevenue,
      lastScanDate: v.lastScanDate,
    }
  })
}
