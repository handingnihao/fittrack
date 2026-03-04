"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Calendar, Trash2, CheckCircle2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateStr, formatDuration, round1, kgToLbs } from "@/lib/utils"
import type { SessionWithDetails } from "@/types"

// Format a Date (or ISO string) as a datetime-local input value
function toDatetimeLocal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

// Format a Date (or ISO string) as a readable time like "9:32 AM"
function toTimeStr(d: Date | string): string {
  return format(typeof d === "string" ? new Date(d) : d, "h:mm a")
}

export default function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const router = useRouter()
  const [session, setSession] = useState<SessionWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  // Finish-workout form state
  const [isFinishing, setIsFinishing] = useState(false)
  const [endTimeInput, setEndTimeInput] = useState("")        // datetime-local string
  const [durationMinsOverride, setDurationMinsOverride] = useState("") // "" = auto-calc
  const [saving, setSaving] = useState(false)

  // Edit-duration state (for already-completed sessions)
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [editDurationMins, setEditDurationMins] = useState("")

  useEffect(() => {
    fetch(`/api/workouts/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data)
        setLoading(false)
      })
  }, [sessionId])

  // Auto-calculated duration (seconds) from startedAt → endTimeInput
  const autoDurationSec = useMemo(() => {
    if (!session || !endTimeInput) return 0
    const start = new Date(session.startedAt)
    const end = new Date(endTimeInput)
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
  }, [session, endTimeInput])

  const finalDurationSec =
    durationMinsOverride !== "" && !isNaN(Number(durationMinsOverride))
      ? Math.round(Number(durationMinsOverride) * 60)
      : autoDurationSec

  function openFinishForm() {
    setEndTimeInput(toDatetimeLocal(new Date()))
    setDurationMinsOverride("")
    setIsFinishing(true)
  }

  async function handleFinish() {
    if (!session) return
    setSaving(true)
    const end = new Date(endTimeInput)
    const res = await fetch(`/api/workouts/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finishedAt: end.toISOString(),
        durationSec: finalDurationSec,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSession((s) => s ? { ...s, finishedAt: updated.finishedAt, durationSec: updated.durationSec } : s)
      setIsFinishing(false)
      toast.success("Workout marked as complete!")
    } else {
      toast.error("Failed to save — please try again")
    }
    setSaving(false)
  }

  async function handleSaveDurationEdit() {
    if (!session || editDurationMins === "" || isNaN(Number(editDurationMins))) return
    setSaving(true)
    const newDurationSec = Math.round(Number(editDurationMins) * 60)
    const res = await fetch(`/api/workouts/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationSec: newDurationSec }),
    })
    if (res.ok) {
      setSession((s) => s ? { ...s, durationSec: newDurationSec } : s)
      setIsEditingDuration(false)
      toast.success("Duration updated")
    } else {
      toast.error("Failed to update duration")
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("Delete this workout session?")) return
    const res = await fetch(`/api/workouts/${sessionId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Session deleted")
      router.push("/workouts")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!session) return <p className="text-muted-foreground">Session not found</p>

  const isInProgress = !session.finishedAt

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl">{session.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isInProgress ? "bg-orange-500/20 text-neon-orange" : "bg-green-500/20 text-neon-green"}`}>
              {isInProgress ? "In Progress" : "Completed"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateStr(session.dateStr)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started {toTimeStr(session.startedAt)}
            </span>
            {session.finishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ended {toTimeStr(session.finishedAt)}
              </span>
            )}
            {session.durationSec != null && !isEditingDuration && (
              <span className="flex items-center gap-1">
                {formatDuration(session.durationSec)}
                {!isInProgress && (
                  <button
                    onClick={() => {
                      setEditDurationMins(String(Math.round(session.durationSec! / 60)))
                      setIsEditingDuration(true)
                    }}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    title="Edit duration"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit duration panel (completed sessions) */}
      {isEditingDuration && !isInProgress && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Edit Duration</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editDurationMins}
                  onChange={(e) => setEditDurationMins(e.target.value)}
                  placeholder="e.g. 60"
                  className="mt-1"
                />
              </div>
              {editDurationMins !== "" && !isNaN(Number(editDurationMins)) && (
                <p className="text-xs text-muted-foreground mt-5">
                  = {formatDuration(Math.round(Number(editDurationMins) * 60))}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDurationEdit} disabled={saving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingDuration(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finish Workout panel */}
      {isInProgress && !isFinishing && (
        <Button
          className="w-full"
          onClick={openFinishForm}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Finish Workout
        </Button>
      )}

      {isInProgress && isFinishing && (
        <Card className="border-neon-green/30 bg-green-500/5">
          <CardContent className="p-4 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neon-green" />
              Finish Workout
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <Input
                  type="datetime-local"
                  value={endTimeInput}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Duration (minutes)
                  <span className="ml-1 text-muted-foreground/60">
                    — auto: {autoDurationSec > 0 ? formatDuration(autoDurationSec) : "—"}
                  </span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMinsOverride}
                  onChange={(e) => setDurationMinsOverride(e.target.value)}
                  placeholder={autoDurationSec > 0 ? String(Math.round(autoDurationSec / 60)) : "e.g. 60"}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Final duration:&nbsp;
              <span className="text-foreground font-medium">
                {finalDurationSec > 0 ? formatDuration(finalDurationSec) : "—"}
              </span>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFinish} disabled={saving || !endTimeInput} className="flex-1">
                {saving ? "Saving…" : "Save & Finish"}
              </Button>
              <Button variant="ghost" onClick={() => setIsFinishing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {session.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Session summary */}
      {session.exercises && session.exercises.length > 0 && (() => {
        const totalSets = session.exercises.reduce((n, ex) => n + (ex.sets?.length ?? 0), 0)
        const totalVolLbs = session.exercises.reduce(
          (n, ex) =>
            n +
            (ex.sets ?? []).reduce(
              (s, set) =>
                s + (set.weightKg != null && set.reps != null ? kgToLbs(set.weightKg) * set.reps : 0),
              0
            ),
          0
        )
        return (
          <Card className="border-border/60 bg-secondary/20">
            <CardContent className="p-4">
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Exercises</p>
                  <p className="font-bold">{session.exercises.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sets</p>
                  <p className="font-bold">{totalSets}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Volume</p>
                  <p className="font-bold">{Math.round(totalVolLbs).toLocaleString()} lbs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Exercise list */}
      <div className="space-y-3">
        {session.exercises?.map((ex, idx) => {
          const workingSets = (ex.sets ?? []).filter((s) => !s.isWarmup)
          const maxLbs = workingSets.reduce(
            (m, s) => Math.max(m, s.weightKg != null ? kgToLbs(s.weightKg) : 0),
            0
          )
          const totalVolLbs = workingSets.reduce(
            (n, s) => n + (s.weightKg != null && s.reps != null ? kgToLbs(s.weightKg) * s.reps : 0),
            0
          )
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <p className="font-semibold text-sm">{ex.exerciseName}</p>
                {workingSets.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    {workingSets.length} set{workingSets.length !== 1 ? "s" : ""}
                    {maxLbs > 0 && ` · Max ${round1(maxLbs)} lbs`}
                    {totalVolLbs > 0 && ` · Vol ${Math.round(totalVolLbs).toLocaleString()} lbs`}
                  </p>
                )}
                {!workingSets.length && <div className="mb-3" />}
                <div className="space-y-1.5">
                  {ex.sets?.map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-3 text-sm">
                      <span className={`w-6 text-center text-xs font-bold ${set.isWarmup ? "text-yellow-500" : "text-muted-foreground"}`}>
                        {set.isWarmup ? "W" : setIdx + 1}
                      </span>
                      <span className="flex-1">
                        {set.weightKg != null ? `${round1(kgToLbs(set.weightKg))} lbs` : "BW"}
                        {" × "}
                        {set.reps != null ? `${set.reps} reps` : "—"}
                      </span>
                      {set.weightKg != null && set.reps != null && (
                        <span className="text-xs text-muted-foreground">
                          {round1(kgToLbs(set.weightKg) * set.reps)} vol
                        </span>
                      )}
                      {set.isPersonalBest && (
                        <span className="text-xs text-neon-yellow font-bold">🏆 PB</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
