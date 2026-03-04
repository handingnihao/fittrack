"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Zap, Download, Upload, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { RoutineCard } from "@/components/workouts/RoutineCard"
import { WorkoutHistoryCard } from "@/components/workouts/WorkoutHistoryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { RoutineWithExercises } from "@/types"
import type { WorkoutSession } from "@/db/schema"
import { todayStr } from "@/lib/utils"

export default function WorkoutsPage() {
  const router = useRouter()
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [repeating, setRepeating] = useState<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/routines").then((r) => r.json()).catch(() => []),
      fetch("/api/workouts?limit=20").then((r) => r.json()).catch(() => []),
    ]).then(([r, s]) => {
      setRoutines(Array.isArray(r) ? r : [])
      setSessions(Array.isArray(s) ? s : [])
      setLoading(false)
    })
  }, [])

  const handleDeleteRoutine = (id: number) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleRepeat(sessionId: number, sessionName: string) {
    setRepeating(sessionId)
    try {
      // Get original session exercises
      const res = await fetch(`/api/workouts/${sessionId}`)
      if (!res.ok) throw new Error("Failed to fetch session")
      const session = await res.json()

      // Create new session
      const today = todayStr()
      const newRes = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${sessionName} — Repeat`,
          dateStr: today,
          startedAt: new Date().toISOString(),
        }),
      })
      if (!newRes.ok) throw new Error("Failed to create session")
      const newSession = await newRes.json()

      // Add each exercise
      for (const ex of (session.exercises ?? [])) {
        await fetch(`/api/workouts/${newSession.id}/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            sortOrder: ex.sortOrder,
            restSeconds: ex.restSeconds ?? 90,
          }),
        })
      }

      toast.success("Workout copied — let's go!")
      router.push(`/workouts/new/log?sessionId=${newSession.id}`)
    } catch {
      toast.error("Failed to repeat workout")
    } finally {
      setRepeating(null)
    }
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/routines/export")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fittrack-routines-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Export failed")
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await fetch("/api/routines/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`Imported ${result.imported} routine${result.imported !== 1 ? "s" : ""}`)
        const updated = await fetch("/api/routines").then((r) => r.json()).catch(() => [])
        setRoutines(Array.isArray(updated) ? updated : [])
      } else {
        toast.error(result.error ?? "Import failed")
      }
    } catch {
      toast.error("Invalid file — make sure it's a FitTrack routines export")
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workouts"
        action={
          <div className="flex gap-2">
            <Link href="/workouts/new/log">
              <Button variant="outline" size="sm" className="gap-2">
                <Zap className="w-4 h-4" />
                Quick Workout
              </Button>
            </Link>
            <Link href="/workouts/routines/new">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Routine
              </Button>
            </Link>
          </div>
        }
      />

      <Tabs defaultValue="routines">
        <TabsList className="w-full">
          <TabsTrigger value="routines" className="flex-1">Routines</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="routines" className="mt-4 space-y-3">
          {/* Export / Import */}
          <div className="flex gap-2 justify-end">
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-3.5 h-3.5" />
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleExport}
              disabled={routines.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>

          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : routines.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground text-sm">No routines yet</p>
              <Link href="/workouts/routines/new">
                <Button variant="outline" size="sm">Create your first routine</Button>
              </Link>
            </div>
          ) : (
            routines.map((r) => (
              <RoutineCard key={r.id} routine={r} onDelete={handleDeleteRoutine} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No workouts logged yet</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="relative group">
                <WorkoutHistoryCard session={s} />
                {/* Repeat button overlaid on top-right */}
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 px-2 bg-background"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRepeat(s.id, s.name)
                  }}
                  disabled={repeating === s.id}
                  title="Repeat this workout"
                >
                  <RotateCcw className="w-3 h-3" />
                  {repeating === s.id ? "…" : "Repeat"}
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
