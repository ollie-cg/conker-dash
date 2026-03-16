import {
  getProducts,
  getRegions,
  getWeeklySales,
  getStoresStocking,
  getWeeklyStoresScanning,
  getSalesByRegion,
  getStoresStockingByRegion,
  getStoresScanningByRegion,
  getSalesForPeriod,
  getStoresScanning,
} from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import Filters from '@/components/filters'
import RosChart from '@/components/charts/ros-chart'
import RosTable from '@/components/tables/ros-table'

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatCurrency(value: number): string {
  return (
    '\u00a3' +
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

/** Calculate the number of weeks spanned by a date range (at least 1). */
function calcWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const diffMs = end.getTime() - start.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.max(1, Math.round(diffDays / 7))
}

export default async function RateOfSalePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseFilters(searchParams)
  const productIds =
    filters.productIds.length > 0 ? filters.productIds : undefined

  const numWeeks = calcWeeks(filters.startDate, filters.endDate)

  // Fetch all data in parallel
  const [
    products,
    regions,
    weeklySales,
    stockingTotal,
    scanningTotal,
    weeklyScanning,
    salesByRegion,
    stockingByRegion,
    scanningByRegion,
    periodSummary,
  ] = await Promise.all([
    getProducts(),
    getRegions(),
    getWeeklySales({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    getStoresStocking({ productIds, asOfDate: filters.endDate }),
    getStoresScanning({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    getWeeklyStoresScanning({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    getSalesByRegion({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    getStoresStockingByRegion({ productIds, asOfDate: filters.endDate }),
    getStoresScanningByRegion({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    getSalesForPeriod({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
  ])

  // ---- Chart data: weekly ROS ----
  // Stocking count is constant across weeks
  const stockingCount = stockingTotal.count
  const weeklyScanningMap = new Map(
    weeklyScanning.map((w) => [w.weekStart, w.count]),
  )

  const chartData = weeklySales.map((w) => {
    const scanningCount = weeklyScanningMap.get(w.weekStart) ?? 0
    return {
      weekStart: w.weekStart,
      rosStocking: stockingCount > 0 ? w.revenue / stockingCount : 0,
      rosScanning: scanningCount > 0 ? w.revenue / scanningCount : 0,
    }
  })

  // ---- Regional table data ----
  const stockingByRegionMap = new Map(
    stockingByRegion.map((r) => [r.region, r.count]),
  )
  const scanningByRegionMap = new Map(
    scanningByRegion.map((r) => [r.region, r.count]),
  )

  const tableData = salesByRegion.map((r) => {
    const regionStocking = stockingByRegionMap.get(r.region) ?? 0
    const regionScanning = scanningByRegionMap.get(r.region) ?? 0
    return {
      region: r.region,
      rosStocking:
        regionStocking > 0 ? r.revenue / regionStocking / numWeeks : 0,
      rosScanning:
        regionScanning > 0 ? r.revenue / regionScanning / numWeeks : 0,
      storesStocking: regionStocking,
      storesScanning: regionScanning,
    }
  })

  // ---- Overall ROS summary ----
  const overallRosStocking =
    stockingCount > 0 && numWeeks > 0
      ? periodSummary.totalRevenue / stockingCount / numWeeks
      : 0
  const totalScanningCount = scanningTotal.count
  const overallRosScanning =
    totalScanningCount > 0 && numWeeks > 0
      ? periodSummary.totalRevenue / totalScanningCount / numWeeks
      : 0

  return (
    <>
      <Filters
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        regions={regions}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Rate of Sale</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overall ROS: {formatCurrency(overallRosStocking)}/store/week
          (stocking) | {formatCurrency(overallRosScanning)}/store/week
          (scanning) | {formatDisplayDate(filters.startDate)} &ndash;{' '}
          {formatDisplayDate(filters.endDate)}
        </p>
      </div>

      {/* ROS trend chart */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Weekly Rate of Sale ({'\u00a3'}/store/week)
        </h2>
        <RosChart data={chartData} />
      </div>

      {/* Regional ROS comparison */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Regional ROS Comparison
        </h2>
        <RosTable data={tableData} />
      </div>
    </>
  )
}
