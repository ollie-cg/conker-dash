# Boots Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Boots retailer section to the dashboard with Overview, Products, and Stores pages driven by imported Boots CSV data.

**Architecture:** Parse the Boots wide-matrix CSV into JSON data files matching the existing pattern (products, stores, sales). Add a `boots-queries.ts` module with Boots-specific query functions that read from dedicated `boots-*.json` data files. Build three new pages under `/boots/*` reusing existing components (KpiCard, Filters, SalesChart, MetricToggle) and adding new ones (BootsSkuChart, BootsSkuTable, BootsStoreTable, BootsChannelTable, BootsHeatmap).

**Tech Stack:** Next.js 14 App Router, TypeScript, Recharts, Tailwind CSS, Lucide icons.

---

### Task 1: CSV Parse Script

**Files:**
- Create: `src/scripts/parse-boots-csv.ts`
- Input: `~/Downloads/Arkive Example.csv`
- Output: `src/data/boots-products.json`, `src/data/boots-stores.json`, `src/data/boots-sales.json`

**Step 1: Create the parse script**

```typescript
// src/scripts/parse-boots-csv.ts
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: npx tsx src/scripts/parse-boots-csv.ts <path-to-csv>')
  process.exit(1)
}

const raw = readFileSync(csvPath, 'utf-8')
const lines = raw.split('\n').map((line) => {
  // Simple CSV parse: split on commas (Boots CSV has no quoted commas)
  return line.split(',')
})

// Row 2 (index 1): "Calendar:20/01/2026"
const calendarCell = lines[1][0] // e.g. "Calendar:20/01/2026"
const dateParts = calendarCell.replace('Calendar:', '').split('/')
const reportDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` // YYYY-MM-DD

// Row 4 (index 3): SKU headers — first column is "Store", then revenue SKUs, then unit SKUs
const headerRow = lines[3]
const totalColumns = headerRow.length - 1 // exclude "Store" column
const skuCount = totalColumns / 2 // half revenue, half units

// Extract SKU names from first half (revenue columns)
const skuNames: string[] = []
for (let i = 1; i <= skuCount; i++) {
  skuNames.push(headerRow[i].trim())
}

// Build products: extract Boots code and name from SKU header
// Format: "1679694 - Arkive All Together Now co-cleanser 300"
interface BootsProduct {
  id: number
  bootsCode: string
  name: string
}
const products: BootsProduct[] = skuNames.map((sku, idx) => {
  const dashIndex = sku.indexOf(' - ')
  const bootsCode = dashIndex > -1 ? sku.slice(0, dashIndex).trim() : String(idx)
  const name = dashIndex > -1 ? sku.slice(dashIndex + 3).trim() : sku
  return { id: idx + 1, bootsCode, name: sku }
})

// Parse store rows (row 5+ = index 4+)
interface BootsStore {
  id: number
  code: string
  name: string
  format: string
}
interface BootsSale {
  productId: number
  storeId: number
  date: string
  units: number
  revenue: string
}

const stores: BootsStore[] = []
const sales: BootsSale[] = []
let storeIdCounter = 1

for (let rowIdx = 4; rowIdx < lines.length; rowIdx++) {
  const row = lines[rowIdx]
  if (!row[0] || row[0].trim() === '') continue

  const storeCell = row[0].trim()
  // Format: "0885 - London St Pancras Stn"
  const storeDash = storeCell.indexOf(' - ')
  const storeCode = storeDash > -1 ? storeCell.slice(0, storeDash).trim() : storeCell
  const storeName = storeDash > -1 ? storeCell.slice(storeDash + 3).trim() : storeCell

  const onlineCodes = ['4910', '4915']
  const format = onlineCodes.includes(storeCode) ? 'online' : 'boots'

  const storeId = storeIdCounter++
  stores.push({ id: storeId, code: storeCode, name: storeName, format })

  // Parse revenue and units for each SKU
  for (let skuIdx = 0; skuIdx < skuCount; skuIdx++) {
    const revenueCol = 1 + skuIdx
    const unitsCol = 1 + skuCount + skuIdx

    const revenueStr = (row[revenueCol] ?? '').trim()
    const unitsStr = (row[unitsCol] ?? '').trim()

    if (revenueStr === '' && unitsStr === '') continue

    const revenue = revenueStr === '' ? 0 : parseFloat(revenueStr)
    const units = unitsStr === '' ? 0 : parseInt(unitsStr, 10)

    if (revenue === 0 && units === 0) continue

    sales.push({
      productId: skuIdx + 1,
      storeId,
      date: reportDate,
      units,
      revenue: revenue.toFixed(2),
    })
  }
}

// Write output files
const outDir = join(__dirname, '..', 'data')
writeFileSync(join(outDir, 'boots-products.json'), JSON.stringify(products, null, 2))
writeFileSync(join(outDir, 'boots-stores.json'), JSON.stringify(stores, null, 2))
writeFileSync(join(outDir, 'boots-sales.json'), JSON.stringify(sales, null, 2))

console.log(`Parsed: ${products.length} products, ${stores.length} stores, ${sales.length} sales records`)
console.log(`Report date: ${reportDate}`)
```

**Step 2: Run the parse script**

```bash
npx tsx src/scripts/parse-boots-csv.ts ~/Downloads/"Arkive Example.csv"
```

Expected: prints product/store/sale counts and creates three JSON files in `src/data/`.

**Step 3: Verify output files exist and have correct structure**

Check `boots-products.json` has ~51 entries, `boots-stores.json` has ~167 entries, `boots-sales.json` has sparse sale records.

**Step 4: Commit**

```bash
git add src/scripts/parse-boots-csv.ts src/data/boots-products.json src/data/boots-stores.json src/data/boots-sales.json
git commit -m "feat: add Boots CSV parse script and initial data import"
```

---

### Task 2: Category Mapping Utility

**Files:**
- Create: `src/lib/boots-categories.ts`

**Step 1: Create the category mapping module**

```typescript
// src/lib/boots-categories.ts

export type BootsCategory = 'Haircare' | 'Styling' | 'Fragrance' | 'Gifts' | 'Minis' | 'Other'

export const CATEGORY_COLOURS: Record<BootsCategory, string> = {
  Haircare: '#3b82f6',   // blue-500
  Styling: '#10b981',    // emerald-500
  Fragrance: '#8b5cf6',  // violet-500
  Gifts: '#f59e0b',      // amber-500
  Minis: '#64748b',      // slate-500
  Other: '#0ea5e9',      // sky-500
}

export const CATEGORY_BG_CLASSES: Record<BootsCategory, string> = {
  Haircare: 'bg-blue-100 text-blue-700',
  Styling: 'bg-emerald-100 text-emerald-700',
  Fragrance: 'bg-violet-100 text-violet-700',
  Gifts: 'bg-amber-100 text-amber-700',
  Minis: 'bg-slate-100 text-slate-700',
  Other: 'bg-sky-100 text-sky-700',
}

export function getBootsCategory(skuName: string): BootsCategory {
  const lower = skuName.toLowerCase()

  // Minis check first (specific size indicators)
  if (lower.includes('60ml') || lower.includes('10ml')) return 'Minis'

  // Gifts/Sets check before other categories (some sets contain category keywords)
  if (
    lower.includes(' set') ||
    lower.includes('bundle') ||
    lower.includes('duo') ||
    lower.includes('bauble') ||
    lower.includes('gift') ||
    lower.includes('collection') ||
    lower.includes('cllctn') ||
    lower.includes('discovery')
  ) return 'Gifts'

  // Fragrance
  if (
    lower.includes('edp') ||
    lower.includes('frag') ||
    lower.includes('floral') ||
    lower.includes('woods') ||
    lower.includes('bloom') ||
    lower.includes('elsie') ||
    lower.includes('elise') ||
    lower.includes('brightside') ||
    lower.includes('knd of')
  ) return 'Fragrance'

  // Styling (check before haircare since "dry shampoo" is styling)
  if (
    lower.includes('dry shamp') ||
    lower.includes('hairspray') ||
    lower.includes('veil') ||
    lower.includes('mastery') ||
    lower.includes('mousse') ||
    lower.includes('body hybrid') ||
    lower.includes('pomade') ||
    lower.includes('scene setter') ||
    lower.includes('scnsetr') ||
    lower.includes('blow dry') ||
    lower.includes('new form') ||
    lower.includes('gel') ||
    lower.includes('headliner') ||
    lower.includes('texture') ||
    lower.includes('movement')
  ) return 'Styling'

  // Haircare
  if (
    lower.includes('shampoo') ||
    lower.includes('conditioner') ||
    lower.includes('scalp scrub') ||
    lower.includes('crown') ||
    lower.includes('treatment mask') ||
    lower.includes('future youth') ||
    lower.includes('futureyouth') ||
    lower.includes('all day every') ||
    lower.includes('tad evrydy') ||
    lower.includes('all day extra') ||
    lower.includes('co-cleanser') ||
    lower.includes('co cleanser')
  ) return 'Haircare'

  return 'Other'
}

export const ALL_CATEGORIES: BootsCategory[] = ['Haircare', 'Styling', 'Fragrance', 'Gifts', 'Minis', 'Other']
```

**Step 2: Commit**

```bash
git add src/lib/boots-categories.ts
git commit -m "feat: add Boots SKU category mapping utility"
```

---

### Task 3: Boots Query Functions

**Files:**
- Create: `src/lib/boots-queries.ts`

**Step 1: Create the boots query module**

This module follows the exact same pattern as `src/lib/queries.ts` — reads from JSON data files, builds lookup maps, and exports async query functions.

```typescript
// src/lib/boots-queries.ts
import bootsProductsData from '@/data/boots-products.json'
import bootsStoresData from '@/data/boots-stores.json'
import bootsSalesData from '@/data/boots-sales.json'
import { getBootsCategory, type BootsCategory } from './boots-categories'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BootsProduct {
  id: number
  bootsCode: string
  name: string
}

interface BootsStore {
  id: number
  code: string
  name: string
  format: string
}

interface BootsSaleRow {
  productId: number
  storeId: number
  date: string
  units: number
  revenue: string
}

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------
const products: BootsProduct[] = bootsProductsData as BootsProduct[]
const stores: BootsStore[] = bootsStoresData as BootsStore[]
const salesRows: BootsSaleRow[] = bootsSalesData as BootsSaleRow[]

const productMap = new Map(products.map((p) => [p.id, p]))
const storeMap = new Map(stores.map((s) => [s.id, s]))

const ONLINE_STORE_CODES = new Set(['4910', '4915'])
const onlineStoreIds = new Set(
  stores.filter((s) => ONLINE_STORE_CODES.has(s.code)).map((s) => s.id),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function filterSales(params: { startDate: string; endDate: string }) {
  return salesRows.filter(
    (s) => s.date >= params.startDate && s.date <= params.endDate,
  )
}

function weeksInPeriod(startDate: string, endDate: string): number {
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const endMs = new Date(endDate + 'T00:00:00').getTime()
  return Math.max(1, (endMs - startMs) / (7 * 24 * 60 * 60 * 1000))
}

// ---------------------------------------------------------------------------
// 1. getBootsDataDateRange
// ---------------------------------------------------------------------------
export function getBootsDataDateRange(): { minDate: string; maxDate: string } {
  let minDate = salesRows[0]?.date ?? ''
  let maxDate = salesRows[0]?.date ?? ''
  for (const s of salesRows) {
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
  const scanningStores = new Set(data.map((s) => s.storeId))
  return { count: scanningStores.size, total: stores.length }
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
    if (onlineStoreIds.has(s.storeId)) onlineRevenue += rev
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
}): Promise<
  { channel: string; revenue: number; units: number; pct: number }[]
> {
  const data = filterSales(params)
  const channels: Record<string, { revenue: number; units: number }> = {
    'In-Store': { revenue: 0, units: 0 },
    'Boots.com UK': { revenue: 0, units: 0 },
    'Boots.com ROI': { revenue: 0, units: 0 },
  }
  for (const s of data) {
    const store = storeMap.get(s.storeId)
    const code = store?.code ?? ''
    let channel = 'In-Store'
    if (code === '4910') channel = 'Boots.com UK'
    else if (code === '4915') channel = 'Boots.com ROI'
    channels[channel].revenue += Number(s.revenue)
    channels[channel].units += s.units
  }
  const totalRevenue = Object.values(channels).reduce((sum, c) => sum + c.revenue, 0)
  return Object.entries(channels).map(([channel, v]) => ({
    channel,
    revenue: v.revenue,
    units: v.units,
    pct: totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0,
  }))
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
    .map(([weekStart, v]) => ({ weekStart, units: v.units, revenue: v.revenue }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
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
  const map = new Map<
    number,
    { revenue: number; units: number; stores: Set<number> }
  >()
  for (const s of data) {
    let agg = map.get(s.productId)
    if (!agg) {
      agg = { revenue: 0, units: 0, stores: new Set() }
      map.set(s.productId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
    agg.stores.add(s.storeId)
  }
  return products
    .map((p) => {
      const agg = map.get(p.id)
      const revenue = agg?.revenue ?? 0
      const units = agg?.units ?? 0
      const storesScanning = agg?.stores.size ?? 0
      const ros = storesScanning > 0 ? revenue / storesScanning / weeks : 0
      const asp = units > 0 ? revenue / units : 0
      return {
        productId: p.id,
        name: p.name,
        category: getBootsCategory(p.name),
        revenue,
        units,
        storesScanning,
        ros,
        asp,
      }
    })
    .filter((p) => p.revenue !== 0 || p.units !== 0)
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
  const map = new Map<
    number,
    { revenue: number; units: number; skus: Set<number> }
  >()
  for (const s of data) {
    let agg = map.get(s.storeId)
    if (!agg) {
      agg = { revenue: 0, units: 0, skus: new Set() }
      map.set(s.storeId, agg)
    }
    agg.revenue += Number(s.revenue)
    agg.units += s.units
    agg.skus.add(s.productId)
  }
  return stores
    .map((st) => {
      const agg = map.get(st.id)
      const revenue = agg?.revenue ?? 0
      const units = agg?.units ?? 0
      const skusScanned = agg?.skus.size ?? 0
      const ros = weeks > 0 ? revenue / weeks : 0
      const asp = units > 0 ? revenue / units : 0
      return {
        storeId: st.id,
        code: st.code,
        name: `${st.code} - ${st.name}`,
        format: st.format,
        revenue,
        units,
        skusScanned,
        ros,
        asp,
      }
    })
    .filter((st) => st.revenue !== 0 || st.units !== 0)
}

// ---------------------------------------------------------------------------
// 9. getBootsHeatmapData
// ---------------------------------------------------------------------------
export async function getBootsHeatmapData(params: {
  startDate: string
  endDate: string
  categories?: BootsCategory[]
}): Promise<{
  stores: { storeId: number; name: string; totalRevenue: number }[]
  products: { productId: number; name: string; category: BootsCategory }[]
  cells: Map<string, { revenue: number; units: number }>
}> {
  const data = filterSales(params)

  // Filter products by category if specified
  let filteredProducts = products
  if (params.categories && params.categories.length > 0) {
    const cats = new Set(params.categories)
    filteredProducts = products.filter((p) => cats.has(getBootsCategory(p.name)))
  }
  const filteredProductIds = new Set(filteredProducts.map((p) => p.id))

  // Build cell data: key = "storeId-productId"
  const cells = new Map<string, { revenue: number; units: number }>()
  const storeRevenue = new Map<number, number>()

  for (const s of data) {
    if (!filteredProductIds.has(s.productId)) continue
    const key = `${s.storeId}-${s.productId}`
    const existing = cells.get(key)
    const rev = Number(s.revenue)
    if (existing) {
      existing.revenue += rev
      existing.units += s.units
    } else {
      cells.set(key, { revenue: rev, units: s.units })
    }
    storeRevenue.set(s.storeId, (storeRevenue.get(s.storeId) ?? 0) + rev)
  }

  // Build store list sorted by total revenue desc, filter out zero-revenue stores
  const storeList = Array.from(storeRevenue.entries())
    .filter(([, rev]) => rev !== 0)
    .sort((a, b) => b[1] - a[1])
    .map(([storeId, totalRevenue]) => {
      const store = storeMap.get(storeId)
      return {
        storeId,
        name: `${store?.code ?? ''} - ${store?.name ?? ''}`,
        totalRevenue,
      }
    })

  // Build product list grouped by category
  const productList = filteredProducts
    .map((p) => ({
      productId: p.id,
      name: p.name,
      category: getBootsCategory(p.name),
    }))
    .sort((a, b) => {
      const catOrder: BootsCategory[] = ['Haircare', 'Styling', 'Fragrance', 'Gifts', 'Minis', 'Other']
      const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category)
      if (catDiff !== 0) return catDiff
      return a.name.localeCompare(b.name)
    })

  return { stores: storeList, products: productList, cells }
}
```

**Step 2: Verify the module compiles**

```bash
npx tsc --noEmit src/lib/boots-queries.ts
```

Or just run `pnpm build` and check for errors.

**Step 3: Commit**

```bash
git add src/lib/boots-queries.ts
git commit -m "feat: add Boots-specific query functions"
```

---

### Task 4: Update Navigation

**Files:**
- Modify: `src/components/nav.tsx`

**Step 1: Add Boots section to sidebar**

Add a `ShoppingBag` import from lucide-react and a divider + Boots links below the existing links array. Update the component to render both sections.

The existing `nav.tsx` has a flat `links` array. Add a second array `bootsLinks` and render a divider between them.

```typescript
// Add to imports:
import { ..., ShoppingBag } from 'lucide-react'

// Add after the existing links array:
const bootsLinks = [
  { href: '/boots', label: 'Overview', icon: ShoppingBag },
  { href: '/boots/products', label: 'Products', icon: Package },
  { href: '/boots/stores', label: 'Store', icon: Store },
]
```

In the JSX, after rendering the main links, add:

```tsx
{/* Boots section divider */}
<div className="mx-3 my-3 border-t border-slate-700" />
<p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
  Boots
</p>
{/* Boots links - same rendering as main links */}
```

The `isActive` check for boots links should use `pathname.startsWith(href)` for the parent `/boots` and exact match for sub-pages, or simply: `pathname === href` (works since Overview is `/boots` exact and sub-pages have their own paths).

**Step 2: Verify nav renders correctly**

```bash
pnpm dev
```

Open the app and check the sidebar shows the Boots section with divider.

**Step 3: Commit**

```bash
git add src/components/nav.tsx
git commit -m "feat: add Boots section to sidebar navigation"
```

---

### Task 5: Boots Overview Page

**Files:**
- Create: `src/app/boots/page.tsx`
- Create: `src/app/boots/metric-toggle.tsx` (copy from `src/app/sales/metric-toggle.tsx` — identical component)

**Step 1: Create metric toggle**

Copy `src/app/sales/metric-toggle.tsx` to `src/app/boots/metric-toggle.tsx`. It's a reusable client component for toggling between revenue and units.

**Step 2: Create the Boots Overview page**

Follow the same patterns as `src/app/page.tsx` (Overview) and `src/app/sales/page.tsx`:
- Server component that fetches data with `Promise.all()`
- Uses `parseFilters` to get date range from search params
- Renders KpiCard grid, SalesChart, and a channel split table

```typescript
// src/app/boots/page.tsx
import KpiCard from '@/components/kpi-card'
import Filters from '@/components/filters'
import SalesChart from '@/components/charts/sales-chart'
import MetricToggle from './metric-toggle'
import {
  getBootsSalesForPeriod,
  getBootsStoresScanning,
  getBootsOnlineShare,
  getBootsChannelSplit,
  getBootsWeeklySales,
  getBootsDataDateRange,
} from '@/lib/boots-queries'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  percentChange,
} from '@/lib/utils'

// Use the boots data date range for filter defaults
function parseBootsFilters(searchParams: Record<string, string | string[] | undefined>) {
  const { maxDate } = getBootsDataDateRange()
  // ... same logic as parseFilters but using boots date range
  // endDate defaults to maxDate, startDate defaults to 28 days before
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
    startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return { startDate, endDate }
}

export default async function BootsOverviewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  // Compute previous period for WoW comparison
  const days = Math.round(
    (new Date(filters.endDate + 'T00:00:00').getTime() -
      new Date(filters.startDate + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24),
  )
  const prevEnd = new Date(filters.startDate + 'T00:00:00')
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days)
  const prevStartStr = prevStart.toISOString().slice(0, 10)
  const prevEndStr = prevEnd.toISOString().slice(0, 10)

  const [sales, prevSales, scanning, prevScanning, online, prevOnline, channelSplit, weeklySales] =
    await Promise.all([
      getBootsSalesForPeriod(filters),
      getBootsSalesForPeriod({ startDate: prevStartStr, endDate: prevEndStr }),
      getBootsStoresScanning(filters),
      getBootsStoresScanning({ startDate: prevStartStr, endDate: prevEndStr }),
      getBootsOnlineShare(filters),
      getBootsOnlineShare({ startDate: prevStartStr, endDate: prevEndStr }),
      getBootsChannelSplit(filters),
      getBootsWeeklySales(filters),
    ])

  // Derived metrics
  const weeks = Math.max(1, days / 7)
  const prevWeeks = Math.max(1, days / 7)
  const ros = scanning.count > 0 ? sales.totalRevenue / scanning.count / weeks : 0
  const prevRos = prevScanning.count > 0 ? prevSales.totalRevenue / prevScanning.count / prevWeeks : 0
  const asp = sales.totalUnits > 0 ? sales.totalRevenue / sales.totalUnits : 0
  const prevAsp = prevSales.totalUnits > 0 ? prevSales.totalRevenue / prevSales.totalUnits : 0

  const revenueChange = percentChange(sales.totalRevenue, prevSales.totalRevenue)
  const unitsChange = percentChange(sales.totalUnits, prevSales.totalUnits)
  const rosChange = percentChange(ros, prevRos)
  const aspChange = percentChange(asp, prevAsp)
  const onlinePpChange = online.share - prevOnline.share

  // Prepare chart data (reuse SalesChart format)
  const chartData = weeklySales.map((w) => ({
    date: w.weekStart,
    units: w.units,
    revenue: w.revenue,
  }))

  // Helper
  function changeType(val: number): 'positive' | 'negative' | 'neutral' {
    if (val > 0) return 'positive'
    if (val < 0) return 'negative'
    return 'neutral'
  }
  function changeStr(val: number): string {
    const sign = val > 0 ? '+' : ''
    return `${sign}${val.toFixed(1)}% vs prev period`
  }

  return (
    <>
      <Filters products={[]} regions={[]} hideProducts />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Boots Overview</h1>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Revenue" value={formatCurrency(sales.totalRevenue)} change={changeStr(revenueChange)} changeType={changeType(revenueChange)} />
        <KpiCard title="Units" value={formatNumber(sales.totalUnits)} change={changeStr(unitsChange)} changeType={changeType(unitsChange)} />
        <KpiCard title="Stores Scanning" value={`${formatNumber(scanning.count)} of ${formatNumber(scanning.total)}`} change={formatPercent(scanning.total > 0 ? (scanning.count / scanning.total) * 100 : 0)} changeType={scanning.count > 0 ? 'positive' : 'neutral'} />
        <KpiCard title="Rate of Sale" value={formatCurrency(ros)} change={changeStr(rosChange)} changeType={changeType(rosChange)} />
        <KpiCard title="Avg Selling Price" value={formatCurrency(asp)} change={changeStr(aspChange)} changeType={changeType(aspChange)} />
        <KpiCard title="Online Share" value={formatPercent(online.share)} change={`${onlinePpChange >= 0 ? '+' : ''}${onlinePpChange.toFixed(1)}pp vs prev`} changeType={changeType(onlinePpChange)} />
      </div>

      {/* Weekly trend chart */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Weekly {metric === 'revenue' ? 'Revenue' : 'Units'}
          </h2>
          <MetricToggle current={metric} />
        </div>
        <SalesChart data={chartData} metric={metric} />
      </div>

      {/* Channel split table */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Channel Split</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Channel</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Units</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {channelSplit.map((row, i) => (
                <tr key={row.channel} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{row.channel}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{row.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
```

**Step 3: Verify the page renders**

```bash
pnpm dev
```

Navigate to `/boots` and verify KPIs, chart, and channel table render.

**Step 4: Commit**

```bash
git add src/app/boots/
git commit -m "feat: add Boots Overview page with KPIs, trend chart, channel split"
```

---

### Task 6: Boots Products Page

**Files:**
- Create: `src/app/boots/products/page.tsx`
- Create: `src/components/charts/boots-sku-chart.tsx`
- Create: `src/components/tables/boots-sku-table.tsx`

**Step 1: Create the horizontal bar chart component**

```typescript
// src/components/charts/boots-sku-chart.tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CATEGORY_COLOURS, type BootsCategory } from '@/lib/boots-categories'

interface BootsSkuChartProps {
  data: { name: string; revenue: number; category: BootsCategory }[]
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `\u00a3${(value / 1000).toFixed(1)}k`
  return `\u00a3${value.toFixed(0)}`
}

// Truncate long SKU names for Y-axis
function truncate(str: string, max: number): string {
  // Strip Boots code prefix for display
  const dashIdx = str.indexOf(' - ')
  const name = dashIdx > -1 ? str.slice(dashIdx + 3) : str
  return name.length > max ? name.slice(0, max) + '...' : name
}

export default function BootsSkuChart({ data }: BootsSkuChartProps) {
  // Sort by revenue descending
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)

  if (sorted.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-slate-400">
        No SKU data for the selected period
      </div>
    )
  }

  const chartHeight = Math.max(400, sorted.length * 28)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickFormatter={(v) => truncate(v, 30)}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={220}
        />
        <Tooltip
          formatter={(value) => [
            `\u00a3${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
            'Revenue',
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, index) => (
            <Cell key={index} fill={CATEGORY_COLOURS[entry.category]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Step 2: Create the SKU performance table**

Follow the pattern from `src/components/tables/sales-table.tsx` and `src/app/products/products-table.tsx`:

```typescript
// src/components/tables/boots-sku-table.tsx
'use client'

import { useState, useMemo } from 'react'
import { CATEGORY_BG_CLASSES, type BootsCategory } from '@/lib/boots-categories'

interface SkuRow {
  productId: number
  name: string
  category: BootsCategory
  revenue: number
  units: number
  storesScanning: number
  ros: number
  asp: number
}

interface BootsSkuTableProps {
  data: SkuRow[]
}

type SortKey = 'name' | 'category' | 'revenue' | 'units' | 'storesScanning' | 'ros' | 'asp'
type SortDir = 'asc' | 'desc'

function formatCurrency(value: number): string {
  return '\u00a3' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block w-3 text-[10px] leading-none">
      {active ? (dir === 'asc' ? '\u25b2' : '\u25bc') : '\u25b4\u25be'}
    </span>
  )
}

export default function BootsSkuTable({ data }: BootsSkuTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'name' || sortKey === 'category') {
        cmp = a[sortKey].localeCompare(b[sortKey])
      } else {
        cmp = a[sortKey] - b[sortKey]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'category' ? 'asc' : 'desc')
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: 'name', label: 'SKU', align: 'text-left' },
    { key: 'category', label: 'Category', align: 'text-left' },
    { key: 'revenue', label: 'Revenue', align: 'text-right' },
    { key: 'units', label: 'Units', align: 'text-right' },
    { key: 'storesScanning', label: 'Stores', align: 'text-right' },
    { key: 'ros', label: 'ROS', align: 'text-right' },
    { key: 'asp', label: 'ASP', align: 'text-right' },
  ]

  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-400">No SKU data</div>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th key={col.key} className={`cursor-pointer select-none whitespace-nowrap px-4 py-2.5 font-medium text-slate-600 ${col.align} hover:text-slate-900`} onClick={() => handleSort(col.key)}>
                {col.label}<SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.productId} className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
              <td className="px-4 py-2.5 font-medium text-slate-700">{row.name}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BG_CLASSES[row.category]}`}>
                  {row.category}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.storesScanning)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.ros)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.asp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 3: Create the Boots Products page**

```typescript
// src/app/boots/products/page.tsx
import Filters from '@/components/filters'
import BootsSkuChart from '@/components/charts/boots-sku-chart'
import BootsSkuTable from '@/components/tables/boots-sku-table'
import { getBootsSkuPerformance, getBootsDataDateRange } from '@/lib/boots-queries'
import { ALL_CATEGORIES, CATEGORY_COLOURS } from '@/lib/boots-categories'

function parseBootsFilters(searchParams: Record<string, string | string[] | undefined>) {
  const { maxDate } = getBootsDataDateRange()
  let endDate = typeof searchParams.to === 'string' ? searchParams.to : maxDate
  let startDate: string
  if (typeof searchParams.from === 'string') {
    startDate = searchParams.from
  } else {
    const d = new Date(endDate + 'T00:00:00')
    d.setDate(d.getDate() - 28)
    startDate = d.toISOString().slice(0, 10)
  }
  return { startDate, endDate }
}

export default async function BootsProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const skuData = await getBootsSkuPerformance(filters)

  return (
    <>
      <Filters products={[]} regions={[]} hideProducts />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Boots Products</h1>
        <p className="mt-1 text-sm text-slate-500">{skuData.length} SKUs with sales</p>
      </div>

      {/* Category legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {ALL_CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CATEGORY_COLOURS[cat] }} />
            {cat}
          </div>
        ))}
      </div>

      {/* SKU bar chart */}
      <div className="mb-8 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4" style={{ maxHeight: '600px' }}>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Revenue by SKU</h2>
        <BootsSkuChart data={skuData} />
      </div>

      {/* SKU table */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">SKU Performance</h2>
        <BootsSkuTable data={skuData} />
      </div>
    </>
  )
}
```

**Step 4: Verify the page renders**

```bash
pnpm dev
```

Navigate to `/boots/products` and verify chart + table render.

**Step 5: Commit**

```bash
git add src/app/boots/products/ src/components/charts/boots-sku-chart.tsx src/components/tables/boots-sku-table.tsx
git commit -m "feat: add Boots Products page with SKU bar chart and performance table"
```

---

### Task 7: Boots Stores Page — Table

**Files:**
- Create: `src/app/boots/stores/page.tsx`
- Create: `src/components/tables/boots-store-table.tsx`

**Step 1: Create the store performance table**

Follow the same pattern as `boots-sku-table.tsx`:

```typescript
// src/components/tables/boots-store-table.tsx
'use client'

import { useState, useMemo } from 'react'

interface StoreRow {
  storeId: number
  code: string
  name: string
  format: string
  revenue: number
  units: number
  skusScanned: number
  ros: number
  asp: number
}

interface BootsStoreTableProps {
  data: StoreRow[]
}

type SortKey = 'name' | 'revenue' | 'units' | 'skusScanned' | 'ros' | 'asp'
type SortDir = 'asc' | 'desc'

function formatCurrency(value: number): string {
  return '\u00a3' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block w-3 text-[10px] leading-none">
      {active ? (dir === 'asc' ? '\u25b2' : '\u25bc') : '\u25b4\u25be'}
    </span>
  )
}

export default function BootsStoreTable({ data }: BootsStoreTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else {
        cmp = a[sortKey] - b[sortKey]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: 'name', label: 'Store', align: 'text-left' },
    { key: 'revenue', label: 'Revenue', align: 'text-right' },
    { key: 'units', label: 'Units', align: 'text-right' },
    { key: 'skusScanned', label: 'SKUs Scanned', align: 'text-right' },
    { key: 'ros', label: 'ROS/Week', align: 'text-right' },
    { key: 'asp', label: 'ASP', align: 'text-right' },
  ]

  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-400">No store data</div>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th key={col.key} className={`cursor-pointer select-none whitespace-nowrap px-4 py-2.5 font-medium text-slate-600 ${col.align} hover:text-slate-900`} onClick={() => handleSort(col.key)}>
                {col.label}<SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.storeId} className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
              <td className="px-4 py-2.5 font-medium text-slate-700">
                {row.name}
                {row.format === 'online' && (
                  <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">Online</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.skusScanned)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.ros)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.asp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Create the Boots Stores page (table only first, heatmap in next task)**

```typescript
// src/app/boots/stores/page.tsx
import Filters from '@/components/filters'
import BootsStoreTable from '@/components/tables/boots-store-table'
import { getBootsStorePerformance, getBootsDataDateRange } from '@/lib/boots-queries'

function parseBootsFilters(searchParams: Record<string, string | string[] | undefined>) {
  const { maxDate } = getBootsDataDateRange()
  let endDate = typeof searchParams.to === 'string' ? searchParams.to : maxDate
  let startDate: string
  if (typeof searchParams.from === 'string') {
    startDate = searchParams.from
  } else {
    const d = new Date(endDate + 'T00:00:00')
    d.setDate(d.getDate() - 28)
    startDate = d.toISOString().slice(0, 10)
  }
  return { startDate, endDate }
}

export default async function BootsStoresPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const storeData = await getBootsStorePerformance(filters)

  return (
    <>
      <Filters products={[]} regions={[]} hideProducts />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Boots Stores</h1>
        <p className="mt-1 text-sm text-slate-500">{storeData.length} stores with sales</p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Store Performance</h2>
        <BootsStoreTable data={storeData} />
      </div>

      {/* Heatmap will be added in Task 8 */}
    </>
  )
}
```

**Step 3: Verify the page renders**

Navigate to `/boots/stores` and verify the store table renders with "Online" badges on stores 4910/4915.

**Step 4: Commit**

```bash
git add src/app/boots/stores/ src/components/tables/boots-store-table.tsx
git commit -m "feat: add Boots Stores page with store performance table"
```

---

### Task 8: Boots Stores Page — Heatmap

**Files:**
- Create: `src/components/boots-heatmap.tsx`
- Modify: `src/app/boots/stores/page.tsx` (add heatmap below table)

**Step 1: Create the heatmap component**

This is a custom HTML table/grid (not Recharts) with Tailwind background colours. It's a client component for interactivity (category filter chips, tooltip on hover).

```typescript
// src/components/boots-heatmap.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  ALL_CATEGORIES,
  CATEGORY_COLOURS,
  CATEGORY_BG_CLASSES,
  type BootsCategory,
} from '@/lib/boots-categories'

interface HeatmapStore {
  storeId: number
  name: string
  totalRevenue: number
}

interface HeatmapProduct {
  productId: number
  name: string
  category: BootsCategory
}

interface HeatmapCell {
  revenue: number
  units: number
}

interface BootsHeatmapProps {
  stores: HeatmapStore[]
  products: HeatmapProduct[]
  // Serialised as array of [key, value] since Map can't be passed as props
  cells: [string, HeatmapCell][]
}

function formatCurrency(value: number): string {
  return '\u00a3' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Truncate product name for column header
function truncateProduct(name: string): string {
  const dashIdx = name.indexOf(' - ')
  const short = dashIdx > -1 ? name.slice(dashIdx + 3) : name
  return short.length > 20 ? short.slice(0, 20) + '...' : short
}

export default function BootsHeatmap({ stores, products, cells: cellsArray }: BootsHeatmapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<BootsCategory>>(
    new Set(ALL_CATEGORIES),
  )
  const [tooltip, setTooltip] = useState<{
    store: string
    product: string
    revenue: number
    units: number
    x: number
    y: number
  } | null>(null)

  const cellMap = useMemo(() => new Map(cellsArray), [cellsArray])

  // Filter products by active categories
  const filteredProducts = useMemo(
    () => products.filter((p) => activeCategories.has(p.category)),
    [products, activeCategories],
  )

  // Find max revenue for colour scaling
  const maxRevenue = useMemo(() => {
    let max = 0
    for (const [, cell] of cellsArray) {
      if (cell.revenue > max) max = cell.revenue
    }
    return max
  }, [cellsArray])

  function toggleCategory(cat: BootsCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat) // don't allow empty
      } else {
        next.add(cat)
      }
      return next
    })
  }

  function getCellBg(revenue: number): string {
    if (revenue === 0 || maxRevenue === 0) return ''
    const intensity = Math.min(revenue / maxRevenue, 1)
    // Use inline style for dynamic opacity
    return ''
  }

  function getCellStyle(revenue: number): React.CSSProperties {
    if (revenue <= 0 || maxRevenue === 0) return {}
    const intensity = Math.min(revenue / maxRevenue, 1)
    const alpha = 0.1 + intensity * 0.7
    return { backgroundColor: `rgba(59, 130, 246, ${alpha})` }
  }

  return (
    <div>
      {/* Category filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggleCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategories.has(cat)
                ? CATEGORY_BG_CLASSES[cat]
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="relative overflow-x-auto rounded-lg border border-slate-200">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600 min-w-[200px]">
                Store
              </th>
              {filteredProducts.map((p) => (
                <th
                  key={p.productId}
                  className="px-1 py-2 text-center font-medium min-w-[40px]"
                  style={{ backgroundColor: CATEGORY_COLOURS[p.category] + '20' }}
                  title={p.name}
                >
                  <div className="writing-mode-vertical max-h-[100px] overflow-hidden whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: '10px', color: '#475569' }}
                  >
                    {truncateProduct(p.name)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store, i) => (
              <tr key={store.storeId} className={i % 2 === 1 ? 'bg-slate-50/30' : ''}>
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100">
                  {store.name}
                </td>
                {filteredProducts.map((p) => {
                  const cell = cellMap.get(`${store.storeId}-${p.productId}`)
                  const revenue = cell?.revenue ?? 0
                  const units = cell?.units ?? 0
                  return (
                    <td
                      key={p.productId}
                      className="px-0.5 py-0.5 text-center cursor-default border border-slate-50"
                      style={getCellStyle(revenue)}
                      onMouseEnter={(e) => {
                        if (revenue !== 0 || units !== 0) {
                          setTooltip({
                            store: store.name,
                            product: p.name,
                            revenue,
                            units,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {revenue > 0 && (
                        <div className="h-4 w-full rounded-sm" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <p className="font-semibold text-slate-700">{tooltip.store}</p>
            <p className="text-slate-500">{tooltip.product}</p>
            <p className="mt-1 text-slate-700">
              {formatCurrency(tooltip.revenue)} | {tooltip.units} units
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Update the Boots Stores page to include the heatmap**

Add imports and data fetching for `getBootsHeatmapData`, pass data to the `BootsHeatmap` component. The `cells` Map needs to be serialised as `Array.from(cells.entries())` since Maps can't be passed as React props.

Add to `src/app/boots/stores/page.tsx`:

```typescript
import BootsHeatmap from '@/components/boots-heatmap'
import { getBootsStorePerformance, getBootsHeatmapData, getBootsDataDateRange } from '@/lib/boots-queries'

// In the component, add to Promise.all:
const [storeData, heatmapData] = await Promise.all([
  getBootsStorePerformance(filters),
  getBootsHeatmapData(filters),
])

// In the JSX, after the store table:
<div className="mb-8">
  <h2 className="mb-3 text-sm font-semibold text-slate-700">SKU x Store Heatmap</h2>
  <BootsHeatmap
    stores={heatmapData.stores}
    products={heatmapData.products}
    cells={Array.from(heatmapData.cells.entries())}
  />
</div>
```

**Step 3: Verify the heatmap renders**

Navigate to `/boots/stores`, scroll down to see the heatmap. Verify:
- Category filter chips toggle column groups
- Hovering cells shows tooltip
- Horizontal scrolling works
- Store names are sticky on the left

**Step 4: Commit**

```bash
git add src/components/boots-heatmap.tsx src/app/boots/stores/page.tsx
git commit -m "feat: add SKU x Store heatmap to Boots Stores page"
```

---

### Task 9: Extract Shared Boots Filter Helper

**Files:**
- Create: `src/lib/boots-filters.ts`
- Modify: `src/app/boots/page.tsx` (use shared helper)
- Modify: `src/app/boots/products/page.tsx` (use shared helper)
- Modify: `src/app/boots/stores/page.tsx` (use shared helper)

**Step 1: Extract the duplicated `parseBootsFilters` into a shared module**

All three Boots pages have the same `parseBootsFilters` function duplicated. Extract it:

```typescript
// src/lib/boots-filters.ts
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
    startDate = d.toISOString().slice(0, 10)
  }
  return { startDate, endDate }
}
```

Replace the local `parseBootsFilters` in all three page files with:

```typescript
import { parseBootsFilters } from '@/lib/boots-filters'
```

**Step 2: Verify all three pages still work**

```bash
pnpm dev
```

Navigate through `/boots`, `/boots/products`, `/boots/stores`.

**Step 3: Commit**

```bash
git add src/lib/boots-filters.ts src/app/boots/page.tsx src/app/boots/products/page.tsx src/app/boots/stores/page.tsx
git commit -m "refactor: extract shared parseBootsFilters helper"
```

---

### Task 10: Build Verification

**Step 1: Run the production build**

```bash
pnpm build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Fix any build errors**

Address any type errors, missing imports, or other issues.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors in Boots dashboard"
```

---

### Task 11: Hide Region Filter on Boots Pages

**Files:**
- Modify: `src/components/filters.tsx`

**Step 1: Add `hideRegions` prop**

The existing `Filters` component has `hideProducts` but no `hideRegions`. Add a `hideRegions?: boolean` prop and conditionally hide the region multi-select, matching the existing `hideProducts` pattern.

**Step 2: Update Boots pages to pass `hideRegions`**

All three Boots pages pass `regions={[]}` which shows an empty dropdown. Instead pass `hideRegions` to hide it entirely.

**Step 3: Verify and commit**

```bash
pnpm build
git add src/components/filters.tsx src/app/boots/page.tsx src/app/boots/products/page.tsx src/app/boots/stores/page.tsx
git commit -m "feat: add hideRegions prop to Filters, hide on Boots pages"
```
