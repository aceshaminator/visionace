import { cn } from "@/lib/utils"

type ScoreRingProps = {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

const ringColor = (score: number) => {
  if (score >= 75) return "oklch(0.7 0.14 155)"
  if (score >= 55) return "oklch(0.78 0.15 80)"
  return "oklch(0.62 0.2 25)"
}

export function ScoreRing({ score, size = 128, strokeWidth = 12, label, className }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Health score ${clamped} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor(clamped)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{clamped}</span>
        {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  )
}
