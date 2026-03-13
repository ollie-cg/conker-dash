# Conker Dash — Design Document

## Overview

Internal dashboard for tracking performance of a single FMCG brand (health & beauty) sold through Boots UK. Built for a small commercial team who need daily visibility into sales, distribution, rate of sale, and performance against plan.

The brand has a handful of SKUs (1-10). Data source is Boots EPOS (faked for MVP, real later). No authentication required for now.

## Tech Stack

- **Next.js** (App Router) — React Server Components for data-heavy pages
- **PostgreSQL** — local instance, Drizzle ORM
- **Tailwind CSS** — data-dense, utility-first styling
- **Recharts or Tremor** — charting (time-series, bar charts, sparklines)
- **pnpm** — package manager (consistent with Haggleton)

No deployment target for now. Local dev only (`pnpm dev`).

## Data Model

### products

| Column    | Type    | Notes                        |
|-----------|---------|------------------------------|
| id        | serial  | PK                           |
| name      | text    | e.g. "Product A"             |
| ean       | text    | Barcode, nullable for now    |
| pack_size | text    | e.g. "200ml"                 |
| rrp       | decimal | Recommended retail price (£) |

Small table: 1-10 rows.

### stores

| Column  | Type   | Notes                                          |
|---------|--------|-------------------------------------------------|
| id      | serial | PK                                              |
| code    | text   | Boots store ID                                  |
| name    | text   | Store name                                      |
| region  | text   | e.g. "North", "South East", "Midlands"          |
| format  | text   | "high_street", "retail_park", "travel"           |

Seeded with ~500 stores (subset of ~2,500 real Boots stores).

### distribution

| Column     | Type    | Notes                                    |
|------------|---------|------------------------------------------|
| id         | serial  | PK                                       |
| product_id | integer | FK -> products                           |
| store_id   | integer | FK -> stores                             |
| start_date | date    | When the store started stocking          |
| end_date   | date    | Nullable — null means still stocking     |

Defines which stores *should* stock each product. This is the denominator for ROS calculations and the basis for "stores stocking" vs "stores scanning" metrics.

### sales

| Column     | Type    | Notes                          |
|------------|---------|--------------------------------|
| id         | bigserial | PK                           |
| product_id | integer | FK -> products                 |
| store_id   | integer | FK -> stores                   |
| date       | date    | Sale date                      |
| units      | integer | Units sold                     |
| revenue    | decimal | Revenue in £                   |

One row per product, per store, per day. Core table — everything else derives from it. Indexed on (product_id, store_id, date).

### forecasts

| Column     | Type    | Notes                          |
|------------|---------|--------------------------------|
| id         | serial  | PK                             |
| product_id | integer | FK -> products                 |
| week_start | date    | Monday of the forecast week    |
| units      | integer | Forecast units                 |
| revenue    | decimal | Forecast revenue (£)           |

Weekly granularity. Source: spreadsheet upload or external system (faked for MVP).

### targets

| Column     | Type    | Notes                          |
|------------|---------|--------------------------------|
| id         | serial  | PK                             |
| product_id | integer | FK -> products                 |
| week_start | date    | Monday of the target week      |
| units      | integer | Target units                   |
| revenue    | decimal | Target revenue (£)             |

Same shape as forecasts. Separate table because forecast != target.

### risks_and_opps

| Column     | Type      | Notes                                |
|------------|-----------|--------------------------------------|
| id         | serial    | PK                                   |
| product_id | integer   | FK -> products, nullable (can be brand-level) |
| type       | text      | "risk" or "opportunity"              |
| title      | text      | Short summary                        |
| description| text      | Detail                               |
| status     | text      | "open" or "closed"                   |
| created_at | timestamp | Auto-set                             |
| updated_at | timestamp | Auto-updated                         |

Manual log. Simple CRUD.

## Dashboard Pages

### 1. Overview (Home — `/`)

Top-line KPIs in cards:
- Total sales this week (value & volume), WoW change
- Stores stocking count
- Stores scanning count
- Overall ROS/store/week
- Performance vs forecast (% achievement)
- Performance vs target (% achievement)
- Open risks & opps count

12-week sparkline trends for key metrics.

### 2. Sales Deep Dive (`/sales`)

- Time-series chart: daily/weekly sales (value & volume), toggleable
- Breakdown by region and store format (stacked bar or table)
- Filterable by SKU, region, date range
- Sortable detail table underneath

### 3. Distribution & Scanning (`/distribution`)

- Stores stocking vs stores scanning over time (line chart — the gap is the problem)
- Regional breakdown table: stores expected, stores scanned, % scanning
- Drill into a region to see individual store-level scanning

### 4. Rate of Sale (`/ros`)

- ROS per store per week, two versions:
  - Based on stores stocking (denominator = distribution list)
  - Based on stores scanning (denominator = stores that actually sold)
- Trend over time, split by SKU
- Regional comparison table

### 5. Performance vs Plan (`/performance`)

- Forecast vs actual, target vs actual — overlaid time-series
- Weekly/monthly toggle
- Variance table: absolute (£ / units) and percentage

### 6. Risks & Opportunities (`/risks`)

- Filterable list/table (open/closed, risk/opp, by product)
- Add/edit via inline form or modal
- No automation — just a manual log

## Shared UI Patterns

- **Sidebar navigation** — persistent, lists all 6 pages
- **Filter bar** — date range picker, SKU multi-select, region multi-select. State stored in URL search params (bookmarkable, shareable).
- **KPI cards** — reusable component: metric name, value, trend indicator, optional sparkline
- **Data tables** — sortable columns, consistent styling

## Seed Data

Seed script generates realistic fake data:

- **5 products** — generic names (Product A-E), varied distribution
- **~500 stores** — across 8-10 UK regions, mix of formats (high street ~60%, retail park ~25%, travel ~15%)
- **Distribution** — core SKU in ~400 stores, niche SKUs in 150-250
- **90 days of daily sales** — realistic patterns:
  - Weekday/weekend variation
  - 60-70% of stocked stores scan in a given week
  - Regional variation (London/SE higher volume)
  - One SKU trending down (delist risk), one trending up (opportunity)
- **Forecasts & targets** — weekly, covering the same 90 days. Forecast conservative, target ambitious. Most SKUs land between; one under, one over.
- **4-5 risks & opps** — pre-seeded examples

## Project Structure

```
conker_dash/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Overview dashboard
│   │   ├── sales/page.tsx
│   │   ├── distribution/page.tsx
│   │   ├── ros/page.tsx
│   │   ├── performance/page.tsx
│   │   ├── risks/page.tsx
│   │   └── layout.tsx            # Sidebar nav + shell
│   ├── components/
│   │   ├── charts/
│   │   ├── tables/
│   │   ├── kpi-card.tsx
│   │   ├── filters.tsx
│   │   └── nav.tsx
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   ├── index.ts              # DB connection
│   │   └── seed.ts
│   └── lib/
│       ├── queries.ts            # Shared DB queries
│       └── utils.ts              # Formatters, ROS calc etc.
├── drizzle.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Key Decisions

- **No API routes** — Server Components query the DB directly. Simpler architecture. API routes added later if needed (e.g. spreadsheet upload).
- **No auth** — internal tool, local dev. Added later.
- **No Haggleton integration yet** — placeholder in the design. When ready, the dashboard calls Haggleton's existing REST API for competitor pricing data.
- **URL-based filter state** — all filters stored in search params for bookmarkability.
- **Single queries.ts** — with ~6 pages and a small schema, one file is more navigable than per-page query files.
- **Drizzle ORM** — consistent with Haggleton project.

## Future Considerations (not in MVP)

- Authentication (likely simple email/password or magic link)
- Real EPOS data import pipeline
- Spreadsheet upload for forecasts/targets
- Haggleton API integration for competitor pricing
- Automated risk/opportunity detection rules
- Multi-retailer support
- Deployment (Vercel or similar)
