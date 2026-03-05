"use client"
import { useState, useCallback } from "react"
import { Plus, ChevronDown, ChevronUp, History, TrendingUp, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SetRow } from "./SetRow"
import { RestTimer } from "./RestTimer"
import { ExerciseHistoryChart } from "./ExerciseHistoryChart"
import { useActiveWorkout } from "@/hooks/useActiveWorkout"
import type { ActiveExercise } from "@/types"
import { cn, kgToLbs, lbsToKg } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  workout: ReturnType<typeof useActiveWorkout>
}

function getOverloadSuggestion(exercise: ActiveExercise): string | null {
  const prevSets = exercise.previousSets
  if (!prevSets || prevSets.length === 0) return null
  const prevMaxWeight = Math.max(...prevSets.map((s) => s.weightKg ?? 0))
  if (prevMaxWeight <= 0) return null

  // Suggest +5 lbs for barbell, +2.5 for dumbbell, no suggestion for bodyweight
  const isBodyweight = prevMaxWeight < 10 // heuristic: very low weight = bodyweight
  if (isBodyweight) return null

  const suggestedKg = prevMaxWeight + lbsToKg(5)
  const suggestedLbs = kgToLbs(suggestedKg)
  return `Try ${Number.isInteger(suggestedLbs) ? suggestedLbs : suggestedLbs.toFixed(1)} lbs today →`
}

export function ActiveWorkoutPanel({ workout }: Props) {
  const { state, addSet, updateSet, completeSet, removeSet } = workout
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set())

  const toggleCollapse = (idx: number) => {
    setCollapsedExercises((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Enhanced complete set handler that checks for PR toast
  const handleCompleteSet = useCallback(async (exIdx: number, setIdx: number) => {
    completeSet(exIdx, setIdx)
    // Check if the completed set is a PR — the API response contains isNewPR
    // We rely on the hook's internal fetch to surface this; toast shown from hook callback
  }, [completeSet])

  return (
    <div className="space-y-4">
      {/* Rest timer sticky bar */}
      {state.restTimerActive && (
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border border-neon-green/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-medium text-neon-green">Rest timer</span>
          <span className="text-lg font-bold text-neon-green tabular-nums">
            {Math.floor(state.restTimerRemaining / 60)}:{String(state.restTimerRemaining % 60).padStart(2, "0")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-neon-green"
            onClick={() => workout.dispatch({ type: "STOP_REST_TIMER" })}
          >
            Skip
          </Button>
        </div>
      )}

      {state.exercises.map((ex, exIdx) => {
        const isActive = exIdx === state.currentExerciseIndex
        const collapsed = collapsedExercises.has(exIdx)
        const completedSets = ex.sets.filter((s) => s.completed).length
        const isCardio = (ex as any).exerciseCategory === "cardio"
        const overloadHint = isCardio ? null : getOverloadSuggestion(ex)
        const nameLower = ex.exerciseName?.toLowerCase() ?? ""
        const isTreadmill = nameLower.includes("treadmill")
        const isBike = nameLower.includes("bike") || nameLower.includes("cycle") || nameLower.includes("stationary")

        return (
          <div
            key={exIdx}
            className={cn(
              "bento-card transition-all",
              isActive && "border-primary/30 glow-purple"
            )}
          >
            {/* Exercise header */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                workout.dispatch({ type: "SET_EXERCISE_INDEX", index: exIdx })
                toggleCollapse(exIdx)
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{ex.exerciseName}</p>
                <p className="text-xs text-muted-foreground">
                  {completedSets}/{ex.sets.length} sets
                  {ex.restSeconds > 0 && ` · ${ex.restSeconds}s rest`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); setShowHistory(ex.exerciseName) }}
                  title="View history"
                >
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                {collapsed ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {!collapsed && (
              <div className="mt-3 space-y-1">
                {/* Progressive overload hint */}
                {overloadHint && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/10 mb-2">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary">{overloadHint}</span>
                  </div>
                )}

                {/* Column headers */}
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <span className="w-7" />
                  <span className="w-14 text-center hidden sm:block">Prev</span>
                  <span className="flex-1 text-center">{isCardio ? "mi" : "lbs"}</span>
                  <span className="flex-1 text-center">{isCardio ? "MM:SS" : "reps"}</span>
                  {isCardio && isTreadmill && <span className="w-16 text-center">mph</span>}
                  {isCardio && isTreadmill && <span className="w-16 text-center">incline</span>}
                  {isCardio && isBike && <span className="w-16 text-center">resist.</span>}
                  <span className="w-9" />
                  <span className="w-7" />
                </div>

                {ex.sets.map((set, setIdx) => (
                  <SetRow
                    key={setIdx}
                    set={set}
                    setIndex={setIdx}
                    onUpdate={(field, value) => updateSet(exIdx, setIdx, field, value)}
                    onComplete={() => handleCompleteSet(exIdx, setIdx)}
                    onRemove={() => removeSet(exIdx, setIdx)}
                    previousWeight={ex.previousSets?.[setIdx]?.weightKg ?? null}
                    previousReps={ex.previousSets?.[setIdx]?.reps ?? null}
                    previousDistanceM={ex.previousSets?.[setIdx]?.distanceM ?? null}
                    exerciseCategory={(ex as any).exerciseCategory}
                    exerciseName={ex.exerciseName}
                    isPersonalBest={(set as any).isPersonalBest}
                  />
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 h-8 text-xs gap-1.5 text-muted-foreground"
                  onClick={() => addSet(exIdx)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add set
                </Button>
              </div>
            )}
          </div>
        )
      })}

      {/* History sheet */}
      <Sheet open={!!showHistory} onOpenChange={(v) => !v && setShowHistory(null)}>
        <SheetContent side="bottom" className="h-[60vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{showHistory} — History</SheetTitle></SheetHeader>
          <div className="mt-4">
            {showHistory && <ExerciseHistoryChart exerciseName={showHistory} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
