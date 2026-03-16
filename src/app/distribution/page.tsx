import {
  getProducts,
  getRegions,
  getStoresStocking,
  getStoresScanning,
  getWeeklyStoresScanning,
  getStoresStockingByRegion,
  getStoresScanningByRegion,
  getStoreScanningDetail,
} from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import Filters from '@/components/filters'
import DistributionChart from '@/components/charts/distribution-chart'
import RegionDrillDown from './region-drill-down'

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}

export default async function DistributionPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseFilters(searchParams)
  const selectedRegion =
    typeof searchParams.region === 'string' ? searchParams.region : undefined

  const productIds =
    filters.productIds.length > 0 ? filters.productIds : undefined

  // Fetch all data in parallel
  const [
    products,
    regions,
    stockingTotal,
    scanningTotal,
    weeklyScanning,
    stockingByRegion,
    scanningByRegion,
  ] = await Promise.all([
    getProducts(),
    getRegions(),
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
    getStoresStockingByRegion({ productIds, asOfDate: filters.endDate }),
    getStoresScanningByRegion({
      productIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
  ])

  // If a region is selected, fetch store-level detail
  const storeDetail = selectedRegion
    ? await getStoreScanningDetail({
        productIds,
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: selectedRegion,
      })
    : null

  // Build chart data: stocking is constant across weeks, scanning varies
  const stockingCount = stockingTotal.count
  const chartData = weeklyScanning.map((w) => ({
    weekStart: w.weekStart,
    stocking: stockingCount,
    scanning: w.count,
  }))

  // Build regional table data: merge stocking and scanning by region
  const scanningMap = new Map(
    scanningByRegion.map((r) => [r.region, r.count]),
  )
  const regionalData = stockingByRegion.map((r) => ({
    region: r.region,
    stocking: r.count,
    scanning: scanningMap.get(r.region) ?? 0,
  }))

  // Summary stats
  const scanningCount = scanningTotal.count
  const pctScanning =
    stockingCount > 0 ? ((scanningCount / stockingCount) * 100).toFixed(1) : '0.0'

  return (
    <>
      <Filters
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        regions={regions}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Distribution &amp; Scanning
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatNumber(stockingCount)} stores stocking |{' '}
          {formatNumber(scanningCount)} stores scanning ({pctScanning}%) |{' '}
          {formatDisplayDate(filters.startDate)} &ndash;{' '}
          {formatDisplayDate(filters.endDate)}
        </p>
      </div>

      {/* Stocking vs Scanning chart */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Stores Stocking vs Scanning (Weekly)
        </h2>
        <DistributionChart data={chartData} />
      </div>

      {/* Regional breakdown */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Regional Breakdown
        </h2>
        <RegionDrillDown
          regionalData={regionalData}
          selectedRegion={selectedRegion}
        />
      </div>

      {/* Store-level drill-down */}
      {selectedRegion && storeDetail && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Store Detail &mdash; {selectedRegion}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-600">
                    Store Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-600">
                    Format
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
                    Total Units
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
                    Total Revenue
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-600">
                    Last Scan Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {storeDetail.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No scanning data for stores in {selectedRegion}
                    </td>
                  </tr>
                ) : (
                  storeDetail.map((store, i) => (
                    <tr
                      key={store.storeId}
                      className={`border-b border-slate-100 transition-colors hover:bg-sky-50/40 ${
                        i % 2 === 1 ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {store.storeName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {store.format}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {formatNumber(store.totalUnits)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {'\u00a3' +
                          store.totalRevenue.toLocaleString('en-GB', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {store.lastScanDate
                          ? formatDisplayDate(store.lastScanDate)
                          : '\u2014'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
