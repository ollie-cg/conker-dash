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
