"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface BootsStoreTableProps {
  data: {
    storeId: number
    code: string
    name: string
    format: string
    revenue: number
    units: number
    skusScanned: number
    ros: number
    asp: number
  }[]
}

type SortKey = "name" | "revenue" | "units" | "skusScanned" | "ros" | "asp"
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

export default function BootsStoreTable({ data }: BootsStoreTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function buildDetailHref(storeId: number) {
    const params = new URLSearchParams()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return qs ? `/stores/${storeId}?${qs}` : `/stores/${storeId}`
  }

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name)
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
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: "name", label: "Store", align: "text-left" },
    { key: "revenue", label: "Revenue", align: "text-right" },
    { key: "units", label: "Units", align: "text-right" },
    { key: "skusScanned", label: "SKUs Scanned", align: "text-right" },
    { key: "ros", label: "ROS/Week", align: "text-right" },
    { key: "asp", label: "ASP", align: "text-right" },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No store data for the selected period
      </div>
    )
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
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
              key={row.storeId}
              onClick={() => router.push(buildDetailHref(row.storeId))}
              className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${
                i % 2 === 1 ? "bg-slate-50/50" : ""
              }`}
            >
              <td className="px-4 py-2.5 font-medium text-slate-700">
                {row.name}
                {row.format === "online" && (
                  <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                    Online
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.units)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.skusScanned)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.ros)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.asp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
