"use client"
import { useState, useEffect } from "react"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ScheduleEntry {
  id: number
  routine_id: number
  day_of_week: number
  routine_name: string
  routine_color: string
}

interface RoutineScheduleMap {
  [routineId: number]: {
    name: string
    color: string
    days: Set<number>
  }
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]
const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function SchedulePanel() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [routines, setRoutines] = useState<{ id: number; name: string; color: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule").then((r) => r.json()).catch(() => []),
      fetch("/api/routines").then((r) => r.json()).catch(() => []),
    ]).then(([s, r]) => {
      setEntries(Array.isArray(s) ? s : [])
      if (Array.isArray(r)) setRoutines(r.map((x: any) => ({ id: x.id, name: x.name, color: x.color })))
    })
  }, [])

  // Build map: routineId → days
  const scheduleMap: RoutineScheduleMap = {}
  for (const r of routines) {
    scheduleMap[r.id] = { name: r.name, color: r.color, days: new Set() }
  }
  for (const e of entries) {
    if (scheduleMap[e.routine_id]) {
      scheduleMap[e.routine_id].days.add(e.day_of_week)
    }
  }

  async function toggleDay(routineId: number, day: number, currentlyEnabled: boolean) {
    setSaving(true)
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId, dayOfWeek: day, enabled: !currentlyEnabled }),
      })

      // Update local state
      if (!currentlyEnabled) {
        setEntries((prev) => [
          ...prev,
          { id: Date.now(), routine_id: routineId, day_of_week: day, routine_name: routines.find((r) => r.id === routineId)?.name ?? "", routine_color: routines.find((r) => r.id === routineId)?.color ?? "" }
        ])
      } else {
        setEntries((prev) => prev.filter((e) => !(e.routine_id === routineId && e.day_of_week === day)))
      }
    } catch {
      toast.error("Failed to update schedule")
    } finally {
      setSaving(false)
    }
  }

  if (routines.length === 0) {
    return (
      <div className="bento-card space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Workout Schedule</h3>
        </div>
        <p className="text-xs text-muted-foreground">Create routines first to schedule them.</p>
      </div>
    )
  }

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Workout Schedule</h3>
      </div>

      <div className="space-y-4">
        {routines.map((r) => {
          const rSchedule = scheduleMap[r.id]
          return (
            <div key={r.id}>
              <p className="text-xs font-medium mb-2" style={{ color: r.color }}>{r.name}</p>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, day) => {
                  const enabled = rSchedule?.days.has(day) ?? false
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(r.id, day, enabled)}
                      disabled={saving}
                      title={DAY_FULL[day]}
                      className={cn(
                        "w-8 h-8 rounded-full text-xs font-medium transition-all",
                        enabled
                          ? "text-white"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                      style={enabled ? { backgroundColor: r.color } : {}}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
