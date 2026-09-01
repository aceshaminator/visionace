"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, Check, Fingerprint, Loader2, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SensorReading } from "@/lib/health-data"

type SensorCaptureProps = {
  onComplete: (readings: SensorReading[]) => void
  onBack: () => void
}

type Phase = "idle" | "scanning" | "done"

const buildReadings = (): SensorReading[] => [
  { id: "hr", label: "Heart rate", unit: "bpm", value: 68 + Math.round(Math.random() * 24), min: 60, max: 100 },
  { id: "spo2", label: "Blood oxygen", unit: "%", value: 95 + Math.round(Math.random() * 4), min: 95, max: 100 },
  { id: "resp", label: "Respiration", unit: "/min", value: 12 + Math.round(Math.random() * 8), min: 12, max: 20 },
]

export function SensorCapture({ onComplete, onBack }: SensorCaptureProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState(0)
  const [readings, setReadings] = useState<SensorReading[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  const startScan = () => {
    setPhase("scanning")
    setProgress(0)
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (timer.current) clearInterval(timer.current)
          setReadings(buildReadings())
          setPhase("done")
          return 100
        }
        return p + 4
      })
    }, 90)
  }

  return (
    <div className="flex min-h-full flex-col gap-6 pb-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Signal check</h1>
          <p className="text-sm text-muted-foreground">Capture physical signals</p>
        </div>
      </header>

      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center">
        <div
          className={`relative flex size-44 items-center justify-center overflow-hidden rounded-full border-4 transition-colors ${
            phase === "done" ? "border-primary bg-primary/5" : "border-dashed border-primary/40 bg-muted/50"
          }`}
        >
          {phase === "scanning" ? (
            <>
              <span className="absolute inset-x-6 h-0.5 animate-pulse bg-primary" style={{ top: `${progress}%` }} />
              <Loader2 className="size-12 animate-spin text-primary" aria-hidden="true" />
            </>
          ) : phase === "done" ? (
            <Check className="size-16 text-primary" aria-hidden="true" />
          ) : (
            <Fingerprint className="size-16 text-primary/70" aria-hidden="true" />
          )}
        </div>

        {phase === "idle" ? (
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">Place fingertip over the camera</p>
            <p className="text-sm text-muted-foreground">
              Hold steady while VisionAce reads your pulse and oxygen signal. This is a demo capture.
            </p>
          </div>
        ) : phase === "scanning" ? (
          <p className="text-base font-medium text-foreground tabular-nums">Reading signals… {progress}%</p>
        ) : (
          <p className="text-base font-medium text-primary">Capture complete</p>
        )}
      </div>

      {phase === "done" ? (
        <ul className="grid grid-cols-3 gap-3">
          {readings.map((r) => (
            <li key={r.id} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-2 py-3 text-center">
              <span className="text-lg font-semibold tabular-nums text-foreground">{r.value}</span>
              <span className="text-[11px] text-muted-foreground">
                {r.label}
                <br />
                {r.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <ScanLine className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span>No wearable needed — VisionAce estimates vitals from your device camera.</span>
        </div>
      )}

      {phase === "idle" ? (
        <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" onClick={startScan}>
          <Camera className="size-5" aria-hidden="true" />
          Begin signal capture
        </Button>
      ) : phase === "done" ? (
        <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" onClick={() => onComplete(readings)}>
          See my results
        </Button>
      ) : (
        <Button size="lg" className="h-14 rounded-2xl text-base font-semibold" disabled>
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Capturing…
        </Button>
      )}
    </div>
  )
}
