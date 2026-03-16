# Vercel Deployment — Static JSON Frontend

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy conker_dash to Vercel as a frontend-only app by replacing Postgres/Drizzle with static JSON data files.

**Architecture:** Export all DB data to JSON files in `src/data/`. Rewrite `src/lib/queries.ts` to do in-memory filtering/aggregation on the JSON arrays instead of SQL. Remove server actions (risks page becomes read-only). Pin default date filters to the data's date range so the demo works indefinitely.

**Tech Stack:** Next.js 14 App Router, Vercel, GitHub (ollie-cg), static JSON data

---

### Task 1: Export DB Data to JSON

**Files:**
- Create: `scripts/export-data.ts`
- Create: `src/data/products.json`
- Create: `src/data/stores.json`
- Create: `src/data/distribution.json`
- Create: `src/data/sales.json`
- Create: `src/data/forecasts.json`
- Create: `src/data/targets.json`
- Create: `src/data/risks-and-opps.json`

**Step 1: Write the export script**

Create `scripts/export-data.ts` that connects to the local Postgres DB and dumps each table to a JSON file in `src/data/`. Use compact JSON format. For sales (77K rows), use an array-of-objects but with short keys (`p`, `s`, `d`, `u`, `r`) to minimize size.

```typescript
// scripts/export-data.ts
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/db/schema'
import { asc } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client)

async function exportData() {
  const outDir = path.join(__dirname, '..', 'src', 'data')
  fs.mkdirSync(outDir, { recursive: true })

  // Products
  const products = await db.select().from(schema.products).orderBy(asc(schema.products.id))
  fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(products))
  console.log(`products: ${products.length} rows`)

  // Stores
  const stores = await db.select().from(schema.stores).orderBy(asc(schema.stores.id))
  fs.writeFileSync(path.join(outDir, 'stores.json'), JSON.stringify(stores))
  console.log(`stores: ${stores.length} rows`)

  // Distribution
  const dist = await db.select().from(schema.distribution).orderBy(asc(schema.distribution.id))
  fs.writeFileSync(path.join(outDir, 'distribution.json'), JSON.stringify(dist))
  console.log(`distribution: ${dist.length} rows`)

  // Sales — compact format
  const salesRows = await db
    .select({
      productId: schema.sales.productId,
      storeId: schema.sales.storeId,
      date: schema.sales.date,
      units: schema.sales.units,
      revenue: schema.sales.revenue,
    })
    .from(schema.sales)
    .orderBy(asc(schema.sales.date))
  fs.writeFileSync(path.join(outDir, 'sales.json'), JSON.stringify(salesRows))
  console.log(`sales: ${salesRows.length} rows`)

  // Forecasts
  const fc = await db.select().from(schema.forecasts).orderBy(asc(schema.forecasts.weekStart))
  fs.writeFileSync(path.join(outDir, 'forecasts.json'), JSON.stringify(fc))
  console.log(`forecasts: ${fc.length} rows`)

  // Targets
  const tg = await db.select().from(schema.targets).orderBy(asc(schema.targets.weekStart))
  fs.writeFileSync(path.join(outDir, 'targets.json'), JSON.stringify(tg))
  console.log(`targets: ${tg.length} rows`)

  // Risks & Opps
  const ro = await db.select().from(schema.risksAndOpps).orderBy(asc(schema.risksAndOpps.id))
  fs.writeFileSync(path.join(outDir, 'risks-and-opps.json'), JSON.stringify(ro))
  console.log(`risks-and-opps: ${ro.length} rows`)

  console.log('\nDone! Files written to src/data/')
  process.exit(0)
}

exportData().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

**Step 2: Run the export**

```bash
npx tsx scripts/export-data.ts
```

Expected: JSON files created in `src/data/`, sales.json is the largest (~3-5MB).

**Step 3: Verify the files exist and look correct**

```bash
ls -lh src/data/
head -c 200 src/data/products.json
wc -c src/data/sales.json
```

---

### Task 2: Rewrite queries.ts for Static JSON

**Files:**
- Modify: `src/lib/queries.ts` (complete rewrite)

**Step 1: Rewrite the entire queries.ts file**

Replace all Drizzle ORM imports and SQL queries with imports from `src/data/*.json` and in-memory array operations. All 17 exported functions keep their exact same signatures and return types.

Key changes:
- Import JSON data files at module level (Node.js caches these)
- Build lookup maps (storeId → region, storeId → format) once at module level
- Replace SQL aggregations with `Array.filter().reduce()` patterns
- Replace `date_trunc('week', ...)` with a JS `getMonday()` helper
- Add `getDataDateRange()` export that returns `{ minDate, maxDate }` from the sales data

The store lookup is needed because several queries join sales with stores to get region/format info.

**Important implementation details:**
- `getWeeklySales` and `getWeeklyStoresScanning` need a JS ISO week start calculation
- `getStoresStocking` needs date overlap logic: `startDate <= asOfDate AND (endDate IS NULL OR endDate >= asOfDate)`
- `getProductsSummary` is the most complex — needs sales aggregation, distribution counting, and ROS calculation per product
- `getStoreScanningDetail` needs per-store aggregation within a region
- All decimal/revenue values from JSON come as strings — parse them with `Number()`
- `getRisksAndOpps` return type includes `createdAt` as a Date — construct `new Date()` from the JSON string

---

### Task 3: Make Risks Page Read-Only

**Files:**
- Delete: `src/app/risks/actions.ts`
- Modify: `src/app/risks/risks-client.tsx` — remove Add button, edit/delete buttons, form modal, and `deleteRiskOrOpp` import
- Delete reference: `src/components/risk-form.tsx` (no longer needed, but keep file — just remove import from risks-client)

**Step 1: Simplify risks-client.tsx**

Remove:
- Import of `deleteRiskOrOpp` from `./actions`
- Import of `RiskForm` from `@/components/risk-form`
- `Plus`, `Pencil`, `Trash2` from lucide imports
- All `useState` for `formOpen`, `editingItem`
- `useTransition` and `isPending`
- `handleAdd`, `handleEdit`, `handleDelete`, `handleClose` functions
- The "Add" button in the header
- The "Actions" column header and edit/delete buttons in each row
- The `{formOpen && <RiskForm .../>}` section at the bottom

Keep:
- Filter toggles (status, type, product)
- Table display (minus the Actions column)
- URL-based filtering logic

**Step 2: Delete the server actions file**

```bash
rm src/app/risks/actions.ts
```

**Step 3: Optionally delete risk-form.tsx**

```bash
rm src/components/risk-form.tsx
```

---

### Task 4: Fix Date References for Static Demo

**Files:**
- Modify: `src/lib/filters.ts` — change defaults to use data date range
- Modify: `src/app/page.tsx` — use data date range instead of `new Date()`

**Step 1: Update filter defaults**

In `src/lib/filters.ts`, import `getDataDateRange` from `@/lib/queries` and use the data's max date as the reference point instead of `new Date()`. The default period should be the last 28 days of available data.

```typescript
import { getDataDateRange } from '@/lib/queries'

export function parseFilters(...) {
  const { maxDate } = getDataDateRange()
  // Use maxDate instead of new Date() for defaults
  // startDate default: maxDate - 28 days
  // endDate default: maxDate
}
```

**Step 2: Update overview page**

In `src/app/page.tsx`, replace `const today = new Date()` with a reference date derived from the data's max date. All the week calculations (thisMonday, lastMonday, etc.) should be relative to this reference date.

```typescript
import { getDataDateRange } from '@/lib/queries'

export default async function OverviewPage() {
  const { maxDate } = getDataDateRange()
  const today = new Date(maxDate + 'T00:00:00')
  // ... rest stays the same
}
```

---

### Task 5: Remove DB Dependencies from Build

**Files:**
- Modify: `package.json` — no changes needed (postgres/drizzle stay as devDeps for local dev)
- Verify: no `src/app/` or `src/components/` file imports from `@/db`

**Step 1: Verify no production code imports @/db**

After tasks 2-3, grep to confirm:

```bash
grep -r "from '@/db'" src/app/ src/components/ src/lib/
```

Expected: zero matches (queries.ts no longer imports from @/db).

**Step 2: Test the build without DATABASE_URL**

```bash
unset DATABASE_URL && pnpm build
```

Expected: build succeeds with no DB errors. If it fails, check for lingering @/db imports.

---

### Task 6: Initialize Git & Push to GitHub

**Step 1: Ensure .gitignore covers data appropriately**

The JSON data files SHOULD be committed (they're the app's data). Verify `.gitignore` doesn't exclude `src/data/`.

**Step 2: Check for any .env files or secrets**

```bash
ls -la .env* 2>/dev/null
```

Ensure no `.env.local` or similar gets committed.

**Step 3: Create GitHub repo and push**

```bash
gh repo create conker-dash --public --source=. --remote=origin --push
```

This creates the repo under `ollie-cg` (the active GitHub account), sets it as origin, and pushes all committed code.

---

### Task 7: Deploy to Vercel

**Step 1: Link to Vercel and deploy**

```bash
vercel --yes
```

Or for production:

```bash
vercel --prod
```

Since the app is now frontend-only, no environment variables are needed.

**Step 2: Verify the deployment**

Visit the Vercel URL and check:
- Overview page loads with KPI cards and sparklines
- Sales page shows chart and regional breakdown
- Performance page shows actual vs forecast vs target
- Distribution page shows stocking vs scanning
- ROS page shows rate of sale trends
- Products page shows product summary table
- Risks page shows read-only list (no Add/Edit/Delete buttons)

**Step 3: Optionally connect to GitHub for auto-deploy**

If not already connected via `gh repo create`, link in Vercel dashboard or:

```bash
vercel link
```

Then configure Vercel to auto-deploy from the GitHub repo's main branch.
