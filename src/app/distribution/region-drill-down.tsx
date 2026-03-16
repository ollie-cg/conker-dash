'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import DistributionTable from '@/components/tables/distribution-table'

interface RegionDrillDownProps {
  regionalData: { region: string; stocking: number; scanning: number }[]
  selectedRegion?: string
}

export default function RegionDrillDown({
  regionalData,
  selectedRegion,
}: RegionDrillDownProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleRegionClick(region: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedRegion === region) {
      // Toggle off if clicking the same region
      params.delete('region')
    } else {
      params.set('region', region)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <>
      {selectedRegion && (
        <p className="mb-2 text-xs text-slate-500">
          Showing detail for{' '}
          <span className="font-semibold text-slate-700">{selectedRegion}</span>.{' '}
          <button
            type="button"
            onClick={() => handleRegionClick(selectedRegion)}
            className="text-sky-600 underline hover:text-sky-700"
          >
            Clear selection
          </button>
        </p>
      )}
      <DistributionTable
        data={regionalData}
        onRegionClick={handleRegionClick}
      />
    </>
  )
}
