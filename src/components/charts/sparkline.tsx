"use client"

import { LineChart, Line, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: { value: number }[]
  color?: string
}

export default function Sparkline({ data, color = "#3b82f6" }: SparklineProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
