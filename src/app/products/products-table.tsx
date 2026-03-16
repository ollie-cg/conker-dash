'use client'

import { useState, useMemo } from 'react'

interface Product {
  id: number
  name: string
  ean: string | null
  packSize: string | null
  rrp: number
  revenue: number
  units: number
  storesStocking: number
  storesScanning: number
  ros: number
}

interface ProductsTableProps {
  data: Product[]
}

type SortKey =
  | 'name'
  | 'ean'
  | 'packSize'
  | 'rrp'
  | 'revenue'
  | 'units'
  | 'storesStocking'
  | 'storesScanning'
  | 'ros'
type SortDir = 'asc' | 'desc'

function formatCurrency(value: number): string {
  return (
    '\u00a3' +
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block w-3 text-[10px] leading-none">
      {active ? (dir === 'asc' ? '\u25b2' : '\u25bc') : '\u25b4\u25be'}
    </span>
  )
}

export default function ProductsTable({ data }: ProductsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'name' || sortKey === 'ean' || sortKey === 'packSize') {
        cmp = (a[sortKey] ?? '').localeCompare(b[sortKey] ?? '')
      } else {
        cmp = a[sortKey] - b[sortKey]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(
        key === 'name' || key === 'ean' || key === 'packSize' ? 'asc' : 'desc',
      )
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: 'name', label: 'Product', align: 'text-left' },
    { key: 'ean', label: 'EAN', align: 'text-left' },
    { key: 'packSize', label: 'Pack Size', align: 'text-left' },
    { key: 'rrp', label: 'RRP', align: 'text-right' },
    { key: 'revenue', label: 'Revenue', align: 'text-right' },
    { key: 'units', label: 'Units', align: 'text-right' },
    { key: 'storesStocking', label: 'Stocking', align: 'text-right' },
    { key: 'storesScanning', label: 'Scanning', align: 'text-right' },
    { key: 'ros', label: 'ROS', align: 'text-right' },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No products found
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
              key={row.id}
              className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${
                i % 2 === 1 ? 'bg-slate-50/50' : ''
              }`}
            >
              <td className="px-4 py-2.5 font-medium text-slate-700">
                {row.name}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-slate-600">
                {row.ean ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {row.packSize ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.rrp)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.units)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.storesStocking)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.storesScanning)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.ros)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
