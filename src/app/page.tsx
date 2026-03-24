import { parseBootsFilters } from '@/lib/boots-filters'
import {
  getBootsSalesForPeriod,
  getBootsStoresScanning,
  getBootsOnlineShare,
  getBootsWeeklySales,
  getBootsDataDateRange,
} from '@/lib/boots-queries'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  percentChange,
} from '@/lib/utils'
import KpiCard from '@/components/kpi-card'
import TimeRangeSelect from '@/components/time-range-select'
import SalesChart from '@/components/charts/sales-chart'
import MetricToggle from './metric-toggle'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function changeType(val: number): 'positive' | 'negative' | 'neutral' {
  if (val > 0) return 'positive'
  if (val < 0) return 'negative'
  return 'neutral'
}

function changeStr(val: number): string {
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}% WoW`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BootsOverviewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const { maxDate } = getBootsDataDateRange()
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  // Calculate previous period (same length, immediately before startDate)
  const startMs = new Date(filters.startDate + 'T00:00:00').getTime()
  const endMs = new Date(filters.endDate + 'T00:00:00').getTime()
  const periodLengthMs = endMs - startMs
  const prevEndDate = new Date(startMs - 24 * 60 * 60 * 1000) // day before startDate
  const prevStartDate = new Date(prevEndDate.getTime() - periodLengthMs)

  const fmt = (d: Date): string => d.toISOString().slice(0, 10)
  const prevStart = fmt(prevStartDate)
  const prevEnd = fmt(prevEndDate)

  // Fetch all data in parallel
  const [
    currentSales,
    prevSales,
    currentScanning,
    prevScanning,
    currentOnlineShare,
    prevOnlineShare,
    weeklySales,
  ] = await Promise.all([
    getBootsSalesForPeriod({ startDate: filters.startDate, endDate: filters.endDate }),
    getBootsSalesForPeriod({ startDate: prevStart, endDate: prevEnd }),
    getBootsStoresScanning({ startDate: filters.startDate, endDate: filters.endDate }),
    getBootsStoresScanning({ startDate: prevStart, endDate: prevEnd }),
    getBootsOnlineShare({ startDate: filters.startDate, endDate: filters.endDate }),
    getBootsOnlineShare({ startDate: prevStart, endDate: prevEnd }),
    getBootsWeeklySales({ startDate: filters.startDate, endDate: filters.endDate }),
  ])

  // ---------------------------------------------------------------------------
  // Derived KPIs
  // ---------------------------------------------------------------------------

  // Revenue
  const revenueWoW = percentChange(currentSales.totalRevenue, prevSales.totalRevenue)

  // Units
  const unitsWoW = percentChange(currentSales.totalUnits, prevSales.totalUnits)

  // Stores Scanning
  const scanningCount = currentScanning.count
  const scanningTotal = currentScanning.total

  // ROS (Revenue per Store scanning, per week)
  const periodDays =
    Math.max(1, (endMs - startMs) / (24 * 60 * 60 * 1000))
  const periodWeeks = Math.max(1, periodDays / 7)
  const rosCurrent =
    scanningCount > 0 ? currentSales.totalRevenue / scanningCount / periodWeeks : 0
  const prevScanningCount = prevScanning.count
  const prevPeriodDays =
    Math.max(1, (prevEndDate.getTime() - prevStartDate.getTime()) / (24 * 60 * 60 * 1000))
  const prevPeriodWeeks = Math.max(1, prevPeriodDays / 7)
  const rosPrev =
    prevScanningCount > 0 ? prevSales.totalRevenue / prevScanningCount / prevPeriodWeeks : 0
  const rosWoW = percentChange(rosCurrent, rosPrev)

  // ASP (Average Selling Price)
  const aspCurrent =
    currentSales.totalUnits > 0
      ? currentSales.totalRevenue / currentSales.totalUnits
      : 0
  const aspPrev =
    prevSales.totalUnits > 0
      ? prevSales.totalRevenue / prevSales.totalUnits
      : 0
  const aspWoW = percentChange(aspCurrent, aspPrev)

  // Online Share (percentage point change)
  const onlineShareCurrent = currentOnlineShare.share
  const onlineSharePrev = prevOnlineShare.share
  const onlineSharePpChange = onlineShareCurrent - onlineSharePrev

  // ---------------------------------------------------------------------------
  // Chart data: map weekStart -> date for SalesChart compatibility
  // ---------------------------------------------------------------------------
  const chartData = weeklySales.map((w) => ({
    date: w.weekStart,
    units: w.units,
    revenue: w.revenue,
  }))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <h1 className="text-sm font-medium text-slate-900">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect maxDate={maxDate} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-8">
      {/* KPI cards grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Revenue"
          value={formatCurrency(currentSales.totalRevenue)}
          change={changeStr(revenueWoW)}
          changeType={changeType(revenueWoW)}
        />
        <KpiCard
          title="Units"
          value={formatNumber(currentSales.totalUnits)}
          change={changeStr(unitsWoW)}
          changeType={changeType(unitsWoW)}
        />
        <KpiCard
          title="Stores Scanning"
          value={`${formatNumber(scanningCount)} of ${formatNumber(scanningTotal)}`}
          change={formatPercent(
            scanningTotal > 0 ? (scanningCount / scanningTotal) * 100 : 0,
          )}
          changeType={
            scanningTotal > 0 && scanningCount / scanningTotal >= 0.5
              ? 'positive'
              : 'negative'
          }
        />
        <KpiCard
          title="ROS/Store/Week"
          value={formatCurrency(rosCurrent)}
          change={changeStr(rosWoW)}
          changeType={changeType(rosWoW)}
        />
        <KpiCard
          title="ASP"
          value={formatCurrency(aspCurrent)}
          change={changeStr(aspWoW)}
          changeType={changeType(aspWoW)}
        />
        <KpiCard
          title="Online Share"
          value={formatPercent(onlineShareCurrent)}
          change={`${onlineSharePpChange >= 0 ? '+' : ''}${onlineSharePpChange.toFixed(1)}pp WoW`}
          changeType={changeType(onlineSharePpChange)}
        />
      </div>

      {/* Weekly trend chart */}
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Weekly {metric === 'revenue' ? 'Revenue' : 'Units'}
          </h2>
          <MetricToggle current={metric} />
        </div>
        <div className="min-h-0 flex-1">
          <SalesChart data={chartData} metric={metric} />
        </div>
      </div>
      </div>
    </>
  )
}
