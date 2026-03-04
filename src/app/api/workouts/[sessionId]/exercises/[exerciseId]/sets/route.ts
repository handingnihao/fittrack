import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sets, loggedExercises, workoutSessions } from "@/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"
import { CreateSetSchema, UpdateSetSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"
import { awardXp, checkAndAwardAchievements, getWeekStr, updateChallengeProgress } from "@/lib/gamification"
import { todayStr } from "@/lib/utils"

export async function GET(_: NextRequest, { params }: { params: { exerciseId: string } }) {
  const loggedExerciseId = parseInt(params.exerciseId)
  const allSets = await db
    .select()
    .from(sets)
    .where(eq(sets.loggedExerciseId, loggedExerciseId))
    .orderBy(asc(sets.setNumber))
  return NextResponse.json(allSets)
}

export async function POST(req: NextRequest, { params }: { params: { exerciseId: string; sessionId: string } }) {
  const loggedExerciseId = parseInt(params.exerciseId)
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = CreateSetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const setData = {
    ...parsed.data,
    loggedExerciseId,
    completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : new Date(),
  }

  const [newSet] = await db.insert(sets).values(setData).returning()

  let isNewPR = false

  // PR detection: only for non-warmup weighted sets
  if (!setData.isWarmup && setData.weightKg != null && setData.weightKg > 0 && (setData.reps ?? 0) > 0) {
    const sqlite = (db as any).session?.client ?? (db as any)._client

    // Find historical max weight for this exercise across all previous sessions
    const prevMax = sqlite.prepare(`
      SELECT MAX(s.weight_kg) as max_weight
      FROM sets s
      JOIN logged_exercises le ON s.logged_exercise_id = le.id
      JOIN workout_sessions ws ON le.session_id = ws.id
      WHERE le.exercise_id = (
        SELECT exercise_id FROM logged_exercises WHERE id = ?
      )
      AND ws.profile_id = ?
      AND s.is_warmup = 0
      AND s.weight_kg IS NOT NULL
      AND s.id != ?
    `).get(loggedExerciseId, profileId, newSet.id) as { max_weight: number | null } | null

    const previousMax = prevMax?.max_weight ?? null

    if (previousMax === null || setData.weightKg > previousMax) {
      // It's a PR!
      isNewPR = true
      await db.update(sets).set({ isPersonalBest: true }).where(eq(sets.id, newSet.id))

      // Award XP
      const { xpGained } = await awardXp(db, profileId, "pr_set", undefined, newSet.id, `PR on set #${newSet.id}`)

      // Update profile_stats
      sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)
      sqlite.prepare(`
        UPDATE profile_stats
        SET lifetime_prs = lifetime_prs + 1,
            lifetime_volume_kg = lifetime_volume_kg + ?
        WHERE profile_id = ?
      `).run((setData.reps ?? 1) * setData.weightKg, profileId)

      // Update challenges
      await updateChallengeProgress(db, profileId, getWeekStr(), "pr_set", 1)

      // Check achievements
      await checkAndAwardAchievements(db, profileId)
    } else {
      // Still update volume stats even for non-PR
      sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)
      sqlite.prepare(`
        UPDATE profile_stats SET lifetime_volume_kg = lifetime_volume_kg + ? WHERE profile_id = ?
      `).run((setData.reps ?? 1) * setData.weightKg, profileId)
    }
  }

  // Refetch to get updated isPersonalBest
  const [finalSet] = await db.select().from(sets).where(eq(sets.id, newSet.id))
  return NextResponse.json({ ...finalSet, isNewPR }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { exerciseId: string } }) {
  const { searchParams } = new URL(req.url)
  const setId = parseInt(searchParams.get("setId") ?? "0")
  const body = await req.json()
  const parsed = UpdateSetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { completedAt, ...rest } = parsed.data
  const updateData = {
    ...rest,
    ...(completedAt !== undefined ? { completedAt: new Date(completedAt) } : {}),
  }

  const [updated] = await db
    .update(sets)
    .set(updateData)
    .where(eq(sets.id, setId))
    .returning()
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest) {
  const url = new URL(_.url)
  const setId = parseInt(url.searchParams.get("setId") ?? "0")
  await db.delete(sets).where(eq(sets.id, setId))
  return NextResponse.json({ ok: true })
}
