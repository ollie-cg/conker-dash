"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface PerformanceChartProps {
  data: {
    weekStart: string
    actual: number
    forecast: number
    target: number
  }[]
  metric: "revenue" | "units"
}

function formatWeekLabel(dateStr: string): string {
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
    if (value >= 1_000_000) return `\u00a3${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1000) return `\u00a3${(value / 1000).toFixed(0)}k`
    return `\u00a3${value}`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return String(value)
}

function formatTooltipValue(value: number, metric: "revenue" | "units"): string {
  if (metric === "revenue") {
    return "\u00a3" + value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return value.toLocaleString("en-GB")
}

export default function PerformanceChart({ data, metric }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-slate-400">
        No performance data for the selected period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeekLabel}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          tickFormatter={(v) => formatYAxis(v, metric)}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={65}
        />
        <Tooltip
          labelFormatter={(label) => `w/c ${formatWeekLabel(String(label))}`}
          formatter={(value, name) => {
            const label =
              name === "actual"
                ? "Actual"
                : name === "forecast"
                  ? "Forecast"
                  : "Target"
            return [formatTooltipValue(Number(value), metric), label]
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              actual: "Actual",
              forecast: "Forecast",
              target: "Target",
            }
            return labels[value] ?? value
          }}
        />
        <Bar
          dataKey="actual"
          fill="#38bdf8"
          radius={[3, 3, 0, 0]}
          barSize={28}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 3, fill: "#f97316" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#f43f5e"
          strokeWidth={2}
          strokeDasharray="2 2"
          dot={{ r: 3, fill: "#f43f5e" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
