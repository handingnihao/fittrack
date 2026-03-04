import Link from "next/link"
import { Play, CheckCircle2, Dumbbell, Sofa } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { workoutSessions } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { todayStr, formatDuration } from "@/lib/utils"

async function getTodayData() {
  const today = todayStr()
  const todayDow = new Date().getDay() // 0=Sun..6=Sat

  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.dateStr, today))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1)

  // Check for scheduled routine today
  const sqlite = (db as any).session?.client ?? (db as any)._client
  const scheduled = sqlite?.prepare(`
    SELECT rs.routine_id, r.name as routine_name, r.id
    FROM routine_schedule rs
    JOIN routines r ON rs.routine_id = r.id
    WHERE rs.day_of_week = ?
    LIMIT 1
  `).get(todayDow) as { routine_id: number; routine_name: string; id: number } | null

  return { session: session ?? null, scheduled }
}

export async function TodayWorkoutWidget() {
  const { session, scheduled } = await getTodayData()

  if (!session) {
    return (
      <div className="bento-card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Today&apos;s Workout</p>
        </div>

        {scheduled ? (
          <>
            <div>
              <p className="font-bold text-sm">{scheduled.routine_name}</p>
              <p className="text-xs text-muted-foreground">Scheduled for today</p>
            </div>
            <Link href={`/workouts/routines/${scheduled.routine_id}/log`}>
              <Button size="sm" className="gap-1.5 w-full">
                <Play className="w-3.5 h-3.5" />
                Start Routine
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Sofa className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-foreground">Rest day</p>
            </div>
            <Link href="/workouts">
              <Button size="sm" variant="outline" className="gap-1.5 w-full">
                <Play className="w-3.5 h-3.5" />
                Start a workout anyway
              </Button>
            </Link>
          </>
        )}
      </div>
    )
  }

  const done = !!session.finishedAt

  return (
    <div className={`bento-card flex flex-col gap-3 ${done ? "border-neon-green/20" : "border-neon-orange/20"}`}>
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-neon-green" />
        ) : (
          <Dumbbell className="w-4 h-4 text-neon-orange animate-pulse" />
        )}
        <p className="text-sm font-semibold text-muted-foreground">Today&apos;s Workout</p>
      </div>
      <div>
        <p className="font-bold">{session.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {done
            ? `Completed · ${session.durationSec ? formatDuration(session.durationSec) : ""}`
            : "In progress"}
        </p>
      </div>
      <Link href={`/workouts/history/${session.id}`}>
        <Button size="sm" variant="ghost" className="w-full text-xs">
          View session →
        </Button>
      </Link>
    </div>
  )
}
