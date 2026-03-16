"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface DistributionChartProps {
  data: { weekStart: string; stocking: number; scanning: number }[]
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

function formatNumber(value: number): string {
  return value.toLocaleString("en-GB")
}

export default function DistributionChart({ data }: DistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-slate-400">
        No distribution data for the selected period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          labelFormatter={(label) => formatDateLabel(String(label))}
          formatter={(value, name) => [
            formatNumber(Number(value)),
            name,
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "13px",
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="plainline"
          wrapperStyle={{ fontSize: "13px" }}
        />
        <Line
          type="monotone"
          dataKey="stocking"
          name="Stores Stocking"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="scanning"
          name="Stores Scanning"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
