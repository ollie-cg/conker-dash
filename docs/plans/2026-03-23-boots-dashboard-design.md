# Boots Dashboard Design

## Overview

A dedicated Boots section in the conker_dash sidebar with three sub-pages, driven entirely by the daily Boots retail report (units + revenue by store by SKU).

## Navigation

New sidebar section below the existing general dashboard links:

```
── Boots ──────
Boots Overview    /boots
Boots Products    /boots/products
Boots Stores      /boots/stores
```

Icon: ShoppingBag (Lucide). Section separated with a divider and "Boots" label.

All three pages reuse the existing date filter bar (presets: 7d, 4w, 13w, 26w + custom range). Product and region multi-selects are hidden since this is retailer-specific.

---

## Page 1: Boots Overview (`/boots`)

### KPI Cards (3x2 grid)

| KPI | Calculation | Change |
|-----|-------------|--------|
| Revenue | SUM(revenue) for period | WoW % |
| Units | SUM(units) for period | WoW % |
| Stores Scanning | COUNT(DISTINCT store_id) WHERE units > 0 | "X of Y" total |
| Rate of Sale | Revenue / scanning stores / weeks in period | WoW % |
| Avg Selling Price | Revenue / Units | WoW % |
| Online Share | Online revenue / total revenue * 100 | WoW pp change |

Online stores = store codes 4910 (Boots.com UK) and 4915 (Boots.com ROI).

### Weekly Trend Chart

- Area chart (matching existing Sales page pattern)
- X-axis: week ending date
- Y-axis: revenue (GBP) or units
- Toggle button to switch metric
- Uses Recharts ResponsiveContainer, 350px height

### Channel Split Table

| Channel | Revenue | Units | % of Total |
|---------|---------|-------|------------|
| In-Store | - | - | - |
| Boots.com UK | - | - | - |
| Boots.com ROI | - | - | - |

---

## Page 2: Boots Products (`/boots/products`)

### Top/Bottom SKU Bar Chart

- Horizontal bar chart showing all SKUs sorted by revenue
- Colour-coded by product category:
  - Haircare (shampoo, conditioner, scalp scrub, treatment mask) - blue
  - Styling (hairspray, mousse, pomade, dry shampoo, blow dry spray, gel, texture spray) - emerald
  - Fragrance (Hair & Skin fragrances, testers) - purple
  - Gifts/Sets (discovery set, duos, baubles, bundles) - amber
  - Minis (60ml, 10ml travel sizes) - slate
  - Other (oil, serum, primer, moisture cream, cleansing fluid, leave-in conditioner) - sky
- Scrollable if needed for all 51 SKUs

### SKU Performance Table

Sortable by any column. Default sort: Revenue descending.

| Column | Description |
|--------|-------------|
| SKU | Boots code + short product name |
| Category | Derived category tag (colour chip) |
| Revenue | GBP total for period |
| Units | Total units for period |
| Stores Scanning | Count of stores that sold this SKU |
| ROS | Revenue per scanning store per week |
| ASP | Revenue / units |

---

## Page 3: Boots Stores (`/boots/stores`)

### Store Performance Table

Sortable by any column. Default sort: Revenue descending. Online stores flagged with a badge.

| Column | Description |
|--------|-------------|
| Store | Code + name (e.g. "0885 - London St Pancras Stn") |
| Revenue | GBP total for period |
| Units | Total units for period |
| SKUs Scanned | Count of distinct SKUs sold |
| ROS | Revenue per week for this store |
| ASP | Revenue / units |

### SKU x Store Heatmap

- Rows = stores, sorted by revenue (highest at top)
- Columns = SKUs, grouped by product category (using category colours as column header background)
- Cell colour = intensity based on revenue (white = no sales, light to dark blue = low to high)
- Tooltip on hover: store name, SKU name, revenue, units
- Category filter chips above heatmap (Haircare, Styling, Fragrance, Gifts, Minis, Other) to toggle column groups
- Stores with zero sales in period hidden by default
- Horizontally scrollable for full range view

---

## Data Flow

### CSV Import

The Boots CSV is a wide matrix:
- Row 1: report title
- Row 2: calendar date
- Row 3: "Total Sales Amount" repeated (revenue columns) then "Total Sales Volume Units" repeated (unit columns)
- Row 4: SKU names as column headers (Boots code + product name), duplicated for revenue and units halves
- Row 5+: one row per store, with store code + name in column 1

Parse script:
1. Read rows 4+ to extract SKU list from headers (first half = revenue SKUs, second half = unit SKUs)
2. For each store row, pair revenue and unit values per SKU
3. Skip empty cells (no sale)
4. Map to existing schema tables

### Schema Mapping (no changes needed)

- `products` table: one row per Boots SKU (name = Boots code + product name)
- `stores` table: one row per Boots store (code = Boots store number, format = "high_street" / "retail_park" / "online")
- `sales` table: one row per store/product/date combination with units and revenue

Store format values:
- "online" for stores 4910 and 4915
- "boots" for all physical stores (can refine format later)

Store region: derived from store name geography (city/town).

### Derived Metrics (query time, no new tables)

- ROS = SUM(revenue) / COUNT(DISTINCT store_id WHERE units > 0) / weeks
- ASP = SUM(revenue) / SUM(units)
- Online Share = SUM(revenue WHERE store is online) / SUM(revenue) * 100
- Stores Scanning = COUNT(DISTINCT store_id WHERE units > 0)
- SKUs Scanned = COUNT(DISTINCT product_id WHERE units > 0)

### Category Mapping

Static lookup in code from SKU name keywords to category. The Boots SKU naming is consistent:

```typescript
function getCategory(skuName: string): string {
  const lower = skuName.toLowerCase()
  if (lower.includes('shampoo') && !lower.includes('dry shampoo')) return 'Haircare'
  if (lower.includes('conditioner') && !lower.includes('leave in')) return 'Haircare'
  if (lower.includes('scalp scrub') || lower.includes('crown')) return 'Haircare'
  if (lower.includes('treatment mask') || lower.includes('future youth') || lower.includes('futureyouth')) return 'Haircare'
  if (lower.includes('hairspray') || lower.includes('veil') || lower.includes('mastery')) return 'Styling'
  if (lower.includes('mousse') || lower.includes('body hybrid')) return 'Styling'
  if (lower.includes('pomade') || lower.includes('scene setter') || lower.includes('scnsetr')) return 'Styling'
  if (lower.includes('dry shamp')) return 'Styling'
  if (lower.includes('blow dry') || lower.includes('new form')) return 'Styling'
  if (lower.includes('gel') || lower.includes('headliner')) return 'Styling'
  if (lower.includes('texture') || lower.includes('movement')) return 'Styling'
  if (lower.includes('edp') || lower.includes('frag') || lower.includes('floral') || lower.includes('woods') || lower.includes('bloom') || lower.includes('elsie') || lower.includes('elise') || lower.includes('brightside')) return 'Fragrance'
  if (lower.includes('set') || lower.includes('bundle') || lower.includes('duo') || lower.includes('bauble') || lower.includes('gift') || lower.includes('collection') || lower.includes('cllctn')) return 'Gifts'
  if (lower.includes('60ml') || lower.includes('10ml')) return 'Minis'
  return 'Other'
}
```

---

## Implementation Notes

- New query functions needed in `lib/queries.ts` for Boots-specific aggregations (channel split, per-SKU metrics, per-store metrics, heatmap data)
- The heatmap is the most complex component - build as a custom HTML table/grid with Tailwind background colour classes rather than a Recharts chart
- Reuse existing components: KpiCard, Filters (with hidden product/region selectors), MetricToggle
- New components needed: BootsHeatmap, BootsSkuChart (horizontal bar), BootsStoreTable, BootsSkuTable, BootsChannelTable
