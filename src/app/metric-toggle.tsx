'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface MetricToggleProps {
  current: 'revenue' | 'units'
}

export default function MetricToggle({ current }: MetricToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function toggle(metric: 'revenue' | 'units') {
    const params = new URLSearchParams(searchParams.toString())
    if (metric === 'revenue') {
      params.delete('metric')
    } else {
      params.set('metric', metric)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => toggle('revenue')}
        className={`rounded px-3 py-1 transition-colors ${
          current === 'revenue'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Revenue
      </button>
      <button
        type="button"
        onClick={() => toggle('units')}
        className={`rounded px-3 py-1 transition-colors ${
          current === 'units'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Units
      </button>
    </div>
  )
}
