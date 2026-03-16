import { db } from '@/db'
import {
  products,
  stores,
  distribution,
  sales,
  forecasts,
  targets,
  risksAndOpps,
} from '@/db/schema'
import {
  eq,
  and,
  gte,
  lte,
  sql,
  sum,
  countDistinct,
  desc,
  asc,
  inArray,
  isNull,
  or,
  max,
} from 'drizzle-orm'

// ---------------------------------------------------------------------------
// 1. getProducts
// ---------------------------------------------------------------------------
export async function getProducts() {
  return db.select().from(products).orderBy(asc(products.id))
}

// ---------------------------------------------------------------------------
// 2. getRegions
// ---------------------------------------------------------------------------
export async function getRegions() {
  const rows = await db
    .selectDistinct({ region: stores.region })
    .from(stores)
    .orderBy(asc(stores.region))
  return rows.map((r) => r.region)
}

// ---------------------------------------------------------------------------
// 3. getSalesForPeriod
// ---------------------------------------------------------------------------
export async function getSalesForPeriod(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ totalUnits: number; totalRevenue: number }> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const [row] = await db
    .select({
      totalUnits: sum(sales.units),
      totalRevenue: sum(sales.revenue),
    })
    .from(sales)
    .where(and(...conditions))

  return {
    totalUnits: Number(row?.totalUnits ?? 0),
    totalRevenue: Number(row?.totalRevenue ?? 0),
  }
}

// ---------------------------------------------------------------------------
// 4. getSalesByDay
// ---------------------------------------------------------------------------
export async function getSalesByDay(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ date: string; units: number; revenue: number }[]> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const rows = await db
    .select({
      date: sales.date,
      units: sum(sales.units),
      revenue: sum(sales.revenue),
    })
    .from(sales)
    .where(and(...conditions))
    .groupBy(sales.date)
    .orderBy(asc(sales.date))

  return rows.map((r) => ({
    date: r.date,
    units: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 5. getSalesByRegion
// ---------------------------------------------------------------------------
export async function getSalesByRegion(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ region: string; units: number; revenue: number }[]> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const rows = await db
    .select({
      region: stores.region,
      units: sum(sales.units),
      revenue: sum(sales.revenue),
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(...conditions))
    .groupBy(stores.region)
    .orderBy(desc(sum(sales.revenue)))

  return rows.map((r) => ({
    region: r.region,
    units: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
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
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const rows = await db
    .select({
      productId: sales.productId,
      productName: products.name,
      units: sum(sales.units),
      revenue: sum(sales.revenue),
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(and(...conditions))
    .groupBy(sales.productId, products.name)

  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    units: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 7. getStoresStocking
// ---------------------------------------------------------------------------
export async function getStoresStocking(params: {
  productIds?: number[]
  asOfDate: string
}): Promise<{ count: number }> {
  const conditions = [
    lte(distribution.startDate, params.asOfDate),
    or(
      isNull(distribution.endDate),
      gte(distribution.endDate, params.asOfDate),
    ),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(distribution.productId, params.productIds))
  }

  const [row] = await db
    .select({ count: countDistinct(distribution.storeId) })
    .from(distribution)
    .where(and(...conditions))

  return { count: Number(row?.count ?? 0) }
}

// ---------------------------------------------------------------------------
// 8. getStoresScanning
// ---------------------------------------------------------------------------
export async function getStoresScanning(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ count: number }> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const [row] = await db
    .select({ count: countDistinct(sales.storeId) })
    .from(sales)
    .where(and(...conditions))

  return { count: Number(row?.count ?? 0) }
}

// ---------------------------------------------------------------------------
// 9. getWeeklySales
// ---------------------------------------------------------------------------
export async function getWeeklySales(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ weekStart: string; units: number; revenue: number }[]> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const weekStartExpr = sql<string>`date_trunc('week', ${sales.date}::date)::date`

  const rows = await db
    .select({
      weekStart: weekStartExpr,
      units: sum(sales.units),
      revenue: sum(sales.revenue),
    })
    .from(sales)
    .where(and(...conditions))
    .groupBy(weekStartExpr)
    .orderBy(asc(weekStartExpr))

  return rows.map((r) => ({
    weekStart: String(r.weekStart),
    units: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 10. getWeeklyStoresScanning
// ---------------------------------------------------------------------------
export async function getWeeklyStoresScanning(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ weekStart: string; count: number }[]> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const weekStartExpr = sql<string>`date_trunc('week', ${sales.date}::date)::date`

  const rows = await db
    .select({
      weekStart: weekStartExpr,
      count: countDistinct(sales.storeId),
    })
    .from(sales)
    .where(and(...conditions))
    .groupBy(weekStartExpr)
    .orderBy(asc(weekStartExpr))

  return rows.map((r) => ({
    weekStart: String(r.weekStart),
    count: Number(r.count ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 11. getStoresStockingByRegion
// ---------------------------------------------------------------------------
export async function getStoresStockingByRegion(params: {
  productIds?: number[]
  asOfDate: string
}): Promise<{ region: string; count: number }[]> {
  const conditions = [
    lte(distribution.startDate, params.asOfDate),
    or(
      isNull(distribution.endDate),
      gte(distribution.endDate, params.asOfDate),
    ),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(distribution.productId, params.productIds))
  }

  const rows = await db
    .select({
      region: stores.region,
      count: countDistinct(distribution.storeId),
    })
    .from(distribution)
    .innerJoin(stores, eq(distribution.storeId, stores.id))
    .where(and(...conditions))
    .groupBy(stores.region)
    .orderBy(asc(stores.region))

  return rows.map((r) => ({
    region: r.region,
    count: Number(r.count ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 12. getStoresScanningByRegion
// ---------------------------------------------------------------------------
export async function getStoresScanningByRegion(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}): Promise<{ region: string; count: number }[]> {
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const rows = await db
    .select({
      region: stores.region,
      count: countDistinct(sales.storeId),
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(...conditions))
    .groupBy(stores.region)
    .orderBy(asc(stores.region))

  return rows.map((r) => ({
    region: r.region,
    count: Number(r.count ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// 13. getForecasts
// ---------------------------------------------------------------------------
export async function getForecasts(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}) {
  const conditions = [
    gte(forecasts.weekStart, params.startDate),
    lte(forecasts.weekStart, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(forecasts.productId, params.productIds))
  }

  return db
    .select({
      id: forecasts.id,
      productId: forecasts.productId,
      productName: products.name,
      weekStart: forecasts.weekStart,
      units: forecasts.units,
      revenue: forecasts.revenue,
    })
    .from(forecasts)
    .innerJoin(products, eq(forecasts.productId, products.id))
    .where(and(...conditions))
    .orderBy(asc(forecasts.weekStart))
}

// ---------------------------------------------------------------------------
// 14. getTargets
// ---------------------------------------------------------------------------
export async function getTargets(params: {
  productIds?: number[]
  startDate: string
  endDate: string
}) {
  const conditions = [
    gte(targets.weekStart, params.startDate),
    lte(targets.weekStart, params.endDate),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(targets.productId, params.productIds))
  }

  return db
    .select({
      id: targets.id,
      productId: targets.productId,
      productName: products.name,
      weekStart: targets.weekStart,
      units: targets.units,
      revenue: targets.revenue,
    })
    .from(targets)
    .innerJoin(products, eq(targets.productId, products.id))
    .where(and(...conditions))
    .orderBy(asc(targets.weekStart))
}

// ---------------------------------------------------------------------------
// 15. getRisksAndOpps
// ---------------------------------------------------------------------------
export async function getRisksAndOpps(params?: {
  status?: string
  type?: string
  productId?: number
}) {
  const conditions = []
  if (params?.status) {
    conditions.push(eq(risksAndOpps.status, params.status))
  }
  if (params?.type) {
    conditions.push(eq(risksAndOpps.type, params.type))
  }
  if (params?.productId) {
    conditions.push(eq(risksAndOpps.productId, params.productId))
  }

  return db
    .select({
      id: risksAndOpps.id,
      productId: risksAndOpps.productId,
      productName: products.name,
      type: risksAndOpps.type,
      title: risksAndOpps.title,
      description: risksAndOpps.description,
      status: risksAndOpps.status,
      createdAt: risksAndOpps.createdAt,
      updatedAt: risksAndOpps.updatedAt,
    })
    .from(risksAndOpps)
    .leftJoin(products, eq(risksAndOpps.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(risksAndOpps.createdAt))
}

// ---------------------------------------------------------------------------
// 16. getStoreScanningDetail
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
  const conditions = [
    gte(sales.date, params.startDate),
    lte(sales.date, params.endDate),
    eq(stores.region, params.region),
  ]
  if (params.productIds && params.productIds.length > 0) {
    conditions.push(inArray(sales.productId, params.productIds))
  }

  const rows = await db
    .select({
      storeId: stores.id,
      storeName: stores.name,
      format: stores.format,
      totalUnits: sum(sales.units),
      totalRevenue: sum(sales.revenue),
      lastScanDate: max(sales.date),
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(...conditions))
    .groupBy(stores.id, stores.name, stores.format)

  return rows.map((r) => ({
    storeId: r.storeId,
    storeName: r.storeName,
    format: r.format,
    totalUnits: Number(r.totalUnits ?? 0),
    totalRevenue: Number(r.totalRevenue ?? 0),
    lastScanDate: String(r.lastScanDate ?? ''),
  }))
}
