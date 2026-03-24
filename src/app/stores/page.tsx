import { parseBootsFilters } from "@/lib/boots-filters"
import { getBootsStorePerformance, getBootsDataDateRange } from "@/lib/boots-queries"
import TimeRangeSelect from "@/components/time-range-select"
import BootsStoreTable from "@/components/tables/boots-store-table"

export default async function BootsStoresPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const filters = parseBootsFilters(searchParams)
  const { maxDate } = getBootsDataDateRange()
  const storeData = await getBootsStorePerformance(filters)

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <h1 className="text-sm font-medium text-slate-900">Stores</h1>
        <div className="ml-auto flex items-center gap-2">
          <TimeRangeSelect maxDate={maxDate} />
        </div>
      </div>

      {/* Store table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <BootsStoreTable data={storeData} />
      </div>
    </>
  )
}
