import {
  getProducts,
  getRegions,
  getWeeklySales,
  getForecasts,
  getTargets,
} from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import Filters from '@/components/filters'
import PerformanceChart from '@/components/charts/performance-chart'
import VarianceTable from '@/components/tables/variance-table'
import MetricToggle from './metric-toggle'

function formatCurrency(value: number): string {
  return '\u00a3' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseFilters(searchParams)
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  const productIdFilter =
    filters.productIds.length > 0 ? filters.productIds : undefined

  const [products, regions, weeklySales, forecastRows, targetRows] =
    await Promise.all([
      getProducts(),
      getRegions(),
      getWeeklySales({
        productIds: productIdFilter,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      getForecasts({
        productIds: productIdFilter,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      getTargets({
        productIds: productIdFilter,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ])

  // Aggregate forecasts by week
  const forecastByWeek = new Map<string, { units: number; revenue: number }>()
  for (const row of forecastRows) {
    const key = row.weekStart
    const existing = forecastByWeek.get(key) ?? { units: 0, revenue: 0 }
    existing.units += Number(row.units ?? 0)
    existing.revenue += Number(row.revenue ?? 0)
    forecastByWeek.set(key, existing)
  }

  // Aggregate targets by week
  const targetByWeek = new Map<string, { units: number; revenue: number }>()
  for (const row of targetRows) {
    const key = row.weekStart
    const existing = targetByWeek.get(key) ?? { units: 0, revenue: 0 }
    existing.units += Number(row.units ?? 0)
    existing.revenue += Number(row.revenue ?? 0)
    targetByWeek.set(key, existing)
  }

  // Collect all week keys from all three sources
  const allWeeks = new Set<string>()
  for (const row of weeklySales) allWeeks.add(row.weekStart)
  Array.from(forecastByWeek.keys()).forEach((key) => allWeeks.add(key))
  Array.from(targetByWeek.keys()).forEach((key) => allWeeks.add(key))

  // Build the joined dataset
  const sortedWeeks = Array.from(allWeeks).sort()
  const chartData = sortedWeeks.map((weekStart) => {
    const salesRow = weeklySales.find((s) => s.weekStart === weekStart)
    const forecastAgg = forecastByWeek.get(weekStart)
    const targetAgg = targetByWeek.get(weekStart)

    const actualVal = metric === 'revenue'
      ? (salesRow?.revenue ?? 0)
      : (salesRow?.units ?? 0)
    const forecastVal = metric === 'revenue'
      ? (forecastAgg?.revenue ?? 0)
      : (forecastAgg?.units ?? 0)
    const targetVal = metric === 'revenue'
      ? (targetAgg?.revenue ?? 0)
      : (targetAgg?.units ?? 0)

    return {
      weekStart,
      actual: actualVal,
      forecast: forecastVal,
      target: targetVal,
    }
  })

  // Summary totals
  const totalActual = chartData.reduce((s, r) => s + r.actual, 0)
  const totalForecast = chartData.reduce((s, r) => s + r.forecast, 0)
  const totalTarget = chartData.reduce((s, r) => s + r.target, 0)

  const fmt = metric === 'revenue' ? formatCurrency : formatNumber
  const metricLabel = metric === 'revenue' ? 'Revenue' : 'Units'

  return (
    <>
      <Filters
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        regions={regions}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Performance vs Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Total Actual: {fmt(totalActual)} | Forecast: {fmt(totalForecast)} | Target: {fmt(totalTarget)}
          {' '}&middot;{' '}
          {formatDisplayDate(filters.startDate)} &ndash; {formatDisplayDate(filters.endDate)}
        </p>
      </div>

      {/* Chart section */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Weekly {metricLabel}: Actual vs Forecast vs Target
          </h2>
          <MetricToggle current={metric} />
        </div>
        <PerformanceChart data={chartData} metric={metric} />
      </div>

      {/* Variance table */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Variance Breakdown
        </h2>
        <VarianceTable data={chartData} metric={metric} />
      </div>
    </>
  )
}
