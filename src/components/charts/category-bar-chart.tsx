'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { type BootsCategory, CATEGORY_COLOURS, ALL_CATEGORIES } from '@/lib/boots-categories'

interface SkuRow {
  productId: number
  name: string
  category: BootsCategory
  revenue: number
  units: number
  storesScanning: number
  ros: number
  asp: number
}

interface CategoryBarChartProps {
  data: SkuRow[]
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `\u00a3${(value / 1000).toFixed(1)}k`
  return `\u00a3${value.toFixed(0)}`
}

function formatTooltipCurrency(value: number): string {
  return (
    '\u00a3' +
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  // Aggregate revenue by category
  const totals = new Map<BootsCategory, number>()
  for (const row of data) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.revenue)
  }

  const chartData = ALL_CATEGORIES
    .filter((cat) => (totals.get(cat) ?? 0) > 0)
    .map((cat) => ({
      name: cat,
      revenue: totals.get(cat) ?? 0,
      colour: CATEGORY_COLOURS[cat],
    }))
    .sort((a, b) => b.revenue - a.revenue)

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value) => [formatTooltipCurrency(Number(value)), 'Revenue']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} barSize={18}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.colour} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
