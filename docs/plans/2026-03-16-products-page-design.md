# Products Page Design

## Overview

A new Products page that serves as a product reference with live performance stats. Each product (aka SKU) is displayed in a table row with its static info and aggregated sales/distribution metrics.

## Page Details

- **Route:** `/products`
- **Nav item:** "Products" with `Package` icon, placed between "Overview" and "Sales"
- **Filters:** Reuses existing Filters component with date range and regions (no product filter)
- **Default date range:** Last 4 weeks

## Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Product Name | `products.name` | Default sort column |
| EAN | `products.ean` | Barcode |
| Pack Size | `products.packSize` | e.g. "50ml" |
| RRP | `products.rrp` | Formatted as currency |
| Revenue | `SUM(sales.revenue)` | Filtered by date/region |
| Units | `SUM(sales.units)` | Filtered by date/region |
| Stores Stocking | `COUNT(DISTINCT distribution.storeId)` | Active distribution records in period |
| Stores Scanning | `COUNT(DISTINCT sales.storeId)` | Stores with sales in period |
| ROS | Revenue / scanning stores / weeks | Revenue per store per week |

## Query

Single new query `getProductsSummary(from, to, regions)` in `queries.ts`:

- Left join products to sales so zero-sale products still appear
- Count distinct stores in distribution where `startDate <= to` and (`endDate IS NULL` or `endDate >= from`) for stocking
- Count distinct stores in sales within the date range for scanning
- Calculate ROS as total revenue / scanning stores / number of weeks
- Group by product
- Filter by regions if provided (via stores.region)

## Files Changed

| File | Change |
|------|--------|
| `src/app/products/page.tsx` | New: products page with table |
| `src/lib/queries.ts` | Modify: add `getProductsSummary()` |
| `src/components/nav.tsx` | Modify: add Products nav link |

## Constraints

- No schema changes required
- No new components required
- Follows existing table patterns (Tailwind, same styling as sales-table/distribution-table)
- Server component pattern matching other pages
