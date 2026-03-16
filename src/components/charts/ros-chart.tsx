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

interface RosChartProps {
  data: { weekStart: string; rosStocking: number; rosScanning: number }[]
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

function formatCurrency(value: number): string {
  return "\u00a3" + value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatYAxis(value: number): string {
  if (value >= 1000) return `\u00a3${(value / 1000).toFixed(1)}k`
  return `\u00a3${value.toFixed(0)}`
}

export default function RosChart({ data }: RosChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-slate-400">
        No rate of sale data for the selected period
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
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          labelFormatter={(label) => formatDateLabel(String(label))}
          formatter={(value, name) => [
            formatCurrency(Number(value)),
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
          dataKey="rosStocking"
          name="ROS (Stocking Basis)"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="rosScanning"
          name="ROS (Scanning Basis)"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
