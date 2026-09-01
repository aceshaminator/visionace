"use client"

import { Plus, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { riskCopy, type HealthCheck } from "@/lib/health-data"

type HistoryScreenProps = {
  checks: HealthCheck[]
  onStartCheck: () => void
}

export function HistoryScreen({ checks, onStartCheck }: HistoryScreenProps) {
  const average = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Check history</h1>
        <p className="text-sm text-muted-foreground">Track how your health signals change over time.</p>
      </header>

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <TrendingUp className="size-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Average score</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{average}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">All checks</h2>
        <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
          {checks.map((check) => {
            const c = riskCopy[check.risk]
            return (
              <li key={check.id} className="relative">
                <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${c.tone}`}>{c.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{check.score}/100</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{check.summary}</p>
                  <span className="mt-2 block text-xs text-muted-foreground">{check.date}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" onClick={onStartCheck}>
        <Plus className="size-5" aria-hidden="true" />
        Start a new health check
      </Button>
    </div>
  )
}
