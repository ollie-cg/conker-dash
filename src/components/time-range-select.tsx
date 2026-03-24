'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const presets = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 91 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
]

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateDaysAgo(reference: string, n: number): string {
  const d = new Date(reference + 'T00:00:00')
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export default function TimeRangeSelect({ maxDate }: { maxDate: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const anchor = maxDate

  const currentFrom = searchParams.get('from') ?? dateDaysAgo(anchor, 182 - 1)
  const currentTo = searchParams.get('to') ?? anchor

  const activePreset = (() => {
    if (currentTo !== anchor) return null
    const span = daysBetween(currentFrom, currentTo)
    return presets.find((p) => p.days === span) ?? null
  })()

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const handleChange = (days: number) => {
    pushParams({
      from: dateDaysAgo(anchor, days - 1),
      to: anchor,
    })
  }

  return (
    <select
      value={activePreset?.days ?? 182}
      onChange={(e) => handleChange(Number(e.target.value))}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300"
    >
      {presets.map((preset) => (
        <option key={preset.days} value={preset.days}>
          {preset.label}
        </option>
      ))}
    </select>
  )
}
