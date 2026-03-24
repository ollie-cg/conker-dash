'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  type BootsCategory,
  CATEGORY_COLOURS,
} from '@/lib/boots-categories'

interface BootsSkuChartProps {
  data: { name: string; revenue: number; category: BootsCategory }[]
}

function formatCurrency(value: number): string {
  return (
    '\u00a3' +
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
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

/** Strip the Boots code prefix (e.g. "12345 - Product Name" -> "Product Name") and truncate. */
function truncateLabel(name: string, max: number = 30): string {
  const stripped = name.replace(/^\d+\s*-\s*/, '')
  if (stripped.length <= max) return stripped
  return stripped.slice(0, max - 1) + '\u2026'
}

export default function BootsSkuChart({ data }: BootsSkuChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.revenue - a.revenue),
    [data],
  )

  if (sorted.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-slate-400">
        No SKU data for the selected period
      </div>
    )
  }

  const chartHeight = Math.max(400, sorted.length * 28)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatCurrency}
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickFormatter={(name: string) => truncateLabel(name)}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={180}
        />
        <Tooltip
          formatter={(value) => [formatTooltipCurrency(Number(value)), 'Revenue']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
          }}
          labelFormatter={(label) => truncateLabel(String(label), 50)}
        />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]} barSize={18}>
          {sorted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLOURS[entry.category]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
