"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
  type BootsCategory,
  ALL_CATEGORIES,
  CATEGORY_BG_CLASSES,
  CATEGORY_COLOURS,
} from "@/lib/boots-categories"

interface BootsHeatmapProps {
  stores: { storeId: number; name: string; totalRevenue: number }[]
  products: { productId: number; name: string; category: BootsCategory }[]
  cells: [string, { revenue: number; units: number }][]
}

function formatCurrency(value: number): string {
  return "\u00a3" + value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-GB")
}

/** Strip Boots code prefix (e.g. "12345 - Some Name" -> "Some Name") and truncate */
function truncateProductName(name: string, maxLen: number = 20): string {
  const stripped = name.replace(/^\d+\s*-\s*/, "")
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + "\u2026" : stripped
}

export default function BootsHeatmap({ stores, products, cells }: BootsHeatmapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<BootsCategory>>(
    () => new Set(ALL_CATEGORIES),
  )
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    storeName: string
    productName: string
    revenue: number
    units: number
  } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Reconstruct Map from serialised entries
  const cellMap = useMemo(
    () => new Map(cells),
    [cells],
  )

  // Filter products by active categories
  const filteredProducts = useMemo(
    () => products.filter((p) => activeCategories.has(p.category)),
    [products, activeCategories],
  )

  // Find max revenue for colour scaling
  const maxRevenue = useMemo(() => {
    let max = 0
    for (const [, cell] of cells) {
      if (cell.revenue > max) max = cell.revenue
    }
    return max
  }, [cells])

  const toggleCategory = useCallback((cat: BootsCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  const handleCellMouseMove = useCallback(
    (
      e: React.MouseEvent,
      storeName: string,
      productName: string,
      revenue: number,
      units: number,
    ) => {
      setTooltip({
        x: e.clientX + 12,
        y: e.clientY + 12,
        storeName,
        productName,
        revenue,
        units,
      })
    },
    [],
  )

  const handleCellMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div>
      {/* Category filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggleCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategories.has(cat)
                ? CATEGORY_BG_CLASSES[cat]
                : "bg-slate-50 text-slate-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Heatmap table */}
      <div
        ref={tableRef}
        className="overflow-x-auto rounded-lg border border-slate-200"
      >
        <table className="text-xs">
          <thead>
            <tr>
              {/* Corner cell */}
              <th className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-white px-3 py-2 text-left font-medium text-slate-600">
                Store
              </th>
              {filteredProducts.map((product) => (
                <th
                  key={product.productId}
                  className="min-w-[40px] border-b border-slate-100 px-1 py-2 font-medium text-slate-600"
                  style={{
                    backgroundColor: CATEGORY_COLOURS[product.category] + "15",
                  }}
                >
                  <div
                    className="mx-auto whitespace-nowrap"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      maxHeight: "140px",
                    }}
                    title={product.name}
                  >
                    {truncateProductName(product.name)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store, i) => (
              <tr
                key={store.storeId}
                className={i % 2 === 1 ? "bg-slate-50/30" : ""}
              >
                <td className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                  {store.name}
                </td>
                {filteredProducts.map((product) => {
                  const key = `${store.storeId}-${product.productId}`
                  const cell = cellMap.get(key)
                  const revenue = cell?.revenue ?? 0
                  const units = cell?.units ?? 0
                  const alpha =
                    revenue > 0 && maxRevenue > 0
                      ? 0.1 + (revenue / maxRevenue) * 0.7
                      : 0

                  return (
                    <td
                      key={product.productId}
                      className="min-w-[40px] border-b border-slate-50 px-1 py-1.5"
                      style={
                        revenue > 0
                          ? { backgroundColor: `rgba(59, 130, 246, ${alpha})` }
                          : undefined
                      }
                      onMouseMove={(e) =>
                        handleCellMouseMove(
                          e,
                          store.name,
                          product.name,
                          revenue,
                          units,
                        )
                      }
                      onMouseLeave={handleCellMouseLeave}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-slate-900">{tooltip.storeName}</div>
          <div className="text-slate-600">{tooltip.productName}</div>
          <div className="mt-1 flex gap-3">
            <span className="text-slate-500">
              Revenue: <span className="font-medium text-slate-700">{formatCurrency(tooltip.revenue)}</span>
            </span>
            <span className="text-slate-500">
              Units: <span className="font-medium text-slate-700">{formatNumber(tooltip.units)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
