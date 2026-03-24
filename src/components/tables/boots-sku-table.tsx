'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  type BootsCategory,
  CATEGORY_BG_CLASSES,
} from '@/lib/boots-categories'

interface SkuRow {
  productId: number
  name: string
  category: BootsCategory
  revenue: number
  units: number
  storesScanning: number
  ros: number
  asp: number
}

interface BootsSkuTableProps {
  data: SkuRow[]
}

type SortKey =
  | 'name'
  | 'category'
  | 'revenue'
  | 'units'
  | 'storesScanning'
  | 'ros'
  | 'asp'
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

export default function BootsSkuTable({ data }: BootsSkuTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function buildDetailHref(productId: number) {
    const params = new URLSearchParams()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return qs ? `/products/${productId}?${qs}` : `/products/${productId}`
  }

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'name' || sortKey === 'category') {
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
      setSortDir(key === 'name' || key === 'category' ? 'asc' : 'desc')
    }
  }

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: 'name', label: 'SKU', align: 'text-left' },
    { key: 'category', label: 'Category', align: 'text-left' },
    { key: 'revenue', label: 'Revenue', align: 'text-right' },
    { key: 'units', label: 'Units', align: 'text-right' },
    { key: 'storesScanning', label: 'Stores', align: 'text-right' },
    { key: 'ros', label: 'ROS', align: 'text-right' },
    { key: 'asp', label: 'ASP', align: 'text-right' },
  ]

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No SKU data found
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
              key={row.productId}
              onClick={() => router.push(buildDetailHref(row.productId))}
              className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${
                i % 2 === 1 ? 'bg-slate-50/50' : ''
              }`}
            >
              <td className="px-4 py-2.5 font-medium text-slate-700">
                {row.name}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BG_CLASSES[row.category]}`}
                >
                  {row.category}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatCurrency(row.revenue)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.units)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {formatNumber(row.storesScanning)}
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
