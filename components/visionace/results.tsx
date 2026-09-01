"use client"

import { AlertTriangle, CheckCircle2, Home, Phone, RefreshCw, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreRing } from "./score-ring"
import {
  questions,
  riskCopy,
  riskFromScore,
  type QuestionOption,
  type RiskLevel,
  type SensorReading,
} from "@/lib/health-data"

type ResultsProps = {
  answers: Record<string, QuestionOption>
  readings: SensorReading[]
  onDone: () => void
  onRestart: () => void
}

const nextSteps: Record<RiskLevel, { icon: typeof Home; text: string }[]> = {
  low: [
    { icon: CheckCircle2, text: "Keep up your routine — rest, fluids, and balanced meals." },
    { icon: RefreshCw, text: "Recheck in a few days or if new symptoms appear." },
  ],
  moderate: [
    { icon: RefreshCw, text: "Recheck your symptoms in 12–24 hours." },
    { icon: Stethoscope, text: "Rest, stay hydrated, and monitor your temperature." },
    { icon: Phone, text: "Contact a community health worker if symptoms worsen." },
  ],
  elevated: [
    { icon: Phone, text: "Reach out to a health worker or clinic today." },
    { icon: Stethoscope, text: "Do not wait — seek in-person care if you feel worse." },
    { icon: RefreshCw, text: "Keep this summary to share with your provider." },
  ],
}

export function Results({ answers, readings, onDone, onRestart }: ResultsProps) {
  const answerPenalty = Object.values(answers).reduce((sum, a) => sum + a.weight, 0)
  const sensorPenalty = readings.reduce(
    (sum, r) => (r.value < r.min || r.value > r.max ? sum + 8 : sum),
    0,
  )
  const score = Math.max(5, 100 - answerPenalty - sensorPenalty)
  const risk = riskFromScore(score)
  const copy = riskCopy[risk]

  const flagged = questions
    .filter((q) => answers[q.id] && answers[q.id].weight > 0)
    .map((q) => ({ prompt: q.prompt, answer: answers[q.id].label, severe: answers[q.id].weight >= 16 }))

  const abnormalReadings = readings.filter((r) => r.value < r.min || r.value > r.max)

  return (
    <div className="flex flex-col gap-6 pb-4">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <ScoreRing score={score} size={144} label="of 100" />
        <div className="flex flex-col gap-1">
          <span className={`text-lg font-semibold ${copy.tone}`}>{copy.label}</span>
          <p className="max-w-xs text-pretty text-sm text-muted-foreground">{copy.description}</p>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">What we noticed</h2>
        {flagged.length === 0 && abnormalReadings.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            No warning signs stood out in this check.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {flagged.map((f) => (
              <li key={f.prompt} className="flex items-start gap-2.5 text-sm">
                <AlertTriangle
                  className={`mt-0.5 size-4 shrink-0 ${f.severe ? "text-red-600" : "text-amber-600"}`}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{f.answer}</span> — {f.prompt}
                </span>
              </li>
            ))}
            {abnormalReadings.map((r) => (
              <li key={r.id} className="flex items-start gap-2.5 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {r.label} {r.value}
                    {r.unit}
                  </span>{" "}
                  is outside the typical range ({r.min}–{r.max}
                  {r.unit}).
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Recommended next steps</h2>
        <ul className="flex flex-col gap-2">
          {nextSteps[risk].map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-4.5" aria-hidden="true" />
              </div>
              <span className="text-sm text-foreground">{step.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {risk === "elevated" ? (
        <a
          href="tel:112"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 text-base font-semibold text-white transition-colors hover:bg-red-700"
        >
          <Phone className="size-5" aria-hidden="true" />
          Call for help
        </a>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" onClick={onDone}>
          <Home className="size-5" aria-hidden="true" />
          Back to dashboard
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-12 rounded-2xl text-sm font-medium text-muted-foreground"
          onClick={onRestart}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Run another check
        </Button>
      </div>

      <p className="text-pretty text-center text-xs text-muted-foreground">
        VisionAce provides general guidance and does not replace professional medical advice.
      </p>
    </div>
  )
}
