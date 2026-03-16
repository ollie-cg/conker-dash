"use client"

import { useState, useMemo } from "react"

interface SalesTableProps {
  data: { region: string; units: number; revenue: number }[]
}

type SortKey = "region" | "units" | "revenue" | "pct"
type SortDir = "asc" | "desc"

function formatCurrency(value: number): string {
  return "\u00a3" + value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-GB")
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block w-3 text-[10px] leading-none">
      {active ? (dir === "asc" ? "\u25b2" : "\u25bc") : "\u25b4\u25be"}
    </span>
  )
}

export default function SalesTable({ data }: SalesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const totalRevenue = useMemo(
    () => data.reduce((sum, r) => sum + r.revenue, 0),
    [data],
  )
  const totalUnits = useMemo(
    () => data.reduce((sum, r) => sum + r.units, 0),
    [data],
  )

  const sorted = useMemo(() => {
    const rows = data.map((row) => ({
      ...row,
      pct: totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0,
    }))
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === "region") {
        cmp = a.region.localeCompare(b.region)
      } else {
        cmp = a[sortKey] - b[sortKey]
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir, totalRevenue])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "region" ? "asc" : "desc")
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: "region", label: "Region", align: "text-left" },
    { key: "units", label: "Units", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "pct", label: "% of Total", align: "text-right" },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No regional data for the selected period
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`cursor-pointer select-none whitespace-nowrap px-4 py-2.5 font-medium text-slate-600 ${col.align} hover:text-slate-900`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.region}
              className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${
                i % 2 === 1 ? "bg-slate-50/50" : ""
              }`}
            >
              <td className="px-4 py-2.5 font-medium text-slate-700">
                {row.region}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.units)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {row.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <td className="px-4 py-2.5 text-slate-700">Total</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totalUnits)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatCurrency(totalRevenue)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              100.0%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
