'use client'

import { useRef, useState, useTransition } from 'react'
import { createRiskOrOpp, updateRiskOrOpp } from '@/app/risks/actions'
import { X } from 'lucide-react'

interface RiskFormProps {
  products: { id: number; name: string }[]
  item?: {
    id: number
    type: string
    productId: number | null
    title: string
    description: string
    status: string
  }
  onClose: () => void
}

export default function RiskForm({ products, item, onClose }: RiskFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState(item?.type ?? 'risk')
  const [status, setStatus] = useState(item?.status ?? 'open')

  const isEditing = !!item

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEditing) {
        await updateRiskOrOpp(item!.id, formData)
      } else {
        await createRiskOrOpp(formData)
      }
      onClose()
    })
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit' : 'Add'} {type === 'risk' ? 'Risk' : 'Opportunity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          action={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 space-y-5 px-6 py-5">
            {/* Type */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Type</legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="risk"
                    checked={type === 'risk'}
                    onChange={() => setType('risk')}
                    className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  Risk
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="opportunity"
                    checked={type === 'opportunity'}
                    onChange={() => setType('opportunity')}
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Opportunity
                </label>
              </div>
            </fieldset>

            {/* Product */}
            <div>
              <label htmlFor="productId" className="mb-1 block text-sm font-medium text-slate-700">
                Product
              </label>
              <select
                id="productId"
                name="productId"
                defaultValue={item?.productId?.toString() ?? ''}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              >
                <option value="">None (brand-level)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={item?.title ?? ''}
                placeholder="Brief summary..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                defaultValue={item?.description ?? ''}
                placeholder="Details..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>

            {/* Status */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Status</legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="open"
                    checked={status === 'open'}
                    onChange={() => setStatus('open')}
                    className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Open
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="closed"
                    checked={status === 'closed'}
                    onChange={() => setStatus('closed')}
                    className="h-4 w-4 border-slate-300 text-slate-600 focus:ring-slate-500"
                  />
                  Closed
                </label>
              </div>
            </fieldset>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
