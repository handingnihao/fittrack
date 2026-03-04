"use client"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { MacroSummaryBar } from "@/components/nutrition/MacroSummaryBar"
import { MealSection } from "@/components/nutrition/MealSection"
import { NutritionSkeleton } from "@/components/nutrition/NutritionSkeleton"
import { MEAL_TYPES } from "@/lib/constants"
import { todayStr, formatDateStr } from "@/lib/utils"
import type { FoodLogEntry } from "@/db/schema"
import type { DailySummary, MealType } from "@/types"
import { format, addDays, parseISO } from "date-fns"
import { useRouter } from "next/navigation"

export default function NutritionDatePage({ params }: { params: { date: string } }) {
  const { date: dateStr } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [entries, setEntries] = useState<FoodLogEntry[]>([])

  const isToday = dateStr === todayStr()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/stats/daily-summary?date=${dateStr}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/nutrition?date=${dateStr}`).then((r) => r.json()).catch(() => []),
    ]).then(([sum, ents]) => {
      setSummary(sum)
      setEntries(ents)
      setLoading(false)
    })
  }, [dateStr])

  const navigate = (delta: number) => {
    const newDate = format(addDays(parseISO(dateStr), delta), "yyyy-MM-dd")
    router.push(`/nutrition/${newDate}`)
  }

  const handleAdd = (entry: FoodLogEntry) => {
    setEntries((prev) => [...prev, entry])
    // Refresh summary
    fetch(`/api/stats/daily-summary?date=${dateStr}`)
      .then((r) => r.json())
      .then(setSummary)
  }

  const handleDelete = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    fetch(`/api/stats/daily-summary?date=${dateStr}`)
      .then((r) => r.json())
      .then(setSummary)
  }

  if (loading) return <NutritionSkeleton />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nutrition"
        description={isToday ? "Today" : formatDateStr(dateStr)}
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(`/nutrition/${todayStr()}`)}
              disabled={isToday}
            >
              <Calendar className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)} disabled={isToday}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {summary && <MacroSummaryBar summary={summary} />}

      <div className="space-y-3">
        {MEAL_TYPES.map(({ value }) => (
          <MealSection
            key={value}
            mealType={value as MealType}
            entries={entries.filter((e) => e.mealType === value)}
            dateStr={dateStr}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
