/**
 * generate-fake-data.ts
 *
 * Generates 26 weeks (~6 months) of fake Boots sales data and writes to
 * src/data/boots-sales.json. Reads existing products and stores from their
 * JSON files — doesn't touch those.
 *
 * Usage:
 *   npx tsx src/scripts/generate-fake-data.ts
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: number;
  bootsCode: string;
  name: string;
}

interface Store {
  id: number;
  code: string;
  name: string;
  format: string;
}

interface Sale {
  productId: number;
  storeId: number;
  date: string;
  units: number;
  revenue: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WEEKS = 26;
// End date: most recent Monday before "now" in the data world (Jan 2026)
const END_DATE = new Date("2026-01-19"); // Monday

// Per-product unit prices (derived from real data, with sensible defaults)
const PRODUCT_PRICES: Record<number, number> = {
  1: 13.3, // co-cleanser
  2: 13.0, // shampoo 250
  3: 13.0, // conditioner 250
  4: 15.0, // Crown scalp scrub 180
  5: 15.0, // FutureYouth mask 180
  6: 15.0, // Good Habit oil 50
  7: 11.2, // Root-ine serum 50
  8: 14.0, // Prologue primer 200
  9: 11.0, // ScnSetr pomade 50
  10: 14.0, // New Form spray 200
  11: 14.0, // Mastery hairspray 250
  12: 14.0, // headliner gel 180
  13: 14.0, // Reset dry shampoo 200
  14: 14.0, // Body mousse 200
  15: 14.0, // Veil hairspray 250
  16: 5.0, // shampoo 60ml mini
  17: 5.0, // conditioner 60ml mini
  18: 3.0, // Good Habit oil 10ml mini
  19: 5.0, // Prologue primer 60ml mini
  20: 5.0, // FutureYouth mask 60ml mini
  21: 5.0, // Crown scalp scrub 60ml mini
  22: 14.0, // all day extra shampoo 250
  23: 14.0, // all day extra conditioner 250
  24: 30.0, // Discovery set
  25: 25.0, // better together set
  26: 20.0, // good habit set
  27: 22.0, // keep shining set
  28: 18.0, // little things set
  29: 14.0, // good calm cushion cream
  30: 14.0, // movement dry texture spray
  31: 14.0, // reset ltd ed dry shampoo
  32: 15.0, // immaculate cleansing fluid
  33: 0.0, // EDP Tester (not sold)
  34: 0.0, // EDP Tester (not sold)
  35: 0.0, // EDP Tester (not sold)
  36: 0.0, // EDP Tester (not sold)
  37: 16.0, // Dry Shampoo & Detangler bundle
  38: 16.0, // Leave-in bonding conditioner
  39: 32.0, // A Kind of Floral fragrance
  40: 32.0, // Decorated Woods fragrance
  41: 32.0, // Future Bloom fragrance
  42: 28.0, // Fragrance collection 4x10ml
  43: 32.0, // No One Elsie fragrance
  44: 16.2, // everyday radiance gift
  45: 7.5, // glow bauble gift
  46: 25.0, // above the clouds gift set
  47: 7.5, // perfect bloom gift
  48: 10.0, // Stay Grounded duo
  49: 16.0, // boundless bounce
  50: 14.0, // reset LE dry shampoo
  51: 14.0, // reset dry shampoo brightside
  52: 32.0, // Brightside EDP
};

// Products that are "core" (sold more frequently in more stores)
const CORE_PRODUCTS = [2, 3, 4, 5, 6, 8, 10, 11, 13, 15, 22, 23, 30, 31, 38, 48, 50];
// Products that are gifts/seasonal (lower frequency)
const GIFT_PRODUCTS = [24, 25, 26, 27, 28, 44, 45, 46, 47, 49];
// Testers — never generate sales
const TESTER_PRODUCTS = [33, 34, 35, 36];
// Everything else is "mid" frequency
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MID_PRODUCTS = [1, 7, 9, 12, 14, 16, 17, 18, 19, 20, 21, 29, 32, 37, 39, 40, 41, 42, 43, 51, 52];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  // Simple mulberry32 PRNG for reproducibility
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(42);

function mondayOfWeek(weeksBeforeEnd: number): string {
  const d = new Date(END_DATE);
  d.setDate(d.getDate() - weeksBeforeEnd * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Seasonal multiplier based on the date:
 *  - Gentle upward trend over 26 weeks (~+15% from start to end)
 *  - Christmas bump: early-mid Dec ramps up, peak w/c 15 Dec
 *  - Jan slump: drops below baseline for first few weeks of Jan
 *  - Gift products get an extra Christmas boost
 */
function seasonalMultiplier(
  date: string,
  weekIndex: number,
  isGift: boolean
): number {
  const month = parseInt(date.slice(5, 7));
  const day = parseInt(date.slice(8, 10));

  // Gentle growth: week 0 (oldest) = 0.92, week 25 (newest) = 1.08
  const growth = 0.92 + (weekIndex / (WEEKS - 1)) * 0.16;

  // Seasonal shape
  let seasonal = 1.0;
  if (month === 12) {
    if (day <= 7) seasonal = 1.25; // early Dec
    else if (day <= 14) seasonal = 1.45; // mid Dec
    else if (day <= 21) seasonal = 1.6; // peak pre-Christmas
    else seasonal = 1.1; // Christmas week itself (some stores closed)
  } else if (month === 11 && day >= 24) {
    seasonal = 1.15; // late Nov Black Friday bump
  } else if (month === 1) {
    if (day <= 7) seasonal = 0.6; // New Year slump
    else if (day <= 14) seasonal = 0.7; // still slow
    else seasonal = 0.8; // recovering
  }

  // Gifts get a bigger Christmas spike and deeper Jan trough
  if (isGift) {
    if (month === 12) seasonal *= 1.5;
    else if (month === 11 && day >= 24) seasonal *= 1.3;
    else if (month === 1) seasonal *= 0.7;
  }

  return growth * seasonal;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const dataDir = path.resolve(__dirname, "..", "data");
  const products: Product[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "boots-products.json"), "utf-8")
  );
  const stores: Store[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "boots-stores.json"), "utf-8")
  );

  const physicalStores = stores.filter((s) => s.format === "boots");
  const onlineStores = stores.filter((s) => s.format === "online");

  console.log(`Products: ${products.length}`);
  console.log(`Physical stores: ${physicalStores.length}`);
  console.log(`Online stores: ${onlineStores.length}`);
  console.log(`Generating ${WEEKS} weeks of data...`);

  const sales: Sale[] = [];

  for (let w = WEEKS - 1; w >= 0; w--) {
    const date = mondayOfWeek(w);
    const weekIndex = WEEKS - 1 - w; // 0 = oldest, 25 = newest

    // --- Physical stores ---
    for (const store of physicalStores) {
      for (const product of products) {
        const pid = product.id;
        if (TESTER_PRODUCTS.includes(pid)) continue;

        const price = PRODUCT_PRICES[pid] || 14.0;
        if (price === 0) continue;

        const isGift = GIFT_PRODUCTS.includes(pid);
        const sm = seasonalMultiplier(date, weekIndex, isGift);

        // Determine probability of this store selling this product this week
        let prob: number;
        if (CORE_PRODUCTS.includes(pid)) {
          prob = 0.04;
        } else if (isGift) {
          prob = 0.015;
        } else {
          prob = 0.025;
        }

        // Apply seasonal/trend multiplier + weekly noise
        const weekNoise = 0.8 + rand() * 0.4;
        prob *= sm * weekNoise;

        if (rand() < prob) {
          // Most physical sales are 1 unit, occasionally 2-3
          // Seasonal multiplier also boosts units slightly at peaks
          const unitRoll = rand();
          let units: number;
          if (sm > 1.3) {
            // Peak periods: more multi-unit sales
            units = unitRoll < 0.5 ? 1 : unitRoll < 0.8 ? 2 : unitRoll < 0.95 ? 3 : 4;
          } else {
            units = unitRoll < 0.75 ? 1 : unitRoll < 0.92 ? 2 : 3;
          }
          const revenue = (units * price).toFixed(2);

          sales.push({ productId: pid, storeId: store.id, date, units, revenue });
        }
      }
    }

    // --- Online stores (higher volume) ---
    for (const store of onlineStores) {
      for (const product of products) {
        const pid = product.id;
        if (TESTER_PRODUCTS.includes(pid)) continue;

        const price = PRODUCT_PRICES[pid] || 14.0;
        if (price === 0) continue;

        const isGift = GIFT_PRODUCTS.includes(pid);
        const sm = seasonalMultiplier(date, weekIndex, isGift);

        // Online stores sell most products most weeks
        let prob: number;
        if (CORE_PRODUCTS.includes(pid)) {
          prob = 0.85;
        } else if (isGift) {
          prob = 0.5;
        } else {
          prob = 0.65;
        }

        // Seasonal affects probability (clamped to 1.0 max)
        prob = Math.min(1.0, prob * sm);

        if (rand() < prob) {
          // Online units scaled by seasonal multiplier
          let baseMax: number;
          if (CORE_PRODUCTS.includes(pid)) {
            baseMax = 8;
          } else if (isGift) {
            baseMax = 3;
          } else {
            baseMax = 5;
          }
          const scaledMax = Math.max(1, Math.round(baseMax * sm));
          const units = 1 + Math.floor(rand() * scaledMax);
          const revenue = (units * price).toFixed(2);

          sales.push({ productId: pid, storeId: store.id, date, units, revenue });
        }
      }
    }
  }

  // Write output
  const salesPath = path.join(dataDir, "boots-sales.json");
  fs.writeFileSync(salesPath, JSON.stringify(sales, null, 2));

  console.log(`\nWrote ${sales.length} sale records to ${salesPath}`);
  console.log(`Date range: ${mondayOfWeek(WEEKS - 1)} to ${mondayOfWeek(0)}`);
}

main();
