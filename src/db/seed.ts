// src/db/seed.ts — Seed script for Conker Dash FMCG EPOS demo data
import dotenv from 'dotenv'
// Next.js uses .env.local — load that first, then fall back to .env
dotenv.config({ path: '.env.local' })
dotenv.config() // .env as fallback (won't overwrite already-set vars)
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
// sql import removed — not used in seed script
import {
  products,
  stores,
  distribution,
  sales,
  forecasts,
  targets,
  risksAndOpps,
} from './schema'

// ---------------------------------------------------------------------------
// 0. DB connection (standalone — not sharing the app connection)
// ---------------------------------------------------------------------------
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Check your .env.local file.')
  process.exit(1)
}
const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/** Monday of the ISO week containing d */
function weekStart(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  r.setDate(r.getDate() + diff)
  return r
}

// ---------------------------------------------------------------------------
// 1. Product definitions
// ---------------------------------------------------------------------------
const PRODUCTS = [
  { name: 'Daily Moisturiser 50ml', ean: '5000001000001', packSize: '50ml', rrp: '8.99' },
  { name: 'Night Cream 50ml', ean: '5000001000002', packSize: '50ml', rrp: '12.99' },
  { name: 'Cleansing Gel 150ml', ean: '5000001000003', packSize: '150ml', rrp: '6.99' },
  { name: 'Eye Serum 15ml', ean: '5000001000004', packSize: '15ml', rrp: '14.99' },
  { name: 'SPF Day Cream 50ml', ean: '5000001000005', packSize: '50ml', rrp: '10.99' },
]

// Distribution target counts per product (A..E)
const DIST_TARGETS = [400, 300, 250, 200, 180]

// ---------------------------------------------------------------------------
// 2. Store definitions — realistic UK town names per region
// ---------------------------------------------------------------------------
interface RegionDef {
  region: string
  prefix: string
  count: number
  towns: string[]
}

const REGIONS: RegionDef[] = [
  {
    region: 'London',
    prefix: 'LON',
    count: 80,
    towns: [
      'Oxford Street', 'Covent Garden', 'Kings Cross', 'Canary Wharf',
      'Stratford', 'Camden', 'Brixton', 'Ealing', 'Croydon', 'Islington',
      'Hammersmith', 'Kensington', 'Chelsea', 'Greenwich', 'Wimbledon',
      'Clapham', 'Shoreditch', 'Hackney', 'Lewisham', 'Fulham',
      'Paddington', 'Victoria', 'Waterloo', 'Liverpool Street', 'Bank',
      'Angel', 'Dalston', 'Tottenham', 'Barking', 'Ilford',
      'Romford', 'Uxbridge', 'Enfield', 'Wood Green', 'Brent Cross',
      'Putney', 'Richmond', 'Kingston', 'Sutton', 'Tooting',
      'Balham', 'Streatham', 'Peckham', 'Bermondsey', 'Walthamstow',
      'Finsbury Park', 'Muswell Hill', 'Crouch End', 'Holloway', 'Highbury',
      'Bethnal Green', 'Mile End', 'Bow', 'Poplar', 'Woolwich',
      'Eltham', 'Catford', 'Forest Hill', 'Sydenham', 'Norwood',
      'Chiswick', 'Acton', 'Shepherd\'s Bush', 'Notting Hill', 'Maida Vale',
      'St John\'s Wood', 'Marylebone', 'Bloomsbury', 'Holborn', 'Farringdon',
      'Clerkenwell', 'Moorgate', 'Aldgate', 'Whitechapel', 'Stepney',
      'Pimlico', 'Battersea', 'Vauxhall', 'Stockwell', 'Elephant & Castle',
    ],
  },
  {
    region: 'South East',
    prefix: 'SE',
    count: 70,
    towns: [
      'Brighton', 'Guildford', 'Maidstone', 'Canterbury', 'Reading',
      'Oxford', 'Southampton', 'Portsmouth', 'Crawley', 'Tunbridge Wells',
      'Basingstoke', 'Milton Keynes', 'Slough', 'Woking', 'Chelmsford',
      'Colchester', 'Southend', 'Ashford', 'Folkestone', 'Dover',
      'Hastings', 'Eastbourne', 'Worthing', 'Chichester', 'Winchester',
      'Aylesbury', 'High Wycombe', 'Marlow', 'Henley', 'Maidenhead',
      'Windsor', 'Bracknell', 'Camberley', 'Farnham', 'Aldershot',
      'Farnborough', 'Fleet', 'Andover', 'Newbury', 'Didcot',
      'Abingdon', 'Banbury', 'Bicester', 'Witney', 'Thame',
      'Sevenoaks', 'Dartford', 'Gravesend', 'Chatham', 'Rochester',
      'Gillingham', 'Sittingbourne', 'Faversham', 'Whitstable', 'Herne Bay',
      'Ramsgate', 'Margate', 'Deal', 'Sandwich', 'Tenterden',
      'Cranbrook', 'Paddock Wood', 'Tonbridge', 'Redhill', 'Reigate',
      'Epsom', 'Leatherhead', 'Dorking', 'Horsham', 'Haywards Heath',
    ],
  },
  {
    region: 'South West',
    prefix: 'SW',
    count: 50,
    towns: [
      'Bristol', 'Bath', 'Exeter', 'Plymouth', 'Bournemouth',
      'Poole', 'Swindon', 'Gloucester', 'Cheltenham', 'Taunton',
      'Yeovil', 'Salisbury', 'Dorchester', 'Weymouth', 'Truro',
      'Penzance', 'Falmouth', 'Newquay', 'St Ives', 'Barnstaple',
      'Torquay', 'Paignton', 'Newton Abbot', 'Tiverton', 'Bridgwater',
      'Weston-super-Mare', 'Chippenham', 'Trowbridge', 'Frome', 'Wells',
      'Glastonbury', 'Street', 'Chard', 'Lyme Regis', 'Blandford Forum',
      'Sherborne', 'Shaftesbury', 'Warminster', 'Devizes', 'Marlborough',
      'Cirencester', 'Stroud', 'Dursley', 'Thornbury', 'Keynsham',
      'Clevedon', 'Portishead', 'Nailsea', 'Yate', 'Corsham',
    ],
  },
  {
    region: 'Midlands',
    prefix: 'MID',
    count: 65,
    towns: [
      'Birmingham', 'Coventry', 'Wolverhampton', 'Nottingham', 'Leicester',
      'Derby', 'Stoke-on-Trent', 'Solihull', 'Walsall', 'Dudley',
      'Telford', 'Shrewsbury', 'Worcester', 'Hereford', 'Stafford',
      'Burton upon Trent', 'Tamworth', 'Lichfield', 'Cannock', 'Rugeley',
      'Nuneaton', 'Bedworth', 'Rugby', 'Stratford-upon-Avon', 'Warwick',
      'Leamington Spa', 'Kenilworth', 'Redditch', 'Bromsgrove', 'Kidderminster',
      'Loughborough', 'Hinckley', 'Melton Mowbray', 'Market Harborough', 'Corby',
      'Kettering', 'Wellingborough', 'Northampton', 'Daventry', 'Towcester',
      'Lincoln', 'Grantham', 'Sleaford', 'Boston', 'Spalding',
      'Skegness', 'Gainsborough', 'Retford', 'Worksop', 'Mansfield',
      'Newark', 'Long Eaton', 'Ilkeston', 'Ripley', 'Belper',
      'Matlock', 'Ashbourne', 'Uttoxeter', 'Stone', 'Newcastle-under-Lyme',
      'Leek', 'Congleton', 'Crewe', 'Nantwich', 'Oswestry',
    ],
  },
  {
    region: 'North West',
    prefix: 'NW',
    count: 60,
    towns: [
      'Manchester', 'Liverpool', 'Chester', 'Preston', 'Blackpool',
      'Bolton', 'Wigan', 'Warrington', 'Stockport', 'Oldham',
      'Rochdale', 'Bury', 'Burnley', 'Blackburn', 'Lancaster',
      'Carlisle', 'Penrith', 'Kendal', 'Windermere', 'Barrow-in-Furness',
      'Morecambe', 'Fleetwood', 'Chorley', 'Leyland', 'Skelmersdale',
      'Southport', 'Formby', 'Crosby', 'Birkenhead', 'Wallasey',
      'Ellesmere Port', 'Northwich', 'Middlewich', 'Macclesfield', 'Wilmslow',
      'Altrincham', 'Sale', 'Stretford', 'Eccles', 'Salford',
      'Ashton-under-Lyne', 'Hyde', 'Stalybridge', 'Glossop', 'Buxton',
      'Chapel-en-le-Frith', 'Whaley Bridge', 'Poynton', 'Knutsford', 'Lymm',
      'Runcorn', 'Widnes', 'St Helens', 'Newton-le-Willows', 'Leigh',
      'Tyldesley', 'Atherton', 'Horwich', 'Farnworth', 'Radcliffe',
    ],
  },
  {
    region: 'North East',
    prefix: 'NE',
    count: 45,
    towns: [
      'Newcastle', 'Sunderland', 'Durham', 'Middlesbrough', 'Darlington',
      'Hartlepool', 'Stockton', 'Redcar', 'Gateshead', 'South Shields',
      'Whitley Bay', 'Tynemouth', 'Blyth', 'Cramlington', 'Ashington',
      'Morpeth', 'Alnwick', 'Hexham', 'Consett', 'Bishop Auckland',
      'Newton Aycliffe', 'Spennymoor', 'Seaham', 'Peterlee', 'Houghton-le-Spring',
      'Washington', 'Chester-le-Street', 'Stanley', 'Prudhoe', 'Ponteland',
      'Bedlington', 'Amble', 'Berwick-upon-Tweed', 'Wooler', 'Rothbury',
      'Haltwhistle', 'Corbridge', 'Yarm', 'Guisborough', 'Saltburn',
      'Thornaby', 'Billingham', 'Eaglescliffe', 'Sedgefield', 'Ferryhill',
    ],
  },
  {
    region: 'Yorkshire',
    prefix: 'YRK',
    count: 50,
    towns: [
      'Leeds', 'Sheffield', 'Bradford', 'York', 'Hull',
      'Huddersfield', 'Wakefield', 'Doncaster', 'Rotherham', 'Barnsley',
      'Halifax', 'Dewsbury', 'Batley', 'Keighley', 'Skipton',
      'Harrogate', 'Ripon', 'Scarborough', 'Whitby', 'Bridlington',
      'Beverley', 'Goole', 'Selby', 'Wetherby', 'Ilkley',
      'Otley', 'Pudsey', 'Morley', 'Castleford', 'Pontefract',
      'Normanton', 'Ossett', 'Todmorden', 'Hebden Bridge', 'Sowerby Bridge',
      'Elland', 'Brighouse', 'Cleckheaton', 'Bingley', 'Shipley',
      'Mexborough', 'Wath-upon-Dearne', 'Penistone', 'Stocksbridge', 'Chapeltown',
      'Thorne', 'Driffield', 'Hornsea', 'Malton', 'Pickering',
    ],
  },
  {
    region: 'Scotland',
    prefix: 'SCO',
    count: 45,
    towns: [
      'Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness',
      'Stirling', 'Perth', 'St Andrews', 'Dunfermline', 'Falkirk',
      'Livingston', 'Paisley', 'East Kilbride', 'Hamilton', 'Motherwell',
      'Ayr', 'Kilmarnock', 'Dumfries', 'Greenock', 'Clydebank',
      'Kirkcaldy', 'Glenrothes', 'Alloa', 'Bridge of Allan', 'Callander',
      'Pitlochry', 'Fort William', 'Oban', 'Elgin', 'Nairn',
      'Peterhead', 'Fraserburgh', 'Arbroath', 'Montrose', 'Forfar',
      'Brechin', 'Musselburgh', 'Dalkeith', 'Penicuik', 'Bathgate',
      'Linlithgow', 'Bo\'ness', 'Kelso', 'Hawick', 'Galashiels',
    ],
  },
  {
    region: 'Wales',
    prefix: 'WAL',
    count: 25,
    towns: [
      'Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Bangor',
      'Aberystwyth', 'Carmarthen', 'Llandudno', 'Rhyl', 'Colwyn Bay',
      'Caernarfon', 'Pwllheli', 'Brecon', 'Merthyr Tydfil', 'Pontypridd',
      'Barry', 'Bridgend', 'Port Talbot', 'Neath', 'Llanelli',
      'Haverfordwest', 'Pembroke', 'Tenby', 'Monmouth', 'Abergavenny',
    ],
  },
  {
    region: 'East Anglia',
    prefix: 'EA',
    count: 30,
    towns: [
      'Norwich', 'Cambridge', 'Ipswich', 'Peterborough', 'King\'s Lynn',
      'Great Yarmouth', 'Lowestoft', 'Bury St Edmunds', 'Newmarket', 'Thetford',
      'Dereham', 'Fakenham', 'Cromer', 'Sheringham', 'Wells-next-the-Sea',
      'Ely', 'March', 'Wisbech', 'Huntingdon', 'St Neots',
      'St Ives', 'Downham Market', 'Swaffham', 'Attleborough', 'Wymondham',
      'Diss', 'Stowmarket', 'Sudbury', 'Hadleigh', 'Felixstowe',
    ],
  },
]

// Regions whose stores should always be in every product's distribution
const GUARANTEED_REGIONS = ['London', 'South East']

// Regional sales multipliers
const REGION_MULTIPLIER: Record<string, number> = {
  'London': 1.3,
  'South East': 1.15,
  'North East': 0.85,
  'Scotland': 0.85,
}

// Format-based unit ranges
const FORMAT_UNITS: Record<string, [number, number]> = {
  high_street: [1, 3],
  retail_park: [2, 5],
  travel: [1, 2],
}

// ---------------------------------------------------------------------------
// 3. Main seed logic
// ---------------------------------------------------------------------------
async function seed() {
  const t0 = Date.now()

  // ---- 3a. Clear tables in reverse FK order ----
  console.log('Clearing existing data...')
  await db.delete(sales)
  await db.delete(distribution)
  await db.delete(forecasts)
  await db.delete(targets)
  await db.delete(risksAndOpps)
  await db.delete(stores)
  await db.delete(products)
  console.log('  All tables cleared.')

  // ---- 3b. Insert products ----
  console.log('Inserting products...')
  const insertedProducts = await db
    .insert(products)
    .values(PRODUCTS)
    .returning({ id: products.id, name: products.name, rrp: products.rrp })
  console.log(`  Inserted ${insertedProducts.length} products.`)

  // Map product index (A..E) -> id
  const productIds = insertedProducts.map((p) => p.id)
  const productRrps = insertedProducts.map((p) => parseFloat(p.rrp!))

  // ---- 3c. Generate and insert stores ----
  console.log('Generating stores...')
  type StoreRow = {
    code: string
    name: string
    region: string
    format: string
  }
  const storeRows: StoreRow[] = []

  for (const rdef of REGIONS) {
    const towns = [...rdef.towns]
    for (let i = 0; i < rdef.count; i++) {
      const townName = towns[i % towns.length]
      const num = String(i + 1).padStart(3, '0')
      const code = `BOO-${rdef.prefix}-${num}`

      // Decide format: ~60% high_street, ~25% retail_park, ~15% travel
      const roll = Math.random()
      let format: string
      let suffix = ''
      if (roll < 0.60) {
        format = 'high_street'
      } else if (roll < 0.85) {
        format = 'retail_park'
        suffix = ' Retail Park'
      } else {
        format = 'travel'
        suffix = ` ${['Station', 'Airport', 'Services'][randomInt(0, 2)]}`
      }

      const name = `Boots ${townName}${suffix}`
      storeRows.push({ code, name, region: rdef.region, format })
    }
  }

  // Batch insert stores
  const STORE_BATCH = 200
  const insertedStores: { id: number; code: string; region: string; format: string }[] = []
  for (let i = 0; i < storeRows.length; i += STORE_BATCH) {
    const batch = storeRows.slice(i, i + STORE_BATCH)
    const rows = await db
      .insert(stores)
      .values(batch)
      .returning({ id: stores.id, code: stores.code, region: stores.region, format: stores.format })
    insertedStores.push(...rows)
  }
  console.log(`  Inserted ${insertedStores.length} stores.`)

  // Partition stores by region
  const storesByRegion: Record<string, typeof insertedStores> = {}
  for (const s of insertedStores) {
    ;(storesByRegion[s.region] ??= []).push(s)
  }

  // ---- 3d. Build distribution lists ----
  console.log('Building distribution lists...')
  const guaranteedStores = insertedStores.filter((s) =>
    GUARANTEED_REGIONS.includes(s.region),
  )
  const nonGuaranteedStores = insertedStores.filter(
    (s) => !GUARANTEED_REGIONS.includes(s.region),
  )

  const today = new Date()
  const startDate90 = addDays(today, -90)
  const startDateStr = formatDate(startDate90)

  type DistRow = { productId: number; storeId: number; startDate: string }
  const distRows: DistRow[] = []
  // For each product, build the store list: guaranteed + random from rest
  const productStoreMap: Map<number, Set<number>> = new Map()

  for (let pi = 0; pi < productIds.length; pi++) {
    const target = DIST_TARGETS[pi]
    const pid = productIds[pi]
    const storeSet = new Set<number>()

    // Add all guaranteed (London + SE) stores first — if target allows
    const guaranteedSlice = guaranteedStores.slice(0, Math.min(guaranteedStores.length, target))
    for (const s of guaranteedSlice) storeSet.add(s.id)

    // Fill remaining from non-guaranteed
    const remaining = target - storeSet.size
    if (remaining > 0) {
      const extras = pickRandom(nonGuaranteedStores, remaining)
      for (const s of extras) storeSet.add(s.id)
    }

    productStoreMap.set(pid, storeSet)
    for (const sid of storeSet) {
      distRows.push({ productId: pid, storeId: sid, startDate: startDateStr })
    }
  }

  // Batch insert distribution
  const DIST_BATCH = 1000
  let distCount = 0
  for (let i = 0; i < distRows.length; i += DIST_BATCH) {
    const batch = distRows.slice(i, i + DIST_BATCH)
    await db.insert(distribution).values(batch)
    distCount += batch.length
  }
  console.log(`  Inserted ${distCount} distribution records.`)

  // ---- 3e. Generate 90 days of daily sales ----
  console.log('Generating sales data (this may take a moment)...')

  // Build a lookup: storeId -> { region, format }
  const storeLookup: Map<number, { region: string; format: string }> = new Map()
  for (const s of insertedStores) {
    storeLookup.set(s.id, { region: s.region, format: s.format })
  }

  // We'll accumulate weekly actual totals for forecasts/targets later
  // key: `${productId}-${weekStartStr}` -> { units, revenue }
  const weeklyActuals: Map<string, { units: number; revenue: number }> = new Map()

  type SaleRow = {
    productId: number
    storeId: number
    date: string
    units: number
    revenue: string
  }

  let totalSalesInserted = 0
  const SALES_BATCH = 5000

  // Process product by product to keep memory manageable
  for (let pi = 0; pi < productIds.length; pi++) {
    const pid = productIds[pi]
    const rrp = productRrps[pi]
    const storeSet = productStoreMap.get(pid)!
    const storeIds = Array.from(storeSet)
    let salesBuffer: SaleRow[] = []

    console.log(`  Product ${pi + 1}/5 (${PRODUCTS[pi].name}): ${storeIds.length} stores...`)

    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const d = addDays(startDate90, dayOffset)
      const dateStr = formatDate(d)
      const weekend = isWeekend(d)
      const weekNum = Math.floor(dayOffset / 7)
      const ws = weekStart(d)
      const wsStr = formatDate(ws)

      for (const sid of storeIds) {
        // Chance of scanning
        const scanChance = weekend ? 0.50 : 0.70
        if (Math.random() > scanChance) continue

        const info = storeLookup.get(sid)!
        const [minU, maxU] = FORMAT_UNITS[info.format]
        let units = randomInt(minU, maxU)

        // Weekend is ~30% lower than weekday (i.e., weekday ~30% higher)
        if (weekend) {
          units = Math.max(1, Math.round(units * 0.77))
        }

        // Regional multiplier
        const regMult = REGION_MULTIPLIER[info.region] ?? 1.0

        // Product trend multiplier
        let trendMult = 1.0
        if (pi === 3) {
          // Product D: declining ~1% per week
          trendMult = 1 - 0.01 * weekNum
        } else if (pi === 4) {
          // Product E: growing ~2% per week
          trendMult = 1 + 0.02 * weekNum
        }

        units = Math.max(1, Math.round(units * regMult * trendMult))

        // Revenue = units * RRP * slight discount (0.90..1.00)
        const discountFactor = randomFloat(0.90, 1.00)
        const revenue = parseFloat((units * rrp * discountFactor).toFixed(2))

        salesBuffer.push({
          productId: pid,
          storeId: sid,
          date: dateStr,
          units,
          revenue: revenue.toFixed(2),
        })

        // Accumulate weekly actuals
        const wKey = `${pid}-${wsStr}`
        const existing = weeklyActuals.get(wKey)
        if (existing) {
          existing.units += units
          existing.revenue += revenue
        } else {
          weeklyActuals.set(wKey, { units, revenue })
        }

        // Flush buffer
        if (salesBuffer.length >= SALES_BATCH) {
          await db.insert(sales).values(salesBuffer)
          totalSalesInserted += salesBuffer.length
          salesBuffer = []
        }
      }
    }

    // Flush remaining
    if (salesBuffer.length > 0) {
      await db.insert(sales).values(salesBuffer)
      totalSalesInserted += salesBuffer.length
      salesBuffer = []
    }

    console.log(`    ...done. Running total: ${totalSalesInserted.toLocaleString()} sales rows.`)
  }

  console.log(`  Total sales inserted: ${totalSalesInserted.toLocaleString()}`)

  // ---- 3f. Insert weekly forecasts and targets ----
  console.log('Inserting forecasts and targets...')

  type ForecastRow = { productId: number; weekStart: string; units: number; revenue: string }
  type TargetRow = { productId: number; weekStart: string; units: number; revenue: string }
  const forecastRows: ForecastRow[] = []
  const targetRows: TargetRow[] = []

  for (let pi = 0; pi < productIds.length; pi++) {
    const pid = productIds[pi]

    // Collect all week keys for this product, sorted
    const weekKeys = Array.from(weeklyActuals.keys())
      .filter((k) => k.startsWith(`${pid}-`))
      .sort()

    for (const wKey of weekKeys) {
      const actual = weeklyActuals.get(wKey)!
      const wsStr = wKey.split('-').slice(1).join('-') // extract date part

      let forecastMultiplier: number
      let targetMultiplier: number

      if (pi === 3) {
        // Product D — forecast was set before decline, so overestimates
        forecastMultiplier = 1.10
        targetMultiplier = 1.20
      } else if (pi === 4) {
        // Product E — conservative forecast, actuals exceed
        forecastMultiplier = 0.70
        targetMultiplier = 0.90
      } else {
        // Normal: forecast ~90% of actual, target ~110%
        forecastMultiplier = 0.90
        targetMultiplier = 1.10
      }

      forecastRows.push({
        productId: pid,
        weekStart: wsStr,
        units: Math.round(actual.units * forecastMultiplier),
        revenue: (actual.revenue * forecastMultiplier).toFixed(2),
      })

      targetRows.push({
        productId: pid,
        weekStart: wsStr,
        units: Math.round(actual.units * targetMultiplier),
        revenue: (actual.revenue * targetMultiplier).toFixed(2),
      })
    }
  }

  if (forecastRows.length > 0) {
    await db.insert(forecasts).values(forecastRows)
  }
  if (targetRows.length > 0) {
    await db.insert(targets).values(targetRows)
  }
  console.log(`  Inserted ${forecastRows.length} forecasts and ${targetRows.length} targets.`)

  // ---- 3g. Insert risks and opportunities ----
  console.log('Inserting risks and opportunities...')
  await db.insert(risksAndOpps).values([
    {
      type: 'risk',
      title: 'Product D ROS declining in North region',
      description:
        'Rate of sale for Eye Serum has dropped 15% over the last 6 weeks in North East and Yorkshire stores. Below minimum threshold for continued stocking.',
      status: 'open',
      productId: productIds[3],
    },
    {
      type: 'risk',
      title: 'Product D below delist threshold in travel stores',
      description:
        'Eye Serum scanning in only 35% of travel format stores. Buyer has flagged for review at next range meeting.',
      status: 'open',
      productId: productIds[3],
    },
    {
      type: 'opportunity',
      title: 'Product E outperforming in London',
      description:
        'SPF Day Cream ROS in London stores is 2.3x the national average. Strong case for additional facings and potential end-cap placement.',
      status: 'open',
      productId: productIds[4],
    },
    {
      type: 'opportunity',
      title: 'Product B strong in retail parks',
      description:
        'Night Cream performing exceptionally in retail park format with 40% higher ROS than high street. Opportunity to expand distribution to remaining retail park stores.',
      status: 'open',
      productId: productIds[1],
    },
    {
      type: 'risk',
      title: 'Product C flat — needs promotional support in Q2',
      description:
        'Cleansing Gel sales have been flat for 8 weeks. Without promotional support, risk of losing shelf space to competitor NPD.',
      status: 'closed',
      productId: productIds[2],
    },
  ])
  console.log('  Inserted 5 risks/opportunities.')

  // ---- 3h. Summary ----
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('')
  console.log('=== Seed complete ===')
  console.log(`  Products:      ${insertedProducts.length}`)
  console.log(`  Stores:        ${insertedStores.length}`)
  console.log(`  Distribution:  ${distCount}`)
  console.log(`  Sales:         ${totalSalesInserted.toLocaleString()}`)
  console.log(`  Forecasts:     ${forecastRows.length}`)
  console.log(`  Targets:       ${targetRows.length}`)
  console.log(`  Risks/Opps:    5`)
  console.log(`  Time:          ${elapsed}s`)
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
seed()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
