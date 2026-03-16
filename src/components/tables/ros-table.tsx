"use client"

import { useState, useMemo } from "react"

interface RosTableProps {
  data: {
    region: string
    rosStocking: number
    rosScanning: number
    storesStocking: number
    storesScanning: number
  }[]
}

type SortKey = "region" | "rosStocking" | "rosScanning" | "storesStocking" | "storesScanning"
type SortDir = "asc" | "desc"

function formatCurrency(value: number): string {
  return "\u00a3" + value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

export default function RosTable({ data }: RosTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rosStocking")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Compute weighted total ROS (not average of averages)
  const totals = useMemo(() => {
    const totalRevStocking = data.reduce(
      (sum, r) => sum + r.rosStocking * r.storesStocking,
      0,
    )
    const totalRevScanning = data.reduce(
      (sum, r) => sum + r.rosScanning * r.storesScanning,
      0,
    )
    const totalStoresStocking = data.reduce(
      (sum, r) => sum + r.storesStocking,
      0,
    )
    const totalStoresScanning = data.reduce(
      (sum, r) => sum + r.storesScanning,
      0,
    )
    return {
      rosStocking:
        totalStoresStocking > 0 ? totalRevStocking / totalStoresStocking : 0,
      rosScanning:
        totalStoresScanning > 0 ? totalRevScanning / totalStoresScanning : 0,
      storesStocking: totalStoresStocking,
      storesScanning: totalStoresScanning,
    }
  }, [data])

  // Find best and worst ROS (stocking basis) regions
  const { bestRegion, worstRegion } = useMemo(() => {
    if (data.length === 0) return { bestRegion: "", worstRegion: "" }
    let best = data[0]
    let worst = data[0]
    for (const row of data) {
      if (row.rosStocking > best.rosStocking) best = row
      if (row.rosStocking < worst.rosStocking) worst = row
    }
    return { bestRegion: best.region, worstRegion: worst.region }
  }, [data])

  const sorted = useMemo(() => {
    const rows = [...data]
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
    { key: "rosStocking", label: "ROS (Stocking)", align: "text-right" },
    { key: "rosScanning", label: "ROS (Scanning)", align: "text-right" },
    { key: "storesStocking", label: "Stores Stocking", align: "text-right" },
    { key: "storesScanning", label: "Stores Scanning", align: "text-right" },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No regional ROS data for the selected period
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
            const isBest = row.region === bestRegion
            const isWorst = row.region === worstRegion
            let rowClass =
              "border-b border-slate-100 transition-colors hover:bg-sky-50/40"
            if (isBest) {
              rowClass =
                "border-b border-green-200 bg-green-50 transition-colors hover:bg-green-100/60"
            } else if (isWorst) {
              rowClass =
                "border-b border-amber-200 bg-amber-50 transition-colors hover:bg-amber-100/60"
            } else if (i % 2 === 1) {
              rowClass =
                "border-b border-slate-100 bg-slate-50/50 transition-colors hover:bg-sky-50/40"
            }

            return (
              <tr key={row.region} className={rowClass}>
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {row.region}
                  {isBest && (
                    <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      BEST
                    </span>
                  )}
                  {isWorst && (
                    <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      LOWEST
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatCurrency(row.rosStocking)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatCurrency(row.rosScanning)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatNumber(row.storesStocking)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {formatNumber(row.storesScanning)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <td className="px-4 py-2.5 text-slate-700">Total</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatCurrency(totals.rosStocking)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatCurrency(totals.rosScanning)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totals.storesStocking)}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
              {formatNumber(totals.storesScanning)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
