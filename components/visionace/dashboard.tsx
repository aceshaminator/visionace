"use client"

import { Activity, ChevronRight, Droplets, HeartPulse, Plus, Thermometer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreRing } from "./score-ring"
import { riskCopy, type HealthCheck } from "@/lib/health-data"

type DashboardProps = {
  checks: HealthCheck[]
  onStartCheck: () => void
  onViewCheck: (check: HealthCheck) => void
}

const vitals = [
  { icon: HeartPulse, label: "Heart rate", value: "74", unit: "bpm" },
  { icon: Thermometer, label: "Temp", value: "36.8", unit: "°C" },
  { icon: Droplets, label: "SpO₂", value: "98", unit: "%" },
]

export function Dashboard({ checks, onStartCheck, onViewCheck }: DashboardProps) {
  const latest = checks[0]
  const risk = riskCopy[latest.risk]

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Good to see you</p>
          <h1 className="text-2xl font-semibold text-foreground">Your health, at a glance</h1>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Activity className="size-5" aria-hidden="true" />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-5">
          <ScoreRing score={latest.score} label="of 100" />
          <div className="flex flex-col gap-1">
            <span className={`text-sm font-semibold ${risk.tone}`}>{risk.label}</span>
            <p className="text-sm leading-relaxed text-muted-foreground">{latest.summary}</p>
            <span className="mt-1 text-xs text-muted-foreground">Last check: {latest.date}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {vitals.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1 rounded-2xl bg-muted/60 px-2 py-3">
              <v.icon className="size-4 text-primary" aria-hidden="true" />
              <span className="text-base font-semibold tabular-nums text-foreground">{v.value}</span>
              <span className="text-[11px] text-muted-foreground">
                {v.label} · {v.unit}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" onClick={onStartCheck}>
        <Plus className="size-5" aria-hidden="true" />
        Start a new health check
      </Button>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent checks</h2>
          <span className="text-xs text-muted-foreground">{checks.length} total</span>
        </div>

        <ul className="flex flex-col gap-2">
          {checks.map((check) => {
            const c = riskCopy[check.risk]
            return (
              <li key={check.id}>
                <button
                  type="button"
                  onClick={() => onViewCheck(check)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{check.score}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${c.tone}`}>{c.label}</span>
                      <span className="text-xs text-muted-foreground">· {check.date}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{check.summary}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
