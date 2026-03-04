import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { workoutSessions, loggedExercises, sets } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { UpdateSessionSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"
import { awardXp, checkAndAwardAchievements, getWeekStr, updateChallengeProgress, earnStreakFreezeIfEligible } from "@/lib/gamification"

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const id = parseInt(params.sessionId)
  const profileId = getActiveProfileId(req)
  const [session] = await db.select().from(workoutSessions).where(and(eq(workoutSessions.id, id), eq(workoutSessions.profileId, profileId)))
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const exs = await db
    .select()
    .from(loggedExercises)
    .where(eq(loggedExercises.sessionId, id))
    .orderBy(asc(loggedExercises.sortOrder))

  const exercisesWithSets = await Promise.all(
    exs.map(async (ex) => {
      const exSets = await db
        .select()
        .from(sets)
        .where(eq(sets.loggedExerciseId, ex.id))
        .orderBy(asc(sets.setNumber))
      return { ...ex, sets: exSets }
    })
  )

  return NextResponse.json({ ...session, exercises: exercisesWithSets })
}

export async function PATCH(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const id = parseInt(params.sessionId)
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = UpdateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.finishedAt) updateData.finishedAt = new Date(parsed.data.finishedAt)

  const [updated] = await db
    .update(workoutSessions)
    .set(updateData)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.profileId, profileId)))
    .returning()
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let xpGained = 0
  let newLevel: number | undefined
  let newAchievements: string[] = []

  // Award XP when session is finished
  if (parsed.data.finishedAt) {
    const sqlite = (db as any).session?.client ?? (db as any)._client

    // Init profile_stats if needed
    sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)
    sqlite.prepare(`UPDATE profile_stats SET lifetime_workouts = lifetime_workouts + 1 WHERE profile_id = ?`).run(profileId)

    const result = await awardXp(db, profileId, "workout_complete", undefined, id, `Workout: ${updated.name}`)
    xpGained = result.xpGained
    newLevel = result.newLevel

    // Update challenges
    const weekStr = getWeekStr()
    await updateChallengeProgress(db, profileId, weekStr, "workout_complete", 1)

    // Streak freeze eligibility
    await earnStreakFreezeIfEligible(db, profileId, weekStr)

    // Check achievements
    newAchievements = await checkAndAwardAchievements(db, profileId)
  }

  return NextResponse.json({ session: updated, xpGained, newLevel, newAchievements })
}

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const id = parseInt(params.sessionId)
  const profileId = getActiveProfileId(req)
  await db.delete(workoutSessions).where(and(eq(workoutSessions.id, id), eq(workoutSessions.profileId, profileId)))
  return NextResponse.json({ ok: true })
}
