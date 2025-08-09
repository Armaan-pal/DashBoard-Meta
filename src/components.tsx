import React from 'react'

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="progress">
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function KpiCard({ title, value, hint }: { title: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card kpi">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  )
}
