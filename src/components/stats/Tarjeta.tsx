import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  accent?: string
}

export default function Tarjeta({ icon, label, value, accent = 'text-institutional-navy' }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-institutional-slate font-medium">{label}</p>
          <p className="text-xl md:text-2xl font-bold text-text-main mt-1">{value}</p>
        </div>
        <div className={`p-2.5 md:p-3 rounded-lg bg-background-light ${accent}`}>{icon}</div>
      </div>
    </div>
  )
}
