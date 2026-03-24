# Store & Product Detail Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add detail pages for stores and products, with clickable table rows navigating to them.

**Architecture:** Next.js dynamic routes `/stores/[id]` and `/products/[id]` as async server components. Existing table components get `Link`-wrapped rows. Two new query functions aggregate detail data from the existing JSON data source. The existing `SalesChart` and `KpiCard` components are reused.

**Tech Stack:** Next.js 14 App Router, React 18, Recharts, Tailwind CSS, Lucide icons

---

### Task 1: Add `getBootsStoreDetail` query function

**Files:**
- Modify: `src/lib/boots-queries.ts`

**Step 1: Add the function at the end of `boots-queries.ts`**

```ts
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
```

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: add getBootsStoreDetail query function
```

---

### Task 2: Add `getBootsProductDetail` query function

**Files:**
- Modify: `src/lib/boots-queries.ts`

**Step 1: Add the function at the end of `boots-queries.ts`**

```ts
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
```

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: add getBootsProductDetail query function
```

---

### Task 3: Make store table rows clickable

**Files:**
- Modify: `src/components/tables/boots-store-table.tsx`

**Step 1: Update the component**

Add a `searchParams` prop so the table knows which filter params to carry through, and wrap each `<tr>` in a Next.js `Link`.

Changes:
1. Add `import Link from 'next/link'` and `import { useSearchParams } from 'next/navigation'`
2. Inside the component, read searchParams with `useSearchParams()` and build a query string helper
3. Replace the `<tr>` in the tbody with a clickable row that navigates to `/stores/[storeId]?from=...&to=...`

The row should use `cursor-pointer` and the existing hover style already works.

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: make store table rows clickable with links to detail page
```

---

### Task 4: Make product table rows clickable

**Files:**
- Modify: `src/components/tables/boots-sku-table.tsx`

**Step 1: Update the component**

Same pattern as Task 3: add `Link` import and `useSearchParams`, wrap each `<tr>` with a link to `/products/[productId]?from=...&to=...`.

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: make product table rows clickable with links to detail page
```

---

### Task 5: Create store detail page

**Files:**
- Create: `src/app/stores/[id]/page.tsx`

**Step 1: Create the page component**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { parseBootsFilters } from '@/lib/boots-filters'
import { getBootsStoreDetail } from '@/lib/boots-queries'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { CATEGORY_BG_CLASSES } from '@/lib/boots-categories'
import KpiCard from '@/components/kpi-card'
import TimeRangeSelect from '@/components/time-range-select'
import SalesChart from '@/components/charts/sales-chart'
import MetricToggle from '@/app/metric-toggle'

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const storeId = Number(params.id)
  if (isNaN(storeId)) notFound()

  const filters = parseBootsFilters(searchParams)
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  const { store, summary, weeklyTrend, productBreakdown } =
    await getBootsStoreDetail({ storeId, ...filters })

  if (!store.name) notFound()

  // Build query string for back link
  const qs = new URLSearchParams()
  if (typeof searchParams.from === 'string') qs.set('from', searchParams.from)
  if (typeof searchParams.to === 'string') qs.set('to', searchParams.to)
  const backHref = qs.toString() ? `/stores?${qs}` : '/stores'

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Stores
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-medium text-slate-900">{store.name}</h1>
        {store.format === 'online' && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
            Online
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
        {/* KPI cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard title="Revenue" value={formatCurrency(summary.revenue)} />
          <KpiCard title="Units" value={formatNumber(summary.units)} />
          <KpiCard title="SKUs Scanned" value={formatNumber(summary.skusScanned)} />
          <KpiCard title="ROS/Week" value={formatCurrency(summary.ros)} />
          <KpiCard title="ASP" value={formatCurrency(summary.asp)} />
        </div>

        {/* Weekly trend */}
        <div className="mb-8 flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Weekly {metric === 'revenue' ? 'Revenue' : 'Units'}
            </h2>
            <MetricToggle current={metric} />
          </div>
          <div className="h-64">
            <SalesChart data={weeklyTrend} metric={metric} />
          </div>
        </div>

        {/* Product breakdown table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Products at this Store</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">SKU</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Category</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Units</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ROS</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ASP</th>
              </tr>
            </thead>
            <tbody>
              {productBreakdown.map((row, i) => (
                <tr
                  key={row.productId}
                  className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">{row.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BG_CLASSES[row.category]}`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.ros)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.asp)}</td>
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

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: add store detail page at /stores/[id]
```

---

### Task 6: Create product detail page

**Files:**
- Create: `src/app/products/[id]/page.tsx`

**Step 1: Create the page component**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { parseBootsFilters } from '@/lib/boots-filters'
import { getBootsProductDetail } from '@/lib/boots-queries'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { CATEGORY_BG_CLASSES } from '@/lib/boots-categories'
import KpiCard from '@/components/kpi-card'
import TimeRangeSelect from '@/components/time-range-select'
import SalesChart from '@/components/charts/sales-chart'
import MetricToggle from '@/app/metric-toggle'

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const productId = Number(params.id)
  if (isNaN(productId)) notFound()

  const filters = parseBootsFilters(searchParams)
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  const { product, summary, weeklyTrend, storeBreakdown } =
    await getBootsProductDetail({ productId, ...filters })

  if (!product.name) notFound()

  // Build query string for back link
  const qs = new URLSearchParams()
  if (typeof searchParams.from === 'string') qs.set('from', searchParams.from)
  if (typeof searchParams.to === 'string') qs.set('to', searchParams.to)
  const backHref = qs.toString() ? `/products?${qs}` : '/products'

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Products
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-medium text-slate-900">{product.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BG_CLASSES[product.category]}`}>
          {product.category}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
        {/* KPI cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard title="Revenue" value={formatCurrency(summary.revenue)} />
          <KpiCard title="Units" value={formatNumber(summary.units)} />
          <KpiCard title="Stores Scanning" value={formatNumber(summary.storesScanning)} />
          <KpiCard title="ROS/Store/Week" value={formatCurrency(summary.ros)} />
          <KpiCard title="ASP" value={formatCurrency(summary.asp)} />
        </div>

        {/* Weekly trend */}
        <div className="mb-8 flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Weekly {metric === 'revenue' ? 'Revenue' : 'Units'}
            </h2>
            <MetricToggle current={metric} />
          </div>
          <div className="h-64">
            <SalesChart data={weeklyTrend} metric={metric} />
          </div>
        </div>

        {/* Store breakdown table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Stores selling this Product</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Store</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Units</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ROS</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ASP</th>
              </tr>
            </thead>
            <tbody>
              {storeBreakdown.map((row, i) => (
                <tr
                  key={row.storeId}
                  className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {row.name}
                    {row.format === 'online' && (
                      <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                        Online
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.ros)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.asp)}</td>
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

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: add product detail page at /products/[id]
```

---

### Task 7: Update nav to highlight parent routes on detail pages

**Files:**
- Modify: `src/components/nav.tsx`

**Step 1: Update `isActive` check to use `startsWith` for stores/products**

Change the active check from `pathname === href` to also match child routes:

```ts
const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
```

**Step 2: Verify it compiles**

Run: `cd /Users/ollie/projects/conker/conker_dash && npx tsc --noEmit`

**Step 3: Commit**

```
feat: highlight parent nav item on detail pages
```

---

### Task 8: Smoke test

**Step 1: Run the dev server and verify**

Run: `cd /Users/ollie/projects/conker/conker_dash && npm run build`

Verify:
- Build succeeds with no errors
- `/stores` page renders with clickable rows
- `/stores/1` renders the store detail page
- `/products` page renders with clickable rows
- `/products/1` renders the product detail page

**Step 2: Commit if any fixes needed**
