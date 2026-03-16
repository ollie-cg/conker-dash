import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

export default function KpiCard({ title, value, change, changeType = 'neutral' }: KpiCardProps) {
  const changeColor = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    neutral: 'text-slate-500',
  }[changeType]

  const ChangeIcon = {
    positive: ArrowUp,
    negative: ArrowDown,
    neutral: Minus,
  }[changeType]

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm border border-slate-100">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {change && (
        <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${changeColor}`}>
          <ChangeIcon size={14} />
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}
