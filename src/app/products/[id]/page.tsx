import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { parseBootsFilters } from '@/lib/boots-filters'
import { getBootsProductDetail, getBootsDataDateRange } from '@/lib/boots-queries'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { CATEGORY_BG_CLASSES } from '@/lib/boots-categories'
import KpiCard from '@/components/kpi-card'
import TimeRangeSelect from '@/components/time-range-select'
import SalesChart from '@/components/charts/sales-chart'
import MetricToggle from '@/app/metric-toggle'

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const productId = Number(params.id)
  if (isNaN(productId)) notFound()

  const filters = parseBootsFilters(searchParams)
  const { maxDate } = getBootsDataDateRange()
  const metric: 'revenue' | 'units' =
    searchParams.metric === 'units' ? 'units' : 'revenue'

  const { product, summary, weeklyTrend, storeBreakdown } =
    await getBootsProductDetail({ productId, ...filters })

  if (!product.name) notFound()

  // Build query string for back link
  const qs = new URLSearchParams()
  if (typeof searchParams.from === 'string') qs.set('from', searchParams.from)
  if (typeof searchParams.to === 'string') qs.set('to', searchParams.to)
  const backHref = qs.toString() ? `/products?${qs}` : '/products'

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Products
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-medium text-slate-900">{product.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BG_CLASSES[product.category]}`}>
          {product.category}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect maxDate={maxDate} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
        {/* KPI cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard title="Revenue" value={formatCurrency(summary.revenue)} />
          <KpiCard title="Units" value={formatNumber(summary.units)} />
          <KpiCard title="Stores Scanning" value={formatNumber(summary.storesScanning)} />
          <KpiCard title="ROS/Store/Week" value={formatCurrency(summary.ros)} />
          <KpiCard title="ASP" value={formatCurrency(summary.asp)} />
        </div>

        {/* Weekly trend */}
        <div className="mb-8 flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Weekly {metric === 'revenue' ? 'Revenue' : 'Units'}
            </h2>
            <MetricToggle current={metric} />
          </div>
          <div className="h-64">
            <SalesChart data={weeklyTrend} metric={metric} />
          </div>
        </div>

        {/* Store breakdown table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Stores selling this Product</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Store</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Units</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ROS</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">ASP</th>
              </tr>
            </thead>
            <tbody>
              {storeBreakdown.map((row, i) => (
                <tr
                  key={row.storeId}
                  className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {row.name}
                    {row.format === 'online' && (
                      <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                        Online
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(row.units)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.ros)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(row.asp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
