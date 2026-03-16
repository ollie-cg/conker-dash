import KpiCard from "@/components/kpi-card"
import Sparkline from "@/components/charts/sparkline"
import {
  getSalesForPeriod,
  getStoresStocking,
  getStoresScanning,
  getWeeklySales,
  getWeeklyStoresScanning,
  getForecasts,
  getTargets,
  getRisksAndOpps,
} from "@/lib/queries"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  percentChange,
} from "@/lib/utils"

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Get Monday of the week containing the given date (ISO weeks: Mon-Sun) */
function getMonday(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/** Format a Date as "YYYY-MM-DD" */
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OverviewPage() {
  const today = new Date()

  // This week: Monday..Sunday
  const thisMonday = getMonday(today)
  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisSunday.getDate() + 6)

  // Last week: previous Monday..Sunday
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastSunday.getDate() + 6)

  // 12 weeks back from thisMonday
  const twelveWeeksAgo = new Date(thisMonday)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const thisWeekStart = fmt(thisMonday)
  const thisWeekEnd = fmt(thisSunday)
  const lastWeekStart = fmt(lastMonday)
  const lastWeekEnd = fmt(lastSunday)
  const twelveWeeksAgoStr = fmt(twelveWeeksAgo)

  // -------------------------------------------------------------------------
  // Parallel data fetching
  // -------------------------------------------------------------------------
  const [
    thisWeekSales,
    lastWeekSales,
    storesStocking,
    storesScanning,
    lastWeekStoresScanning,
    weeklyS,
    weeklyStoresScanning,
    forecastRows,
    targetRows,
    openRisksAndOpps,
  ] = await Promise.all([
    getSalesForPeriod({ startDate: thisWeekStart, endDate: thisWeekEnd }),
    getSalesForPeriod({ startDate: lastWeekStart, endDate: lastWeekEnd }),
    getStoresStocking({ asOfDate: fmt(today) }),
    getStoresScanning({ startDate: thisWeekStart, endDate: thisWeekEnd }),
    getStoresScanning({ startDate: lastWeekStart, endDate: lastWeekEnd }),
    getWeeklySales({ startDate: twelveWeeksAgoStr, endDate: thisWeekEnd }),
    getWeeklyStoresScanning({
      startDate: twelveWeeksAgoStr,
      endDate: thisWeekEnd,
    }),
    getForecasts({ startDate: thisWeekStart, endDate: thisWeekEnd }),
    getTargets({ startDate: thisWeekStart, endDate: thisWeekEnd }),
    getRisksAndOpps({ status: "open" }),
  ])

  // -------------------------------------------------------------------------
  // Derived KPI values
  // -------------------------------------------------------------------------

  // Sales & Units this week / last week
  const salesThisWeek = thisWeekSales.totalRevenue
  const salesLastWeek = lastWeekSales.totalRevenue
  const unitsThisWeek = thisWeekSales.totalUnits
  const unitsLastWeek = lastWeekSales.totalUnits

  const salesWoW = percentChange(salesThisWeek, salesLastWeek)
  const unitsWoW = percentChange(unitsThisWeek, unitsLastWeek)

  // Stores
  const stockingCount = storesStocking.count
  const scanningCount = storesScanning.count
  const scanningPct =
    stockingCount > 0 ? (scanningCount / stockingCount) * 100 : 0

  // ROS / store / week
  const rosThisWeek = stockingCount > 0 ? salesThisWeek / stockingCount : 0
  const lastWeekStockingForRos = stockingCount // approximate — stocking doesn't change fast
  const rosLastWeek =
    lastWeekStockingForRos > 0 ? salesLastWeek / lastWeekStockingForRos : 0
  const rosWoW = percentChange(rosThisWeek, rosLastWeek)

  // Forecast (sum all products for this week)
  const forecastRevenue = forecastRows.reduce(
    (acc, r) => acc + Number(r.revenue),
    0
  )
  const vsForecast =
    forecastRevenue > 0 ? (salesThisWeek / forecastRevenue) * 100 : 0

  // Target (sum all products for this week)
  const targetRevenue = targetRows.reduce(
    (acc, r) => acc + Number(r.revenue),
    0
  )
  const vsTarget =
    targetRevenue > 0 ? (salesThisWeek / targetRevenue) * 100 : 0

  // Risks & Opps
  const openRisks = openRisksAndOpps.filter((r) => r.type === "risk")
  const openOpps = openRisksAndOpps.filter((r) => r.type === "opportunity")

  // -------------------------------------------------------------------------
  // Sparkline data
  // -------------------------------------------------------------------------
  const revenueSparkline = weeklyS.map((w) => ({ value: w.revenue }))
  const unitsSparkline = weeklyS.map((w) => ({ value: w.units }))
  const scanningSparkline = weeklyStoresScanning.map((w) => ({
    value: w.count,
  }))

  // -------------------------------------------------------------------------
  // Helpers for change display
  // -------------------------------------------------------------------------
  function changeType(
    val: number
  ): "positive" | "negative" | "neutral" {
    if (val > 0) return "positive"
    if (val < 0) return "negative"
    return "neutral"
  }

  function changeStr(val: number): string {
    const sign = val > 0 ? "+" : ""
    return `${sign}${val.toFixed(1)}% WoW`
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      {/* KPI cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Sales This Week"
          value={formatCurrency(salesThisWeek)}
          change={changeStr(salesWoW)}
          changeType={changeType(salesWoW)}
        />
        <KpiCard
          title="Units This Week"
          value={formatNumber(unitsThisWeek)}
          change={changeStr(unitsWoW)}
          changeType={changeType(unitsWoW)}
        />
        <KpiCard
          title="Stores Stocking"
          value={formatNumber(stockingCount)}
        />
        <KpiCard
          title="Stores Scanning"
          value={`${formatNumber(scanningCount)} of ${formatNumber(stockingCount)}`}
          change={formatPercent(scanningPct)}
          changeType={scanningPct >= 50 ? "positive" : "negative"}
        />
        <KpiCard
          title="ROS/Store/Week"
          value={formatCurrency(rosThisWeek)}
          change={changeStr(rosWoW)}
          changeType={changeType(rosWoW)}
        />
        <KpiCard
          title="vs Forecast"
          value={formatPercent(vsForecast)}
          changeType={vsForecast >= 100 ? "positive" : "negative"}
          change={vsForecast >= 100 ? "On/above forecast" : "Below forecast"}
        />
        <KpiCard
          title="vs Target"
          value={formatPercent(vsTarget)}
          changeType={vsTarget >= 100 ? "positive" : "negative"}
          change={vsTarget >= 100 ? "On/above target" : "Below target"}
        />
        <KpiCard
          title="Open Risks & Opps"
          value={`${openRisks.length + openOpps.length}`}
          change={`${openRisks.length} risks, ${openOpps.length} opps`}
          changeType="neutral"
        />
      </div>

      {/* 12-week sparklines */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          12-Week Trends
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Weekly Revenue</p>
            <Sparkline data={revenueSparkline} color="#3b82f6" />
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Weekly Units</p>
            <Sparkline data={unitsSparkline} color="#10b981" />
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Weekly Stores Scanning</p>
            <Sparkline data={scanningSparkline} color="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  )
}
