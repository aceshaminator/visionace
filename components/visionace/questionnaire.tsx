"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { questions, type QuestionOption } from "@/lib/health-data"

type QuestionnaireProps = {
  onComplete: (answers: Record<string, QuestionOption>) => void
  onExit: () => void
}

export function Questionnaire({ onComplete, onExit }: QuestionnaireProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, QuestionOption>>({})

  const question = questions[index]
  const selected = answers[question.id]
  const progress = Math.round(((index + (selected ? 1 : 0)) / questions.length) * 100)
  const isLast = index === questions.length - 1

  const choose = (option: QuestionOption) => {
    setAnswers((prev) => ({ ...prev, [question.id]: option }))
  }

  const next = () => {
    if (!selected) return
    if (isLast) {
      onComplete(answers)
      return
    }
    setIndex((i) => i + 1)
  }

  const back = () => {
    if (index === 0) {
      onExit()
      return
    }
    setIndex((i) => i - 1)
  }

  return (
    <div className="flex min-h-full flex-col gap-6 pb-4">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          Question {index + 1} of {questions.length}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Exit questionnaire"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            {question.category}
          </span>
          <h1 className="text-balance text-2xl font-semibold leading-snug text-foreground">{question.prompt}</h1>
          {question.help ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{question.help}</span>
            </p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">{question.prompt}</legend>
          {question.options.map((option) => {
            const isActive = selected?.value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option)}
                aria-pressed={isActive}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="text-base font-medium text-foreground">{option.label}</span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {isActive ? <Check className="size-4" aria-hidden="true" /> : null}
                </span>
              </button>
            )
          })}
        </fieldset>
      </div>

      <Button
        size="lg"
        className="h-14 rounded-2xl text-base font-semibold"
        disabled={!selected}
        onClick={next}
      >
        {isLast ? "Continue to signal check" : "Next question"}
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
