"use client"

import { useState } from "react"
import { ClipboardList, Home } from "lucide-react"
import { Dashboard } from "./dashboard"
import { Questionnaire } from "./questionnaire"
import { SensorCapture } from "./sensor-capture"
import { Results } from "./results"
import { HistoryScreen } from "./history-screen"
import { recentChecks, type QuestionOption, type SensorReading } from "@/lib/health-data"

type Tab = "home" | "history"
type Flow = "none" | "questionnaire" | "sensor" | "results"

export function VisionAceApp() {
  const [tab, setTab] = useState<Tab>("home")
  const [flow, setFlow] = useState<Flow>("none")
  const [answers, setAnswers] = useState<Record<string, QuestionOption>>({})
  const [readings, setReadings] = useState<SensorReading[]>([])

  const startCheck = () => {
    setAnswers({})
    setReadings([])
    setFlow("questionnaire")
  }

  const exitFlow = () => setFlow("none")

  const inFlow = flow !== "none"

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <main className="flex flex-1 flex-col px-5 pt-6" style={{ paddingBottom: inFlow ? "1.5rem" : "6rem" }}>
        {inFlow ? (
          <>
            {flow === "questionnaire" ? (
              <Questionnaire
                onComplete={(a) => {
                  setAnswers(a)
                  setFlow("sensor")
                }}
                onExit={exitFlow}
              />
            ) : null}
            {flow === "sensor" ? (
              <SensorCapture
                onComplete={(r) => {
                  setReadings(r)
                  setFlow("results")
                }}
                onBack={() => setFlow("questionnaire")}
              />
            ) : null}
            {flow === "results" ? (
              <Results
                answers={answers}
                readings={readings}
                onDone={() => {
                  setFlow("none")
                  setTab("home")
                }}
                onRestart={startCheck}
              />
            ) : null}
          </>
        ) : tab === "home" ? (
          <Dashboard
            checks={recentChecks}
            onStartCheck={startCheck}
            onViewCheck={() => setTab("history")}
          />
        ) : (
          <HistoryScreen checks={recentChecks} onStartCheck={startCheck} />
        )}
      </main>

      {!inFlow ? (
        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-border bg-card/95 backdrop-blur">
          <ul className="flex items-stretch justify-around px-4 py-2">
            <NavButton active={tab === "home"} onClick={() => setTab("home")} icon={Home} label="Home" />
            <NavButton active={tab === "history"} onClick={() => setTab("history")} icon={ClipboardList} label="History" />
          </ul>
        </nav>
      ) : null}
    </div>
  )
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Home
  label: string
}) {
  return (
    <li className="flex-1">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex w-full flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="size-5" aria-hidden="true" />
        {label}
      </button>
    </li>
  )
}
