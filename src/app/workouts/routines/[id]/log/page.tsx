"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { ActiveWorkoutPanel } from "@/components/workouts/ActiveWorkoutPanel"
import { ExerciseSelector } from "@/components/workouts/ExerciseSelector"
import { useActiveWorkout } from "@/hooks/useActiveWorkout"
import type { ActiveExercise, ExerciseHistoryPoint } from "@/types"
import type { Exercise } from "@/db/schema"
import { formatDuration } from "@/lib/utils"
import { format } from "date-fns"

type DraftSet = { weightKg: number | null; reps: number | null; isWarmup: boolean; isDropSet: boolean } | null

async function fetchHistory(exerciseName: string): Promise<ExerciseHistoryPoint[]> {
  return fetch(`/api/workouts/history/${encodeURIComponent(exerciseName)}`)
    .then((r) => r.json() as Promise<ExerciseHistoryPoint[]>)
    .catch(() => [] as ExerciseHistoryPoint[])
}

function attachHistory(exercises: ActiveExercise[], historyResults: ExerciseHistoryPoint[][]): void {
  exercises.forEach((ex, i) => {
    const lastWithSets = [...historyResults[i]].reverse().find((h) => h.sets?.length > 0)
    if (lastWithSets) ex.previousSets = lastWithSets.sets
  })
}

export default function ActiveWorkoutPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const workout = useActiveWorkout()
  const { state } = workout
  const [showExSelector, setShowExSelector] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Elapsed timer
  useEffect(() => {
    if (!state.sessionId) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [state.sessionId, state.startedAt])

  // Initialize or resume session
  useEffect(() => {
    if (initialized) return
    setInitialized(true)

    const sessionKey = `fittrack_active_${id}`

    const doInit = async () => {
      let routine: { id: number; name: string; exercises: Array<{ exerciseId: number; exerciseName?: string; defaultSets: number; defaultRepsMin: number; defaultRepsMax: number; defaultWeightKg: number | null; restSeconds: number }> }
      try {
        const r = await fetch(`/api/routines/${id}`)
        routine = await r.json()
      } catch {
        toast.error("Failed to load routine")
        return
      }

      // Try to resume an existing session
      const storedSessionId = (() => { try { return localStorage.getItem(sessionKey) } catch { return null } })()
      if (storedSessionId) {
        try {
          const sessionRes = await fetch(`/api/workouts/${storedSessionId}`)
          if (sessionRes.ok) {
            const session = await sessionRes.json()
            if (!session.finishedAt) {
              // Load draft
              let draft: DraftSet[][] | null = null
              try {
                const raw = localStorage.getItem(`fittrack_draft_${session.id}`)
                if (raw) draft = JSON.parse(raw)
              } catch {}

              // Reconstruct ActiveExercise[] from DB
              const activeExercises: ActiveExercise[] = (session.exercises ?? []).map(
                (le: { id: number; exerciseId: number; exerciseName: string; sets: Array<{ id: number; setNumber: number; reps: number | null; weightKg: number | null; isWarmup: boolean; isDropSet: boolean }> }, idx: number) => {
                  const routineEx = routine.exercises.find((re) => re.exerciseId === le.exerciseId) ?? routine.exercises[idx]

                  const completedSets = le.sets.map((s) => ({
                    id: s.id,
                    setNumber: s.setNumber,
                    reps: s.reps,
                    weightKg: s.weightKg,
                    isWarmup: s.isWarmup ?? false,
                    isDropSet: s.isDropSet ?? false,
                    completed: true as const,
                  }))

                  const draftForEx: DraftSet[] = draft?.[idx] ?? []
                  const uncompletedSets = draftForEx
                    .filter((d): d is NonNullable<DraftSet> => d !== null)
                    .map((d, i) => ({
                      setNumber: completedSets.length + i + 1,
                      reps: d.reps,
                      weightKg: d.weightKg,
                      isWarmup: d.isWarmup,
                      isDropSet: d.isDropSet,
                      completed: false as const,
                    }))

                  const allSets =
                    completedSets.length > 0 || uncompletedSets.length > 0
                      ? [...completedSets, ...uncompletedSets]
                      : Array.from({ length: routineEx?.defaultSets ?? 3 }, (_, i) => ({
                          setNumber: i + 1,
                          reps: routineEx?.defaultRepsMin ?? null,
                          weightKg: routineEx?.defaultWeightKg ?? null,
                          isWarmup: false,
                          isDropSet: false,
                          completed: false as const,
                        }))

                  return {
                    exerciseId: le.exerciseId,
                    exerciseName: le.exerciseName,
                    loggedExerciseId: le.id,
                    restSeconds: routineEx?.restSeconds ?? 90,
                    sets: allSets,
                  }
                }
              )

              const historyResults = await Promise.all(activeExercises.map((ex) => fetchHistory(ex.exerciseName)))
              attachHistory(activeExercises, historyResults)

              workout.dispatch({
                type: "RESTORE_SESSION",
                sessionId: session.id,
                routineId: routine.id,
                name: session.name,
                startedAt: new Date(session.startedAt),
                exercises: activeExercises,
              })
              toast.success("Workout resumed", { duration: 2000 })
              return
            }
          }
        } catch {}
        // Resume failed — clear stale key and fall through to new session
        try { localStorage.removeItem(sessionKey) } catch {}
      }

      // Create new session
      try {
        const sessionRes = await fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routineId: routine.id, name: routine.name, dateStr: format(new Date(), "yyyy-MM-dd") }),
        })
        const session = await sessionRes.json()

        // Store session ID for resume
        try { localStorage.setItem(sessionKey, String(session.id)) } catch {}

        const exRes = await fetch(`/api/workouts/${session.id}/exercises`)
        const loggedExs = await exRes.json()

        const activeExercises: ActiveExercise[] = loggedExs.map(
          (le: { id: number; exerciseId: number; exerciseName: string }, idx: number) => {
            const routineEx = routine.exercises[idx]
            return {
              exerciseId: le.exerciseId,
              exerciseName: le.exerciseName,
              loggedExerciseId: le.id,
              restSeconds: routineEx?.restSeconds ?? 90,
              sets: Array.from({ length: routineEx?.defaultSets ?? 3 }, (_, i) => ({
                setNumber: i + 1,
                reps: routineEx?.defaultRepsMin ?? null,
                weightKg: routineEx?.defaultWeightKg ?? null,
                isWarmup: false,
                isDropSet: false,
                completed: false,
              })),
            }
          }
        )

        const historyResults = await Promise.all(activeExercises.map((ex) => fetchHistory(ex.exerciseName)))
        attachHistory(activeExercises, historyResults)

        workout.initSession(session.id, routine.id, routine.name, activeExercises)
      } catch {
        toast.error("Failed to start workout")
      }
    }

    doInit()
  }, [id, initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  const addExercise = async (ex: Exercise) => {
    if (!state.sessionId) return
    const res = await fetch(`/api/workouts/${state.sessionId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: ex.id }),
    })
    if (res.ok) {
      const logged = await res.json()
      const newEx: ActiveExercise = {
        exerciseId: ex.id,
        exerciseName: ex.name,
        loggedExerciseId: logged.id,
        restSeconds: 90,
        sets: [{ setNumber: 1, reps: null, weightKg: null, isWarmup: false, isDropSet: false, completed: false }],
      }
      workout.addExercise(newEx)
    }
  }

  const handleFinish = async () => {
    await workout.finishSession()
    toast.success("Workout completed! 💪", { duration: 3000 })
    router.push("/workouts")
  }

  if (!state.sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading workout...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title={state.name}
        description={formatDuration(elapsed)}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExSelector(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Exercise
            </Button>
            <Button size="sm" onClick={handleFinish} className="gap-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30">
              <CheckCircle2 className="w-4 h-4" />
              Finish
            </Button>
          </div>
        }
      />

      <ActiveWorkoutPanel workout={workout} />

      <ExerciseSelector
        open={showExSelector}
        onClose={() => setShowExSelector(false)}
        onSelect={(ex) => { addExercise(ex); setShowExSelector(false) }}
      />
    </div>
  )
}
