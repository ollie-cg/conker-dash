"use client"

import { useState, useMemo } from "react"

interface DistributionTableProps {
  data: { region: string; stocking: number; scanning: number }[]
  onRegionClick?: (region: string) => void
}

type SortKey = "region" | "stocking" | "scanning" | "pctScanning" | "gap"
type SortDir = "asc" | "desc"

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

export default function DistributionTable({
  data,
  onRegionClick,
}: DistributionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("gap")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const totalStocking = useMemo(
    () => data.reduce((sum, r) => sum + r.stocking, 0),
    [data],
  )
  const totalScanning = useMemo(
    () => data.reduce((sum, r) => sum + r.scanning, 0),
    [data],
  )
  const totalGap = totalStocking - totalScanning
  const totalPctScanning =
    totalStocking > 0 ? (totalScanning / totalStocking) * 100 : 0

  const sorted = useMemo(() => {
    const rows = data.map((row) => ({
      ...row,
      pctScanning: row.stocking > 0 ? (row.scanning / row.stocking) * 100 : 0,
      gap: row.stocking - row.scanning,
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
  }, [data, sortKey, sortDir])

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
    { key: "stocking", label: "Stores Stocking", align: "text-right" },
    { key: "scanning", label: "Stores Scanning", align: "text-right" },
    { key: "pctScanning", label: "% Scanning", align: "text-right" },
    { key: "gap", label: "Gap", align: "text-right" },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No regional distribution data for the selected period
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
          {sorted.map((row, i) => {
            const isBelowThreshold = row.pctScanning < 50
            return (
              <tr
                key={row.region}
                onClick={() => onRegionClick?.(row.region)}
                className={`border-b border-slate-100 transition-colors ${
                  onRegionClick ? "cursor-pointer" : ""
                } ${
                  isBelowThreshold
                    ? "bg-red-50 hover:bg-red-100/60"
                    : i % 2 === 1
                      ? "bg-slate-50/50 hover:bg-sky-50/40"
                      : "hover:bg-sky-50/40"
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {row.region}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatNumber(row.stocking)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatNumber(row.scanning)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    isBelowThreshold
                      ? "font-semibold text-red-600"
                      : "text-slate-600"
                  }`}
                >
                  {row.pctScanning.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatNumber(row.gap)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <td className="px-4 py-2.5 text-slate-700">Total</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totalStocking)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totalScanning)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {totalPctScanning.toFixed(1)}%
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totalGap)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
