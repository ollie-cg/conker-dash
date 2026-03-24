import { parseBootsFilters } from '@/lib/boots-filters'
import { getBootsSkuPerformance, getBootsDataDateRange } from '@/lib/boots-queries'
import { ALL_CATEGORIES, CATEGORY_COLOURS } from '@/lib/boots-categories'
import TimeRangeSelect from '@/components/time-range-select'
import BootsSkuTable from '@/components/tables/boots-sku-table'
import CategoryBarChart from '@/components/charts/category-bar-chart'
import ProductTreemapChart from '@/components/charts/product-treemap-chart'

export default async function BootsProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const { maxDate } = getBootsDataDateRange()

  const skuData = await getBootsSkuPerformance({
    startDate: filters.startDate,
    endDate: filters.endDate,
  })

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <h1 className="text-sm font-medium text-slate-900">Products</h1>
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect maxDate={maxDate} />
        </div>
      </div>

      {/* Split layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left: scrollable table */}
        <div className="min-h-0 flex-1 overflow-y-auto border-r border-slate-200">
          <BootsSkuTable data={skuData} />
        </div>

        {/* Right: charts */}
        <div className="flex min-h-0 flex-1 flex-col p-6">
          {/* Revenue by category */}
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Revenue by Category
          </h2>
          <div className="h-48 flex-shrink-0">
            <CategoryBarChart data={skuData} />
          </div>

          {/* Revenue by product treemap */}
          <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-700">
            Revenue by Product
          </h2>
          <div className="min-h-0 flex-1">
            <ProductTreemapChart data={skuData} />
          </div>

          {/* Shared colour key */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOURS[cat] }}
                />
                <span className="text-xs text-slate-500">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
