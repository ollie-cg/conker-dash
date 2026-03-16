import { getRegions, getProductsSummary } from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import Filters from '@/components/filters'
import ProductsTable from './products-table'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseFilters(searchParams)

  const [regions, productsSummary] = await Promise.all([
    getRegions(),
    getProductsSummary({
      startDate: filters.startDate,
      endDate: filters.endDate,
      regions: filters.regions.length > 0 ? filters.regions : undefined,
    }),
  ])

  return (
    <>
      <Filters products={[]} regions={regions} hideProducts />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="mt-1 text-sm text-slate-500">
          {productsSummary.length} product{productsSummary.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ProductsTable data={productsSummary} />
    </>
  )
}
