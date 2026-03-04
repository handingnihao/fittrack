"use client"
import { Quote } from "lucide-react"
import { getDailyQuote } from "@/lib/quotes"

export function MotivationalWidget() {
  const quote = getDailyQuote()

  return (
    <div className="bento-card flex items-start gap-3">
      <Quote className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground italic leading-relaxed">{quote}</p>
    </div>
  )
}
