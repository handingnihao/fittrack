"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Plus } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PageHeader } from "@/components/layout/PageHeader"
import { ActiveWorkoutPanel } from "@/components/workouts/ActiveWorkoutPanel"
import { ExerciseSelector } from "@/components/workouts/ExerciseSelector"
import { useActiveWorkout } from "@/hooks/useActiveWorkout"
import { ROUTINE_COLORS } from "@/lib/constants"
import { cn, formatDuration } from "@/lib/utils"
import type { ActiveExercise, ExerciseHistoryPoint } from "@/types"
import type { Exercise } from "@/db/schema"

const SESSION_KEY = "fittrack_active_adhoc"

type DraftSet = { weightKg: number | null; reps: number | null; isWarmup: boolean; isDropSet: boolean } | null

async function fetchHistory(exerciseName: string): Promise<ExerciseHistoryPoint[]> {
  return fetch(`/api/workouts/history/${encodeURIComponent(exerciseName)}`)
    .then((r) => r.json() as Promise<ExerciseHistoryPoint[]>)
    .catch(() => [] as ExerciseHistoryPoint[])
}

export default function AdhocWorkoutPage() {
  const router = useRouter()
  const workout = useActiveWorkout()
  const { state } = workout
  const [showExSelector, setShowExSelector] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Save-as-routine dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [routineName, setRoutineName] = useState("")
  const [routineColor, setRoutineColor] = useState(ROUTINE_COLORS[0])
  const [savingRoutine, setSavingRoutine] = useState(false)

  // Elapsed timer
  useEffect(() => {
    if (!state.sessionId) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [state.sessionId, state.startedAt])

  // Initialize or resume ad-hoc session
  useEffect(() => {
    if (initialized) return
    setInitialized(true)

    const doInit = async () => {
      // Try to resume an existing ad-hoc session
      const storedSessionId = (() => { try { return localStorage.getItem(SESSION_KEY) } catch { return null } })()
      if (storedSessionId) {
        try {
          const sessionRes = await fetch(`/api/workouts/${storedSessionId}`)
          if (sessionRes.ok) {
            const session = await sessionRes.json()
            if (!session.finishedAt) {
              let draft: DraftSet[][] | null = null
              try {
                const raw = localStorage.getItem(`fittrack_draft_${session.id}`)
                if (raw) draft = JSON.parse(raw)
              } catch {}

              const activeExercises: ActiveExercise[] = (session.exercises ?? []).map(
                (le: { id: number; exerciseId: number; exerciseName: string; sets: Array<{ id: number; setNumber: number; reps: number | null; weightKg: number | null; isWarmup: boolean; isDropSet: boolean }> }, idx: number) => {
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
                      : [{ setNumber: 1, reps: null, weightKg: null, isWarmup: false, isDropSet: false, completed: false as const }]

                  return {
                    exerciseId: le.exerciseId,
                    exerciseName: le.exerciseName,
                    loggedExerciseId: le.id,
                    restSeconds: 90,
                    sets: allSets,
                  }
                }
              )

              const historyResults = await Promise.all(activeExercises.map((ex) => fetchHistory(ex.exerciseName)))
              activeExercises.forEach((ex, i) => {
                const lastWithSets = [...historyResults[i]].reverse().find((h) => h.sets?.length > 0)
                if (lastWithSets) ex.previousSets = lastWithSets.sets
              })

              workout.dispatch({
                type: "RESTORE_SESSION",
                sessionId: session.id,
                routineId: null,
                name: session.name,
                startedAt: new Date(session.startedAt),
                exercises: activeExercises,
              })
              toast.success("Workout resumed", { duration: 2000 })
              return
            }
          }
        } catch {}
        try { localStorage.removeItem(SESSION_KEY) } catch {}
      }

      // Create new ad-hoc session
      try {
        const name = `Quick Workout — ${format(new Date(), "MMM d")}`
        const sessionRes = await fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dateStr: format(new Date(), "yyyy-MM-dd") }),
        })
        const session = await sessionRes.json()
        try { localStorage.setItem(SESSION_KEY, String(session.id)) } catch {}
        workout.initSession(session.id, null, name, [])
      } catch {
        toast.error("Failed to start workout")
      }
    }

    doInit()
  }, [initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  const addExercise = async (ex: Exercise) => {
    if (!state.sessionId) return
    const res = await fetch(`/api/workouts/${state.sessionId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: ex.id }),
    })
    if (res.ok) {
      const logged = await res.json()
      const history = await fetchHistory(ex.name)
      const lastWithSets = [...history].reverse().find((h) => h.sets?.length > 0)
      const newEx: ActiveExercise = {
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseCategory: logged.exerciseCategory ?? ex.category,
        loggedExerciseId: logged.id,
        restSeconds: 90,
        sets: [{ setNumber: 1, reps: null, weightKg: null, isWarmup: false, isDropSet: false, completed: false }],
        previousSets: lastWithSets?.sets,
      }
      workout.addExercise(newEx)
    }
  }

  const handleFinish = async () => {
    await workout.finishSession()
    // Default routine name = workout name
    setRoutineName(state.name)
    setShowSaveDialog(true)
  }

  const handleSaveRoutine = async () => {
    if (!routineName.trim()) { toast.error("Routine name required"); return }
    setSavingRoutine(true)
    try {
      const routineRes = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: routineName.trim(), color: routineColor }),
      })
      if (!routineRes.ok) throw new Error("Failed to create routine")
      const routine = await routineRes.json()

      for (let i = 0; i < state.exercises.length; i++) {
        const ex = state.exercises[i]
        const completedSets = ex.sets.filter((s) => s.completed)
        const weights = completedSets.map((s) => s.weightKg).filter((w): w is number => w !== null)
        const reps = completedSets.map((s) => s.reps).filter((r): r is number => r !== null)
        await fetch(`/api/routines/${routine.id}/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId: ex.exerciseId,
            sortOrder: i,
            defaultSets: Math.max(completedSets.length, 3),
            defaultRepsMin: reps.length > 0 ? Math.min(...reps) : 8,
            defaultRepsMax: reps.length > 0 ? Math.max(...reps) : 12,
            defaultWeightKg: weights.length > 0 ? Math.max(...weights) : null,
            restSeconds: ex.restSeconds,
          }),
        })
      }

      toast.success("Routine saved!")
    } catch {
      toast.error("Failed to save routine")
    } finally {
      setSavingRoutine(false)
      setShowSaveDialog(false)
      router.push("/workouts")
    }
  }

  const handleSkipSave = () => {
    setShowSaveDialog(false)
    router.push("/workouts")
  }

  if (!state.sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Starting workout...</p>
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
            <Button
              size="sm"
              onClick={handleFinish}
              disabled={state.isFinished}
              className="gap-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finish
            </Button>
          </div>
        }
      />

      {state.exercises.length === 0 && (
        <div className="bento-card text-center py-12 space-y-3">
          <p className="text-muted-foreground text-sm">No exercises yet</p>
          <Button variant="outline" size="sm" onClick={() => setShowExSelector(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Exercise
          </Button>
        </div>
      )}

      {state.exercises.length > 0 && <ActiveWorkoutPanel workout={workout} />}

      <ExerciseSelector
        open={showExSelector}
        onClose={() => setShowExSelector(false)}
        onSelect={(ex) => { addExercise(ex); setShowExSelector(false) }}
      />

      <Dialog open={showSaveDialog} onOpenChange={(open) => { if (!open) handleSkipSave() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Routine?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Routine Name</Label>
              <Input value={routineName} onChange={(e) => setRoutineName(e.target.value)} placeholder="My Workout" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {ROUTINE_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      routineColor === c && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ background: c }}
                    onClick={() => setRoutineColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleSkipSave}>Skip</Button>
            <Button onClick={handleSaveRoutine} disabled={savingRoutine}>
              {savingRoutine ? "Saving..." : "Save Routine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
