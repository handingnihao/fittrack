import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { loggedExercises, sets, workoutSessions } from "@/db/schema"
import { eq, desc, and, asc } from "drizzle-orm"

export async function GET(_: NextRequest, { params }: { params: { exerciseName: string } }) {
  const exerciseName = decodeURIComponent(params.exerciseName)

  // Get last 10 sessions that include this exercise
  const logged = await db
    .select({
      id: loggedExercises.id,
      sessionId: loggedExercises.sessionId,
      exerciseName: loggedExercises.exerciseName,
      dateStr: workoutSessions.dateStr,
      sessionName: workoutSessions.name,
    })
    .from(loggedExercises)
    .innerJoin(workoutSessions, eq(loggedExercises.sessionId, workoutSessions.id))
    .where(eq(loggedExercises.exerciseName, exerciseName))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(10)

  if (logged.length === 0) return NextResponse.json([])

  const history = await Promise.all(
    logged.map(async (ex) => {
      const exSets = await db
        .select()
        .from(sets)
        .where(and(eq(sets.loggedExerciseId, ex.id), eq(sets.isWarmup, false)))
        .orderBy(asc(sets.setNumber))

      const workingSets = exSets.filter((s) => !s.isWarmup)
      const maxWeight = workingSets.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0)
      const totalVolume = workingSets.reduce(
        (sum, s) => sum + (s.reps ?? 0) * (s.weightKg ?? 0),
        0
      )
      const maxReps = workingSets.reduce((max, s) => Math.max(max, s.reps ?? 0), 0)

      return {
        date: ex.dateStr,
        sessionName: ex.sessionName,
        maxWeightKg: maxWeight || null,
        totalVolume: Math.round(totalVolume),
        maxReps: maxReps || null,
        sets: workingSets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
      }
    })
  )

  return NextResponse.json(history.reverse()) // chronological order
}
