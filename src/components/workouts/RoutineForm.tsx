"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExerciseSelector } from "./ExerciseSelector"
import { ROUTINE_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Exercise } from "@/db/schema"
import type { RoutineWithExercises } from "@/types"

interface RoutineExerciseSlot {
  exerciseId: number
  exerciseName: string
  category: string
  defaultSets: number
  defaultRepsMin: number
  defaultRepsMax: number
  defaultWeightKg: number | null
  restSeconds: number
  routineExerciseId?: number
  // Cardio fields
  defaultDurationSec: number | null
  defaultDistanceM: number | null
  defaultSpeedMph: number | null
  defaultIncline: number | null
  defaultResistance: number | null
}

interface Props {
  routine?: RoutineWithExercises
}

function formatDuration(sec: number | null): string {
  if (!sec) return ""
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function parseDuration(str: string): number | null {
  if (!str.trim()) return null
  const parts = str.split(":")
  if (parts.length === 2) {
    const sec = parseInt(parts[0]) * 60 + parseInt(parts[1])
    return isNaN(sec) ? null : sec
  }
  const sec = parseInt(str)
  return isNaN(sec) ? null : sec
}

export function RoutineForm({ routine }: Props) {
  const router = useRouter()
  const [name, setName] = useState(routine?.name ?? "")
  const [description, setDescription] = useState(routine?.description ?? "")
  const [color, setColor] = useState(routine?.color ?? ROUTINE_COLORS[0])
  const [exercises, setExercises] = useState<RoutineExerciseSlot[]>(
    routine?.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      category: e.category,
      defaultSets: e.defaultSets,
      defaultRepsMin: e.defaultRepsMin,
      defaultRepsMax: e.defaultRepsMax,
      defaultWeightKg: e.defaultWeightKg,
      restSeconds: e.restSeconds,
      routineExerciseId: e.id,
      defaultDurationSec: e.defaultDurationSec ?? null,
      defaultDistanceM: e.defaultDistanceM ?? null,
      defaultSpeedMph: e.defaultSpeedMph ?? null,
      defaultIncline: e.defaultIncline ?? null,
      defaultResistance: e.defaultResistance ?? null,
    })) ?? []
  )
  const [showSelector, setShowSelector] = useState(false)
  const [saving, setSaving] = useState(false)

  const addExercise = (ex: Exercise) => {
    const isCardio = ex.category === "cardio"
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        defaultSets: 3,
        defaultRepsMin: isCardio ? 0 : 8,
        defaultRepsMax: isCardio ? 0 : 12,
        defaultWeightKg: null,
        restSeconds: isCardio ? 60 : 90,
        defaultDurationSec: isCardio ? 1800 : null, // 30 min default
        defaultDistanceM: null,
        defaultSpeedMph: null,
        defaultIncline: null,
        defaultResistance: null,
      },
    ])
  }

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateExercise = (idx: number, field: keyof RoutineExerciseSlot, value: unknown) => {
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Routine name required"); return }
    setSaving(true)

    const isEdit = !!routine?.id
    const url = isEdit ? `/api/routines/${routine!.id}` : "/api/routines"
    const method = isEdit ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description || null, color }),
    })

    if (!res.ok) { toast.error("Failed to save routine"); setSaving(false); return }

    const savedRoutine = await res.json()
    const routineId = savedRoutine.id

    if (isEdit) {
      for (const ex of routine!.exercises) {
        await fetch(`/api/routines/${routineId}/exercises?routineExerciseId=${ex.id}`, { method: "DELETE" })
      }
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      await fetch(`/api/routines/${routineId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: ex.exerciseId,
          sortOrder: i,
          defaultSets: ex.defaultSets,
          defaultRepsMin: ex.defaultRepsMin,
          defaultRepsMax: ex.defaultRepsMax,
          defaultWeightKg: ex.defaultWeightKg,
          restSeconds: ex.restSeconds,
          defaultDurationSec: ex.defaultDurationSec,
          defaultDistanceM: ex.defaultDistanceM,
          defaultSpeedMph: ex.defaultSpeedMph,
          defaultIncline: ex.defaultIncline,
          defaultResistance: ex.defaultResistance,
        }),
      })
    }

    toast.success(isEdit ? "Routine updated" : "Routine created")
    router.push("/workouts")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="bento-card space-y-4">
        <div className="space-y-1.5">
          <Label>Routine Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
        </div>
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Chest, Shoulders, Triceps"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex gap-2">
            {ROUTINE_COLORS.map((c) => (
              <button
                key={c}
                className={cn(
                  "w-7 h-7 rounded-full transition-transform",
                  color === c && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                )}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Exercises ({exercises.length})</Label>
          <Button size="sm" variant="outline" onClick={() => setShowSelector(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Exercise
          </Button>
        </div>

        {exercises.map((ex, idx) => {
          const isCardio = ex.category === "cardio"
          const nameLower = ex.exerciseName.toLowerCase()
          const isTreadmill = nameLower.includes("treadmill")
          const isBike = nameLower.includes("bike") || nameLower.includes("cycle") || nameLower.includes("stationary")

          return (
            <div key={idx} className="bento-card space-y-3">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{ex.exerciseName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ex.category}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeExercise(idx)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {isCardio ? (
                /* ── Cardio exercise config ── */
                <div className="space-y-2">
                  {/* Row 1: Sets + Rest */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Sets</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={ex.defaultSets}
                        onChange={(e) => updateExercise(idx, "defaultSets", parseInt(e.target.value) || 1)}
                        className="h-9 text-sm text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rest (s)</Label>
                      <Input
                        type="number"
                        step="15"
                        min="0"
                        value={ex.restSeconds}
                        onChange={(e) => updateExercise(idx, "restSeconds", parseInt(e.target.value) || 0)}
                        className="h-9 text-sm text-center"
                      />
                    </div>
                  </div>

                  {/* Row 2: Duration + Distance (all cardio) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (MM:SS)</Label>
                      <Input
                        type="text"
                        placeholder="30:00"
                        defaultValue={formatDuration(ex.defaultDurationSec)}
                        onBlur={(e) => updateExercise(idx, "defaultDurationSec", parseDuration(e.target.value))}
                        className="h-9 text-sm text-center"
                      />
                    </div>
                    {!isTreadmill && (
                      <div className="space-y-1">
                        <Label className="text-xs">Distance (mi)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="—"
                          value={ex.defaultDistanceM != null ? (ex.defaultDistanceM / 1609.344).toFixed(2) : ""}
                          onChange={(e) => {
                            const mi = parseFloat(e.target.value)
                            updateExercise(idx, "defaultDistanceM", isNaN(mi) ? null : mi * 1609.344)
                          }}
                          className="h-9 text-sm text-center"
                        />
                      </div>
                    )}
                    {isTreadmill && (
                      <div className="space-y-1">
                        <Label className="text-xs">Speed (mph)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="—"
                          value={ex.defaultSpeedMph ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            updateExercise(idx, "defaultSpeedMph", isNaN(v) ? null : v)
                          }}
                          className="h-9 text-sm text-center"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 3: Treadmill-specific (incline) or Bike-specific (resistance) */}
                  {isTreadmill && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Incline (%)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="—"
                          value={ex.defaultIncline ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            updateExercise(idx, "defaultIncline", isNaN(v) ? null : v)
                          }}
                          className="h-9 text-sm text-center"
                        />
                      </div>
                      <div /> {/* spacer */}
                    </div>
                  )}
                  {isBike && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Resistance</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="—"
                          value={ex.defaultResistance ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            updateExercise(idx, "defaultResistance", isNaN(v) ? null : v)
                          }}
                          className="h-9 text-sm text-center"
                        />
                      </div>
                      <div /> {/* spacer */}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Strength exercise config ── */
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Sets", field: "defaultSets" as const, step: "1" },
                    { label: "Min reps", field: "defaultRepsMin" as const, step: "1" },
                    { label: "Max reps", field: "defaultRepsMax" as const, step: "1" },
                    { label: "Rest (s)", field: "restSeconds" as const, step: "15" },
                  ].map(({ label, field, step }) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        step={step}
                        value={(ex[field] as number) ?? ""}
                        onChange={(e) => updateExercise(idx, field, parseInt(e.target.value) || 0)}
                        className="h-9 text-sm text-center"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {exercises.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm bento-card">
            No exercises yet — click &quot;Add Exercise&quot;
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        {saving ? "Saving..." : routine ? "Update Routine" : "Create Routine"}
      </Button>

      <ExerciseSelector open={showSelector} onClose={() => setShowSelector(false)} onSelect={addExercise} />
    </div>
  )
}
