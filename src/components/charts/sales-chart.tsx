"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface SalesChartProps {
  data: { date: string; units: number; revenue: number }[]
  metric: "revenue" | "units"
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const day = d.getDate()
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  return `${day} ${months[d.getMonth()]}`
}

function formatYAxis(value: number, metric: "revenue" | "units"): string {
  if (metric === "revenue") {
    if (value >= 1000) return `\u00a3${(value / 1000).toFixed(0)}k`
    return `\u00a3${value}`
  }
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return String(value)
}

function formatTooltipValue(value: number, metric: "revenue" | "units"): string {
  if (metric === "revenue") {
    return `\u00a3${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return value.toLocaleString("en-GB")
}

export default function SalesChart({ data, metric }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No sales data for the selected period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tickFormatter={(v) => formatYAxis(v, metric)}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          labelFormatter={(label) => formatDateLabel(String(label))}
          formatter={(value) => [
            formatTooltipValue(Number(value), metric),
            metric === "revenue" ? "Revenue" : "Units",
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
          }}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke="#0ea5e9"
          strokeWidth={2}
          fill="url(#areaGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
