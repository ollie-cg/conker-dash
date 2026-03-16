import { getRisksAndOpps, getProducts } from '@/lib/queries'
import RisksClient from './risks-client'

export default async function RisksPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Parse filter params
  const statusParam = typeof searchParams.status === 'string' ? searchParams.status : undefined
  const typeParam = typeof searchParams.type === 'string' ? searchParams.type : undefined
  const productParam = typeof searchParams.product === 'string' ? searchParams.product : undefined

  // Build query filters (only pass non-"all" values)
  const queryFilters: { status?: string; type?: string; productId?: number } = {}
  if (statusParam && statusParam !== 'all') {
    queryFilters.status = statusParam
  }
  if (typeParam && typeParam !== 'all') {
    queryFilters.type = typeParam
  }
  if (productParam && productParam !== 'all') {
    const pid = parseInt(productParam, 10)
    if (!isNaN(pid)) {
      queryFilters.productId = pid
    }
  }

  const [items, products] = await Promise.all([
    getRisksAndOpps(Object.keys(queryFilters).length > 0 ? queryFilters : undefined),
    getProducts(),
  ])

  return (
    <RisksClient
      items={items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        createdAt: item.createdAt,
      }))}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}
