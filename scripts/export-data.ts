// scripts/export-data.ts — Export all DB tables to JSON files in src/data/
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'
import {
  products,
  stores,
  distribution,
  sales,
  forecasts,
  targets,
  risksAndOpps,
} from '../src/db/schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Check your .env.local file.')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client)

const outDir = path.resolve(__dirname, '..', 'src', 'data')

async function exportData() {
  const t0 = Date.now()

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true })

  // Products
  const productsData = await db.select().from(products)
  fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(productsData))
  console.log(`products: ${productsData.length} rows`)

  // Stores
  const storesData = await db.select().from(stores)
  fs.writeFileSync(path.join(outDir, 'stores.json'), JSON.stringify(storesData))
  console.log(`stores: ${storesData.length} rows`)

  // Distribution
  const distributionData = await db.select().from(distribution)
  fs.writeFileSync(path.join(outDir, 'distribution.json'), JSON.stringify(distributionData))
  console.log(`distribution: ${distributionData.length} rows`)

  // Sales — select only productId, storeId, date, units, revenue (skip id)
  const salesData = await db
    .select({
      productId: sales.productId,
      storeId: sales.storeId,
      date: sales.date,
      units: sales.units,
      revenue: sales.revenue,
    })
    .from(sales)
  fs.writeFileSync(path.join(outDir, 'sales.json'), JSON.stringify(salesData))
  console.log(`sales: ${salesData.length} rows`)

  // Forecasts
  const forecastsData = await db.select().from(forecasts)
  fs.writeFileSync(path.join(outDir, 'forecasts.json'), JSON.stringify(forecastsData))
  console.log(`forecasts: ${forecastsData.length} rows`)

  // Targets
  const targetsData = await db.select().from(targets)
  fs.writeFileSync(path.join(outDir, 'targets.json'), JSON.stringify(targetsData))
  console.log(`targets: ${targetsData.length} rows`)

  // Risks and Opps
  const risksAndOppsData = await db.select().from(risksAndOpps)
  fs.writeFileSync(path.join(outDir, 'risks-and-opps.json'), JSON.stringify(risksAndOppsData))
  console.log(`risks-and-opps: ${risksAndOppsData.length} rows`)

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\nExport complete in ${elapsed}s`)
  console.log(`Files written to ${outDir}`)
}

exportData()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Export failed:', err)
    process.exit(1)
  })
