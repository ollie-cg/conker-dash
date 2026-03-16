import { getProducts, getRegions } from '@/lib/queries'
import Filters from '@/components/filters'

export default async function SalesPage() {
  const [products, regions] = await Promise.all([getProducts(), getRegions()])

  return (
    <>
      <Filters
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        regions={regions}
      />
      <h1 className="text-2xl font-bold">Sales</h1>
    </>
  )
}
