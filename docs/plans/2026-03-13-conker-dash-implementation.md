# Conker Dash Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working internal FMCG dashboard with 6 pages, seeded with realistic fake data, queryable from Postgres via Drizzle ORM.

**Architecture:** Next.js App Router with React Server Components querying Postgres directly (no API layer). Drizzle ORM for schema and queries. Tailwind CSS for styling. Recharts for data visualisation. URL search params for filter state.

**Tech Stack:** Next.js 14, React 18, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS 3, Recharts 2, Lucide React (icons), pnpm

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `drizzle.config.ts`, `.env.local`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialise Next.js project**

```bash
cd /Users/ollie/projects/conker/conker_dash
pnpm create next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Accept defaults. If it asks about Turbopack, say yes.

**Step 2: Install dependencies**

```bash
pnpm add drizzle-orm postgres recharts lucide-react
pnpm add -D drizzle-kit @types/node
```

- `drizzle-orm` + `postgres` — ORM and Postgres driver (using postgres.js, same as Haggleton pattern)
- `recharts` — charting library (already used in Haggleton web app)
- `lucide-react` — icon library (already used in Haggleton)
- `drizzle-kit` — migrations CLI

**Step 3: Create drizzle.config.ts**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is not set')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
})
```

**Step 4: Create .env.local**

```
DATABASE_URL=postgresql://ollie@localhost:5432/conker_dash
```

**Step 5: Create the database**

```bash
createdb conker_dash
```

**Step 6: Verify dev server starts**

```bash
pnpm dev
```

Visit http://localhost:3000 — should see default Next.js page.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Drizzle and Tailwind"
```

---

### Task 2: Database Schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`

**Step 1: Write schema**

```ts
// src/db/schema.ts
import {
  pgTable,
  serial,
  bigserial,
  text,
  integer,
  decimal,
  date,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ean: text('ean'),
  packSize: text('pack_size'),
  rrp: decimal('rrp', { precision: 10, scale: 2 }),
})

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  format: text('format').notNull(),
})

export const distribution = pgTable(
  'distribution',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
  },
  (table) => ({
    productStoreUq: unique('distribution_product_store_uq').on(
      table.productId,
      table.storeId,
    ),
  }),
)

export const sales = pgTable(
  'sales',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id),
    date: date('date').notNull(),
    units: integer('units').notNull(),
    revenue: decimal('revenue', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    productStoreDateIdx: index('sales_product_store_date_idx').on(
      table.productId,
      table.storeId,
      table.date,
    ),
    dateIdx: index('sales_date_idx').on(table.date),
  }),
)

export const forecasts = pgTable(
  'forecasts',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    weekStart: date('week_start').notNull(),
    units: integer('units').notNull(),
    revenue: decimal('revenue', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    productWeekUq: unique('forecasts_product_week_uq').on(
      table.productId,
      table.weekStart,
    ),
  }),
)

export const targets = pgTable(
  'targets',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    weekStart: date('week_start').notNull(),
    units: integer('units').notNull(),
    revenue: decimal('revenue', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    productWeekUq: unique('targets_product_week_uq').on(
      table.productId,
      table.weekStart,
    ),
  }),
)

export const risksAndOpps = pgTable('risks_and_opps', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id),
  type: text('type').notNull(), // 'risk' or 'opportunity'
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'), // 'open' or 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**Step 2: Write DB connection**

```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

**Step 3: Generate and run migration**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**Step 4: Verify tables exist**

```bash
psql conker_dash -c "\dt"
```

Should show: products, stores, distribution, sales, forecasts, targets, risks_and_opps.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add database schema and migrations"
```

---

### Task 3: Seed Script

**Files:**
- Create: `src/db/seed.ts`
- Modify: `package.json` (add seed script)

**Step 1: Write seed script**

Create `src/db/seed.ts`. The script should:

1. **Clear all tables** (in reverse FK order: sales, distribution, forecasts, targets, risks_and_opps, stores, products)
2. **Insert 5 products:**
   - Product A — "Daily Moisturiser 50ml" — RRP £8.99 — core SKU
   - Product B — "Night Cream 50ml" — RRP £12.99 — strong performer
   - Product C — "Cleansing Gel 150ml" — RRP £6.99 — steady
   - Product D — "Eye Serum 15ml" — RRP £14.99 — declining (delist risk)
   - Product E — "SPF Day Cream 50ml" — RRP £10.99 — growing (opportunity)

3. **Insert ~500 stores** across these regions with realistic distribution:
   - London (80 stores), South East (70), South West (50), Midlands (65), North West (60), North East (45), Yorkshire (50), Scotland (45), Wales (25), East Anglia (30)
   - Format mix: ~60% high_street, ~25% retail_park, ~15% travel
   - Store names like "Boots {Town} {Format}" — use realistic UK town names per region

4. **Insert distribution records:**
   - Product A: ~400 stores (core, widest distribution)
   - Product B: ~300 stores
   - Product C: ~250 stores
   - Product D: ~200 stores (narrower, being reviewed)
   - Product E: ~180 stores (newer, growing)
   - All start_date = 90 days ago, end_date = null

5. **Insert 90 days of daily sales:**
   - For each product, for each store in its distribution, generate daily sales
   - Not every store scans every day — use a probability per day (~70% chance a store scans on weekdays, ~50% weekends)
   - Base units per scan: varies by product and format (high street: 1-3 units, retail park: 2-5 units, travel: 1-2 units)
   - Revenue = units * (RRP with slight random discount 0-10%)
   - Regional multiplier: London/SE = 1.2x, North/Scotland = 0.85x, others = 1.0x
   - Product D: apply a declining trend (-1% per week over the 90 days)
   - Product E: apply a growing trend (+2% per week over the 90 days)
   - Weekday volume ~30% higher than weekend

6. **Insert weekly forecasts and targets:**
   - For each of the ~13 weeks in the 90-day window
   - Forecast = roughly 90% of what actual sales will be (conservative)
   - Target = roughly 110% of what actual sales will be (ambitious)
   - Product D: forecast and target set before decline was known (so actuals fall short)
   - Product E: forecast set conservatively (so actuals exceed)

7. **Insert 5 risks_and_opps:**
   - Risk: "Product D ROS declining in North region" — open
   - Risk: "Product D below delist threshold in travel stores" — open
   - Opportunity: "Product E outperforming in London — potential for extra facings" — open
   - Opportunity: "Product B strong in retail parks — expand distribution" — open
   - Risk: "Product C flat — needs promotional support in Q2" — closed

**Step 2: Add seed script to package.json**

```json
"scripts": {
  "seed": "npx tsx src/db/seed.ts"
}
```

**Step 3: Run seed**

```bash
pnpm seed
```

**Step 4: Verify data**

```bash
psql conker_dash -c "SELECT count(*) FROM products"        -- expect 5
psql conker_dash -c "SELECT count(*) FROM stores"           -- expect ~500
psql conker_dash -c "SELECT count(*) FROM distribution"     -- expect ~1330
psql conker_dash -c "SELECT count(*) FROM sales LIMIT 1"    -- expect rows
psql conker_dash -c "SELECT count(*) FROM forecasts"        -- expect ~65 (5 products * 13 weeks)
psql conker_dash -c "SELECT count(*) FROM risks_and_opps"   -- expect 5
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add seed script with realistic FMCG data"
```

---

### Task 4: Layout, Navigation, and Shared Components

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/nav.tsx`
- Create: `src/components/kpi-card.tsx`
- Create: `src/app/sales/page.tsx` (placeholder)
- Create: `src/app/distribution/page.tsx` (placeholder)
- Create: `src/app/ros/page.tsx` (placeholder)
- Create: `src/app/performance/page.tsx` (placeholder)
- Create: `src/app/risks/page.tsx` (placeholder)

**Step 1: Build sidebar nav component**

```tsx
// src/components/nav.tsx
"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Store,
  Gauge,
  Target,
  AlertTriangle,
} from 'lucide-react'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales', icon: TrendingUp },
  { href: '/distribution', label: 'Distribution', icon: Store },
  { href: '/ros', label: 'Rate of Sale', icon: Gauge },
  { href: '/performance', label: 'vs Plan', icon: Target },
  { href: '/risks', label: 'Risks & Opps', icon: AlertTriangle },
]
```

Render a vertical sidebar with active state highlighting based on `usePathname()`. Dark background (slate-900), white text, active item highlighted with a subtle background colour.

**Step 2: Update layout.tsx**

Replace default layout with a sidebar + main content area:
- Sidebar fixed width (~240px) on the left
- Main content area takes remaining width with padding
- Include the `Nav` component in the sidebar
- Title "Conker Dash" at the top of the sidebar

**Step 3: Set up globals.css**

Keep Tailwind directives. Set `body` to have a light grey background (slate-50). Remove any default Next.js styles.

**Step 4: Create placeholder pages**

Create `page.tsx` in each route directory (`/sales`, `/distribution`, `/ros`, `/performance`, `/risks`) with just a heading for now, e.g.:

```tsx
export default function SalesPage() {
  return <h1 className="text-2xl font-bold">Sales</h1>
}
```

**Step 5: Verify navigation works**

```bash
pnpm dev
```

Click through all 6 nav links. Each should show its heading. Sidebar should highlight the active page.

**Step 6: Build KPI card component**

```tsx
// src/components/kpi-card.tsx
interface KpiCardProps {
  title: string
  value: string
  change?: string          // e.g. "+5.2%"
  changeType?: 'positive' | 'negative' | 'neutral'
}
```

White card with subtle shadow, title in muted text, value large and bold, change indicator with green/red/grey colouring.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add layout with sidebar navigation and shared components"
```

---

### Task 5: Shared Query Functions and Utilities

**Files:**
- Create: `src/lib/queries.ts`
- Create: `src/lib/utils.ts`

**Step 1: Write utility functions**

```ts
// src/lib/utils.ts

/** Format number as GBP currency */
export function formatCurrency(value: number): string

/** Format number with commas */
export function formatNumber(value: number): string

/** Format percentage with 1 decimal */
export function formatPercent(value: number): string

/** Get Monday of the week for a given date */
export function getWeekStart(date: Date): Date

/** Calculate percentage change */
export function percentChange(current: number, previous: number): number
```

**Step 2: Write query functions**

```ts
// src/lib/queries.ts
import { db } from '@/db'
import { sql, eq, and, gte, lte, count, sum, countDistinct } from 'drizzle-orm'
import * as schema from '@/db/schema'
```

Key query functions needed (implement these — exact SQL via Drizzle):

- `getProducts()` — all products
- `getRegions()` — distinct regions from stores
- `getSalesForPeriod(productIds, startDate, endDate)` — aggregated sales (total units, revenue)
- `getSalesByDay(productIds, startDate, endDate)` — daily time series
- `getSalesByRegion(productIds, startDate, endDate)` — grouped by region
- `getStoresStocking(productIds, asOfDate)` — count of stores in distribution
- `getStoresScanning(productIds, startDate, endDate)` — count of stores with at least one sale
- `getRos(productIds, startDate, endDate)` — ROS calculation (revenue / stores / weeks)
- `getForecasts(productIds, startDate, endDate)` — forecast data
- `getTargets(productIds, startDate, endDate)` — target data
- `getRisksAndOpps(filters)` — with status/type/product filters

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shared query functions and utilities"
```

---

### Task 6: Overview Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/charts/sparkline.tsx`

**Step 1: Build the overview page**

This is a Server Component that calls query functions directly.

Layout:
- Row of KPI cards (6-7 cards in a responsive grid)
- Below: 12-week sparklines for key metrics

KPI cards to show:
1. **Sales This Week** (£ value) — with WoW % change
2. **Units This Week** — with WoW % change
3. **Stores Stocking** — total count
4. **Stores Scanning** — total count this week, with % of stocking
5. **ROS/Store/Week** — based on stocking denominator
6. **vs Forecast** — % achievement this week
7. **vs Target** — % achievement this week
8. **Open Risks & Opps** — count, split (e.g. "2 risks, 2 opps")

**Step 2: Build sparkline component**

Small Recharts `<LineChart>` with no axes, no labels — just the line. Used inside KPI cards to show 12-week trend.

```tsx
// src/components/charts/sparkline.tsx
"use client"
import { LineChart, Line, ResponsiveContainer } from 'recharts'
```

**Step 3: Wire up queries to KPI cards**

The page fetches:
- This week's sales (Mon-Sun containing today)
- Last week's sales (for WoW comparison)
- Stores stocking count
- Stores scanning count (this week)
- Weekly sales for last 12 weeks (for sparklines)
- This week's forecast and target
- Open risks & opps count

**Step 4: Verify page renders with seeded data**

```bash
pnpm dev
```

Visit http://localhost:3000 — should see KPI cards with real numbers from seed data.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: build overview page with KPI cards and sparklines"
```

---

### Task 7: Filters Component

**Files:**
- Create: `src/components/filters.tsx`

**Step 1: Build filter bar**

A client component that renders:
- **Date range picker** — presets: "Last 7 days", "Last 4 weeks", "Last 13 weeks", "Last 26 weeks", plus custom start/end
- **SKU selector** — multi-select checkboxes for products (fetched from DB, passed as props)
- **Region selector** — multi-select checkboxes for regions

All filter state stored in URL search params via `useRouter` and `useSearchParams`.

**Step 2: Create a helper to parse filters from search params**

```ts
// src/lib/filters.ts
export function parseFilters(searchParams: Record<string, string | string[] | undefined>): {
  startDate: string
  endDate: string
  productIds: number[]
  regions: string[]
}
```

Default: last 4 weeks, all products, all regions.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add URL-based filter bar component"
```

---

### Task 8: Sales Deep Dive Page

**Files:**
- Modify: `src/app/sales/page.tsx`
- Create: `src/components/charts/sales-chart.tsx`
- Create: `src/components/tables/sales-table.tsx`

**Step 1: Build sales time-series chart**

Client component using Recharts `<AreaChart>` or `<BarChart>`:
- X-axis: date (daily or weekly — toggle button)
- Y-axis: value (£) or volume (units) — toggle button
- One series per product (colour coded) or total

**Step 2: Build regional breakdown**

Either a stacked bar chart or a table showing: region, total units, total revenue, % of total.

**Step 3: Build sortable data table**

A table component showing the detail: date, product, region, units, revenue. Sortable by any column. Use the existing sales query functions.

**Step 4: Wire up the page**

Server Component that:
1. Parses filters from search params
2. Fetches data via query functions
3. Renders filter bar, chart toggle, chart, regional breakdown, and detail table

**Step 5: Verify with seeded data**

Charts should show realistic patterns — weekday/weekend variation, Product D declining, Product E growing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build sales deep dive page with charts and tables"
```

---

### Task 9: Distribution & Scanning Page

**Files:**
- Modify: `src/app/distribution/page.tsx`
- Create: `src/components/charts/distribution-chart.tsx`
- Create: `src/components/tables/distribution-table.tsx`

**Step 1: Build stocking vs scanning line chart**

Recharts `<LineChart>` with two lines:
- Stores stocking (from distribution table — relatively flat)
- Stores scanning (from sales table — shows who actually sold)
- X-axis: week
- The gap between the lines is the "problem" — stores that should be selling but aren't

**Step 2: Build regional breakdown table**

Columns: Region, Stores Stocking, Stores Scanning, % Scanning, Gap.
Sortable. Highlight rows where % scanning is below a threshold (e.g. <50%).

**Step 3: Build store-level drill-down**

When clicking a region in the table, expand or navigate to show individual stores in that region:
- Store name, format, last scan date, total units in period

Implement as an expandable row or a filtered sub-table.

**Step 4: Wire up the page**

Server Component with filters. Queries: `getStoresStocking`, `getStoresScanning`, plus a weekly version for the chart.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: build distribution and scanning page"
```

---

### Task 10: Rate of Sale Page

**Files:**
- Modify: `src/app/ros/page.tsx`
- Create: `src/components/charts/ros-chart.tsx`
- Create: `src/components/tables/ros-table.tsx`

**Step 1: Build ROS trend chart**

Recharts `<LineChart>`:
- X-axis: week
- Y-axis: ROS (£/store/week)
- Two series: ROS based on stores stocking, ROS based on stores scanning
- Split by SKU (one chart per product or selectable)

**Step 2: Build ROS regional comparison table**

Columns: Region, ROS (stocking basis), ROS (scanning basis), Stores Stocking, Stores Scanning.
Sorted by ROS descending. Highlight best/worst performers.

**Step 3: Wire up the page**

ROS calculation: `total revenue in period / number of stores / number of weeks in period`

Two denominators:
- Stocking ROS: denominator = stores in distribution list
- Scanning ROS: denominator = stores that actually scanned

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: build rate of sale page"
```

---

### Task 11: Performance vs Plan Page

**Files:**
- Modify: `src/app/performance/page.tsx`
- Create: `src/components/charts/performance-chart.tsx`
- Create: `src/components/tables/variance-table.tsx`

**Step 1: Build overlaid time-series chart**

Recharts `<ComposedChart>`:
- Actual sales as solid bars
- Forecast as a dashed line
- Target as a dotted line
- X-axis: week
- Y-axis: value (£) or volume (units) — toggle
- Weekly/monthly toggle (monthly = aggregate weeks into calendar months)

**Step 2: Build variance table**

Columns: Week, Actual (£), Forecast (£), vs Forecast (£), vs Forecast (%), Target (£), vs Target (£), vs Target (%).

Colour code: green if beating forecast/target, red if behind. Show totals row at bottom.

**Step 3: Wire up the page**

Server Component. Join actual weekly sales with forecast and target tables. Calculate variances.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: build performance vs plan page"
```

---

### Task 12: Risks & Opportunities Page

**Files:**
- Modify: `src/app/risks/page.tsx`
- Create: `src/app/risks/actions.ts` (Server Actions for CRUD)
- Create: `src/components/risk-form.tsx`

**Step 1: Build the list view**

Server Component showing a filterable table/list:
- Columns: Type (risk/opp icon), Title, Product, Status, Created, Updated
- Filters: type (risk/opp/all), status (open/closed/all), product
- Sort by created date descending

**Step 2: Build the form component**

Client component for add/edit:
- Fields: type (radio: risk/opportunity), product (dropdown, optional), title (text), description (textarea), status (radio: open/closed)
- Shown in a modal or slide-over panel

**Step 3: Write Server Actions**

```ts
// src/app/risks/actions.ts
"use server"

export async function createRiskOrOpp(formData: FormData)
export async function updateRiskOrOpp(id: number, formData: FormData)
export async function deleteRiskOrOpp(id: number)
```

Each action mutates the DB and calls `revalidatePath('/risks')`.

**Step 4: Wire up add/edit/delete**

- "Add" button opens the form in create mode
- Clicking an existing item opens it in edit mode
- Delete button with confirmation

**Step 5: Verify CRUD works**

Create a new risk, edit it, close it, delete it. Verify changes persist on page refresh.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build risks and opportunities page with CRUD"
```

---

### Task 13: Polish and Final Verification

**Files:**
- Various — minor tweaks across pages

**Step 1: Verify all pages render without errors**

Visit each page in sequence:
- `/` — KPI cards show data, sparklines render
- `/sales` — charts show time series, tables populate
- `/distribution` — stocking vs scanning chart, regional table
- `/ros` — ROS trends, regional comparison
- `/performance` — forecast/target overlay, variance table
- `/risks` — list renders, CRUD works

**Step 2: Check responsive behaviour**

Resize browser. Ensure:
- Sidebar collapses or scrolls gracefully on narrow screens
- Charts resize via `<ResponsiveContainer>`
- Tables scroll horizontally if needed

**Step 3: Fix any console errors or warnings**

Check browser console for React warnings, missing keys, hydration mismatches.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: polish UI and resolve warnings"
```

---

## Summary

| Task | What | Depends On |
|------|------|------------|
| 1 | Project scaffolding | — |
| 2 | Database schema | 1 |
| 3 | Seed script | 2 |
| 4 | Layout, nav, shared components | 1 |
| 5 | Query functions & utilities | 2 |
| 6 | Overview page | 3, 4, 5 |
| 7 | Filters component | 4 |
| 8 | Sales page | 6, 7 |
| 9 | Distribution page | 6, 7 |
| 10 | ROS page | 6, 7 |
| 11 | Performance page | 6, 7 |
| 12 | Risks & opps page | 4, 5 |
| 13 | Polish & verification | 6-12 |

Tasks 1-5 are sequential. Tasks 8-12 can be built in parallel after 6 and 7 are done.
