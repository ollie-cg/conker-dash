"use client"

import { useMemo } from "react"

interface VarianceTableProps {
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

function formatValue(value: number, metric: "revenue" | "units"): string {
  if (metric === "revenue") {
    return "\u00a3" + value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return value.toLocaleString("en-GB")
}

function formatVariance(value: number, metric: "revenue" | "units"): string {
  const prefix = value >= 0 ? "+" : ""
  if (metric === "revenue") {
    return prefix + "\u00a3" + Math.abs(value).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return prefix + Math.abs(value).toLocaleString("en-GB")
}

function formatPct(value: number): string {
  const prefix = value >= 0 ? "+" : ""
  return prefix + value.toFixed(1) + "%"
}

function varianceColor(value: number): string {
  if (value > 0) return "text-emerald-600"
  if (value < 0) return "text-red-600"
  return "text-slate-600"
}

export default function VarianceTable({ data, metric }: VarianceTableProps) {
  const totals = useMemo(() => {
    const totalActual = data.reduce((s, r) => s + r.actual, 0)
    const totalForecast = data.reduce((s, r) => s + r.forecast, 0)
    const totalTarget = data.reduce((s, r) => s + r.target, 0)
    return { actual: totalActual, forecast: totalForecast, target: totalTarget }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No variance data for the selected period
      </div>
    )
  }

  const unitLabel = metric === "revenue" ? "\u00a3" : "units"

  function renderRow(
    label: string,
    actual: number,
    forecast: number,
    target: number,
    isTotal: boolean,
  ) {
    const vsForecast = actual - forecast
    const vsForecastPct = forecast !== 0 ? (vsForecast / forecast) * 100 : 0
    const vsTarget = actual - target
    const vsTargetPct = target !== 0 ? (vsTarget / target) * 100 : 0

    const rowCls = isTotal
      ? "border-t-2 border-slate-200 bg-slate-50 font-semibold"
      : "border-b border-slate-100 transition-colors hover:bg-sky-50/40"

    return (
      <tr key={label} className={rowCls}>
        <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
          {label}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
          {formatValue(actual, metric)}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
          {formatValue(forecast, metric)}
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsForecast)}`}>
          {formatVariance(vsForecast, metric)}
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsForecastPct)}`}>
          {formatPct(vsForecastPct)}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
          {formatValue(target, metric)}
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsTarget)}`}>
          {formatVariance(vsTarget, metric)}
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsTargetPct)}`}>
          {formatPct(vsTargetPct)}
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-600">
              Week
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              Actual
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              Forecast
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              vs Forecast ({unitLabel})
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              vs Forecast (%)
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              Target
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              vs Target ({unitLabel})
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
              vs Target (%)
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const rowCls = i % 2 === 1 ? "bg-slate-50/50" : ""
            const vsForecast = row.actual - row.forecast
            const vsForecastPct = row.forecast !== 0 ? (vsForecast / row.forecast) * 100 : 0
            const vsTarget = row.actual - row.target
            const vsTargetPct = row.target !== 0 ? (vsTarget / row.target) * 100 : 0

            return (
              <tr
                key={row.weekStart}
                className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${rowCls}`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                  {formatWeekLabel(row.weekStart)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatValue(row.actual, metric)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatValue(row.forecast, metric)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsForecast)}`}>
                  {formatVariance(vsForecast, metric)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsForecastPct)}`}>
                  {formatPct(vsForecastPct)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatValue(row.target, metric)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsTarget)}`}>
                  {formatVariance(vsTarget, metric)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${varianceColor(vsTargetPct)}`}>
                  {formatPct(vsTargetPct)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {renderRow("Total", totals.actual, totals.forecast, totals.target, true)}
        </tfoot>
      </table>
    </div>
  )
}
