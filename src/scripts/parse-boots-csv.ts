/**
 * parse-boots-csv.ts
 *
 * Parses a Boots sales CSV export and outputs three JSON files:
 *   - src/data/boots-products.json
 *   - src/data/boots-stores.json
 *   - src/data/boots-sales.json
 *
 * Usage:
 *   npx tsx src/scripts/parse-boots-csv.ts <path-to-csv>
 *
 * CSV structure:
 *   Row 0: Report title (ignored)
 *   Row 1: "Calendar:DD/MM/YYYY" — date extracted as YYYY-MM-DD
 *   Row 2: Repeated "Total Sales Amount" / "Total Sales Volume Units" headers (ignored)
 *   Row 3: SKU column headers. First cell "Store", then N SKU names (revenue), then same N SKUs (units)
 *   Row 4+: Store data rows. First cell "CODE - StoreName", then N revenue values, then N unit values.
 */

import * as fs from 'fs'
import * as path from 'path'

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

interface BootsSale {
  productId: number
  storeId: number
  date: string
  units: number
  revenue: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ONLINE_STORE_CODES = new Set(['4910', '4915'])

/**
 * Parse a simple CSV line. This CSV uses comma separators with no quoting,
 * so a simple split is sufficient.
 */
function parseCsvLine(line: string): string[] {
  return line.split(',')
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD.
 */
function parseDate(raw: string): string {
  const [dd, mm, yyyy] = raw.split('/')
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // 1. Read CSV path from args
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx src/scripts/parse-boots-csv.ts <path-to-csv>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(csvPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`Parsing: ${resolvedPath}`)

  const raw = fs.readFileSync(resolvedPath, 'utf-8')
  const lines = raw.split('\n').filter((l) => l.trim().length > 0)

  // 2. Parse date from row 1 (index 1)
  const dateRow = parseCsvLine(lines[1])
  const dateRaw = dateRow[0] // e.g. "Calendar:20/01/2026"
  const dateMatch = dateRaw.match(/Calendar:(\d{2}\/\d{2}\/\d{4})/)
  if (!dateMatch) {
    console.error(`Could not parse date from row 2: "${dateRaw}"`)
    process.exit(1)
  }
  const date = parseDate(dateMatch[1])
  console.log(`Date: ${date}`)

  // 3. Parse SKU headers from row 3 (index 3)
  const headerRow = parseCsvLine(lines[3])
  const totalColumns = headerRow.length
  const skuCount = (totalColumns - 1) / 2

  if (!Number.isInteger(skuCount) || skuCount < 1) {
    console.error(
      `Unexpected column count ${totalColumns}. Expected odd number (1 + 2*N).`
    )
    process.exit(1)
  }

  console.log(`SKU count: ${skuCount}`)
  console.log(`Total columns: ${totalColumns}`)

  // 4. Build products array
  const products: BootsProduct[] = []
  for (let i = 0; i < skuCount; i++) {
    const skuHeader = headerRow[1 + i].trim()
    const dashIdx = skuHeader.indexOf(' - ')
    const bootsCode = dashIdx >= 0 ? skuHeader.substring(0, dashIdx).trim() : ''
    products.push({
      id: i + 1,
      bootsCode,
      name: skuHeader,
    })
  }

  // 5. Build stores array and sales array
  const stores: BootsStore[] = []
  const sales: BootsSale[] = []
  const dataStartRow = 4 // index 4

  for (let rowIdx = dataStartRow; rowIdx < lines.length; rowIdx++) {
    const row = parseCsvLine(lines[rowIdx])
    const storeCell = row[0].trim()

    if (!storeCell) continue // skip empty rows

    const storeDashIdx = storeCell.indexOf(' - ')
    const storeCode =
      storeDashIdx >= 0 ? storeCell.substring(0, storeDashIdx).trim() : storeCell
    const storeName = storeDashIdx >= 0 ? storeCell.substring(storeDashIdx + 3).trim() : storeCell

    const storeId = stores.length + 1
    const format = ONLINE_STORE_CODES.has(storeCode) ? 'online' : 'boots'

    stores.push({
      id: storeId,
      code: storeCode,
      name: storeName,
      format,
    })

    // Extract revenue and unit values for each SKU
    for (let skuIdx = 0; skuIdx < skuCount; skuIdx++) {
      const revenueCol = 1 + skuIdx
      const unitsCol = 1 + skuCount + skuIdx

      const revenueRaw = (row[revenueCol] || '').trim()
      const unitsRaw = (row[unitsCol] || '').trim()

      // Skip empty cells (no sale recorded)
      if (revenueRaw === '' && unitsRaw === '') continue

      const revenue = revenueRaw === '' ? 0 : parseFloat(revenueRaw)
      const units = unitsRaw === '' ? 0 : parseFloat(unitsRaw)

      // Skip rows where both revenue and units are 0
      if (revenue === 0 && units === 0) continue

      sales.push({
        productId: skuIdx + 1,
        storeId,
        date,
        units,
        revenue: revenue.toFixed(2),
      })
    }
  }

  // 6. Write output files
  const outDir = path.resolve(__dirname, '..', 'data')
  fs.mkdirSync(outDir, { recursive: true })

  const productsPath = path.join(outDir, 'boots-products.json')
  const storesPath = path.join(outDir, 'boots-stores.json')
  const salesPath = path.join(outDir, 'boots-sales.json')

  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2))
  fs.writeFileSync(storesPath, JSON.stringify(stores, null, 2))
  fs.writeFileSync(salesPath, JSON.stringify(sales, null, 2))

  // 7. Print summary
  console.log(`\nOutput written to ${outDir}`)
  console.log(`  boots-products.json: ${products.length} products`)
  console.log(`  boots-stores.json:   ${stores.length} stores`)
  console.log(`  boots-sales.json:    ${sales.length} sale records`)
}

main()
