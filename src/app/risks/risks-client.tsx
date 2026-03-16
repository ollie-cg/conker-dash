'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import RiskForm from '@/components/risk-form'
import { deleteRiskOrOpp } from './actions'

interface RiskItem {
  id: number
  productId: number | null
  productName: string | null
  type: string
  title: string
  description: string
  status: string
  createdAt: Date
}

interface RisksClientProps {
  items: RiskItem[]
  products: { id: number; name: string }[]
}

function formatDate(d: Date): string {
  const day = d.getDate()
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function RisksClient({ items, products }: RisksClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RiskItem | null>(null)

  // Read filters from URL
  const currentStatus = searchParams.get('status') ?? 'all'
  const currentType = searchParams.get('type') ?? 'all'
  const currentProduct = searchParams.get('product') ?? 'all'

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  function handleAdd() {
    setEditingItem(null)
    setFormOpen(true)
  }

  function handleEdit(item: RiskItem) {
    setEditingItem(item)
    setFormOpen(true)
  }

  function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteRiskOrOpp(id)
    })
  }

  function handleClose() {
    setFormOpen(false)
    setEditingItem(null)
  }

  // Toggle button helper
  function ToggleGroup({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
  }) {
    return (
      <div className="flex rounded-md border border-slate-200 bg-white">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
              value === opt.value
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Risks &amp; Opportunities</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Filter row */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <ToggleGroup
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ]}
          value={currentStatus}
          onChange={(v) => pushParams({ status: v })}
        />

        <div className="h-6 w-px bg-slate-200" />

        <ToggleGroup
          options={[
            { value: 'all', label: 'All' },
            { value: 'risk', label: 'Risks' },
            { value: 'opportunity', label: 'Opportunities' },
          ]}
          value={currentType}
          onChange={(v) => pushParams({ type: v })}
        />

        <div className="h-6 w-px bg-slate-200" />

        <select
          value={currentProduct}
          onChange={(e) => pushParams({ product: e.target.value })}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-300"
        >
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                  No items found. Try changing your filters or add a new item.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {/* Type badge */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {item.type === 'risk' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <AlertTriangle size={12} />
                        Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <TrendingUp size={12} />
                        Opportunity
                      </span>
                    )}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {item.title}
                  </td>

                  {/* Product */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                    {item.productName ?? 'Brand-level'}
                  </td>

                  {/* Status badge */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {item.status === 'open' ? (
                      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                        Open
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        Closed
                      </span>
                    )}
                  </td>

                  {/* Created date */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                    {formatDate(item.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={isPending}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {formOpen && (
        <RiskForm
          products={products}
          item={
            editingItem
              ? {
                  id: editingItem.id,
                  type: editingItem.type,
                  productId: editingItem.productId,
                  title: editingItem.title,
                  description: editingItem.description,
                  status: editingItem.status,
                }
              : undefined
          }
          onClose={handleClose}
        />
      )}
    </>
  )
}
