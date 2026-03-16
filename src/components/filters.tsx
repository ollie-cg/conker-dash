'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface FiltersProps {
  products: { id: number; name: string }[]
  regions: string[]
}

type Preset = {
  label: string
  days: number
}

const presets: Preset[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 4 weeks', days: 28 },
  { label: 'Last 13 weeks', days: 91 },
  { label: 'Last 26 weeks', days: 182 },
]

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

function yesterday(): string {
  return daysAgo(1)
}

/** Compute the number of days between two YYYY-MM-DD strings (inclusive). */
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// ─── Multi-select dropdown ──────────────────────────────────────────────────

function MultiSelect({
  label,
  allLabel,
  options,
  selected,
  onChange,
}: {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const displayText =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? '1 selected'
        : `${selected.length} ${label.toLowerCase()}`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
          selected.length > 0
            ? 'border-sky-300 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        <span>{displayText}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-50"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Filters component ──────────────────────────────────────────────────────

export default function Filters({ products, regions }: FiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read current filter values from URL
  const currentFrom = searchParams.get('from') ?? daysAgo(28)
  const currentTo = searchParams.get('to') ?? yesterday()
  const currentProducts = searchParams.get('products')
    ? searchParams
        .get('products')!
        .split(',')
        .filter((s) => s.length > 0)
    : []
  const currentRegions = searchParams.get('regions')
    ? searchParams
        .get('regions')!
        .split(',')
        .filter((s) => s.length > 0)
    : []

  // Helper to push updated params to URL
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

  // ── Preset detection ────────────────────────────────────────────────────
  const activePreset = (() => {
    const yest = yesterday()
    if (currentTo !== yest) return null
    const span = daysBetween(currentFrom, currentTo)
    return presets.find((p) => p.days === span) ?? null
  })()

  // ── Event handlers ──────────────────────────────────────────────────────
  const handlePreset = (days: number) => {
    pushParams({
      from: daysAgo(days),
      to: yesterday(),
    })
  }

  const handleFromChange = (value: string) => {
    pushParams({ from: value })
  }

  const handleToChange = (value: string) => {
    pushParams({ to: value })
  }

  const handleProductsChange = (values: string[]) => {
    pushParams({
      products: values.length > 0 ? values.join(',') : null,
    })
  }

  const handleRegionsChange = (values: string[]) => {
    pushParams({
      regions: values.length > 0 ? values.join(',') : null,
    })
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      {/* Date presets */}
      <div className="flex items-center gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => handlePreset(preset.days)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activePreset?.days === preset.days
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-200" />

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => handleFromChange(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => handleToChange(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300"
        />
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-200" />

      {/* Product selector */}
      <MultiSelect
        label="Products"
        allLabel="All Products"
        options={products.map((p) => ({ value: String(p.id), label: p.name }))}
        selected={currentProducts}
        onChange={handleProductsChange}
      />

      {/* Region selector */}
      <MultiSelect
        label="Regions"
        allLabel="All Regions"
        options={regions.map((r) => ({ value: r, label: r }))}
        selected={currentRegions}
        onChange={handleRegionsChange}
      />
    </div>
  )
}
