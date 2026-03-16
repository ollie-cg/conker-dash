import {
  getProducts,
  getRegions,
  getSalesByDay,
  getSalesByRegion,
  getSalesForPeriod,
} from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import Filters from '@/components/filters'
import SalesChart from '@/components/charts/sales-chart'
import SalesTable from '@/components/tables/sales-table'
import MetricToggle from './metric-toggle'

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
  return '\u00a3' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseFilters(searchParams)
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  const [products, regions, dailySales, regionalSales, periodSummary] =
    await Promise.all([
      getProducts(),
      getRegions(),
      getSalesByDay({
        productIds: filters.productIds.length > 0 ? filters.productIds : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      getSalesByRegion({
        productIds: filters.productIds.length > 0 ? filters.productIds : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      getSalesForPeriod({
        productIds: filters.productIds.length > 0 ? filters.productIds : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ])

  return (
    <>
      <Filters
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        regions={regions}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
        <p className="mt-1 text-sm text-slate-500">
          Total: {formatCurrency(periodSummary.totalRevenue)} | {formatNumber(periodSummary.totalUnits)} units | {formatDisplayDate(filters.startDate)} &ndash; {formatDisplayDate(filters.endDate)}
        </p>
      </div>

      {/* Chart section */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Daily {metric === 'revenue' ? 'Revenue' : 'Units'}
          </h2>
          <MetricToggle current={metric} />
        </div>
        <SalesChart data={dailySales} metric={metric} />
      </div>

      {/* Regional breakdown */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Regional Breakdown
        </h2>
        <SalesTable data={regionalSales} />
      </div>
    </>
  )
}
