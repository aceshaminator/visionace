export type RiskLevel = "low" | "moderate" | "elevated"

export type HealthCheck = {
  id: string
  date: string
  score: number
  risk: RiskLevel
  summary: string
}

export type QuestionOption = {
  label: string
  value: string
  /** weight added to the risk score when selected */
  weight: number
}

export type Question = {
  id: string
  category: string
  prompt: string
  help?: string
  options: QuestionOption[]
}

export type SensorReading = {
  id: string
  label: string
  unit: string
  value: number
  min: number
  max: number
}

export const recentChecks: HealthCheck[] = [
  {
    id: "chk-3",
    date: "Today",
    score: 82,
    risk: "low",
    summary: "Vitals stable. No new warning signs reported.",
  },
  {
    id: "chk-2",
    date: "3 days ago",
    score: 68,
    risk: "moderate",
    summary: "Mild fatigue and slightly elevated temperature.",
  },
  {
    id: "chk-1",
    date: "1 week ago",
    score: 74,
    risk: "moderate",
    summary: "Occasional cough, hydration reminder issued.",
  },
]

export const questions: Question[] = [
  {
    id: "q-fever",
    category: "General",
    prompt: "Have you had a fever in the last 48 hours?",
    help: "A fever is a body temperature above 38°C (100.4°F).",
    options: [
      { label: "No fever", value: "none", weight: 0 },
      { label: "Mild (felt warm)", value: "mild", weight: 8 },
      { label: "High or persistent", value: "high", weight: 20 },
    ],
  },
  {
    id: "q-breathing",
    category: "Respiratory",
    prompt: "How is your breathing today?",
    help: "Think about rest as well as light activity like walking.",
    options: [
      { label: "Normal", value: "normal", weight: 0 },
      { label: "Short of breath when active", value: "active", weight: 12 },
      { label: "Short of breath at rest", value: "rest", weight: 24 },
    ],
  },
  {
    id: "q-energy",
    category: "General",
    prompt: "How are your energy levels?",
    options: [
      { label: "Normal", value: "normal", weight: 0 },
      { label: "A bit tired", value: "tired", weight: 6 },
      { label: "Exhausted / unable to do daily tasks", value: "exhausted", weight: 16 },
    ],
  },
  {
    id: "q-hydration",
    category: "Nutrition",
    prompt: "Are you able to keep fluids and food down?",
    options: [
      { label: "Yes, normally", value: "normal", weight: 0 },
      { label: "Reduced appetite", value: "reduced", weight: 6 },
      { label: "Unable to keep fluids down", value: "none", weight: 18 },
    ],
  },
  {
    id: "q-pain",
    category: "Symptoms",
    prompt: "Are you experiencing chest pain or pressure?",
    help: "Chest pain can be an important early warning sign.",
    options: [
      { label: "No", value: "none", weight: 0 },
      { label: "Mild discomfort", value: "mild", weight: 10 },
      { label: "Yes, noticeable pain", value: "yes", weight: 26 },
    ],
  },
]

export function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return "low"
  if (score >= 55) return "moderate"
  return "elevated"
}

export const riskCopy: Record<RiskLevel, { label: string; tone: string; description: string }> = {
  low: {
    label: "Low concern",
    tone: "text-emerald-600",
    description: "Your responses suggest no urgent warning signs right now.",
  },
  moderate: {
    label: "Monitor closely",
    tone: "text-amber-600",
    description: "A few signs are worth watching. Recheck if things change.",
  },
  elevated: {
    label: "Seek care soon",
    tone: "text-red-600",
    description: "Your responses suggest you should speak with a health worker.",
  },
}
