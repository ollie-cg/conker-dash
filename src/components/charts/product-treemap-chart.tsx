'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { type BootsCategory, CATEGORY_COLOURS } from '@/lib/boots-categories'

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

interface ProductTreemapChartProps {
  data: SkuRow[]
}

function stripCode(name: string): string {
  return name.replace(/^\d+\s*-\s*/, '')
}

function formatCurrency(value: number): string {
  return (
    '\u00a3' +
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

interface TreemapContentProps {
  x: number
  y: number
  width: number
  height: number
  name: string
  colour: string
}

function CustomContent({ x, y, width, height, name, colour }: TreemapContentProps) {
  const showLabel = width > 50 && height > 28

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colour}
        fillOpacity={0.75}
        stroke="#fff"
        strokeWidth={2}
        rx={3}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize={width > 80 ? 11 : 9}
          fontWeight={500}
        >
          {name.length > Math.floor(width / 7) ? name.slice(0, Math.floor(width / 7) - 1) + '\u2026' : name}
        </text>
      )}
    </g>
  )
}

export default function ProductTreemapChart({ data }: ProductTreemapChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No product data for the selected period
      </div>
    )
  }

  const treemapData = data
    .filter((d) => d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .map((row) => ({
      name: stripCode(row.name),
      size: row.revenue,
      colour: CATEGORY_COLOURS[row.category],
      category: row.category,
    }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treemapData}
        dataKey="size"
        aspectRatio={4 / 3}
        content={<CustomContent x={0} y={0} width={0} height={0} name="" colour="" />}
      >
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
          labelFormatter={(label) => String(label)}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}
