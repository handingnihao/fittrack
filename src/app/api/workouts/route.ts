import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { workoutSessions, loggedExercises, routineExercises, exercises } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { CreateSessionSchema } from "@/lib/validators"
import { format } from "date-fns"
import { seedExercises } from "@/db/seed"
import { getActiveProfileId } from "@/lib/profile"

// Ensure exercise library is seeded on first access
let seeded = false
async function ensureSeeded() {
  if (!seeded) {
    await seedExercises()
    seeded = true
  }
}

export async function GET(req: NextRequest) {
  await ensureSeeded()
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)

  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.profileId, profileId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit)

  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  await ensureSeeded()
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  const dateStr = parsed.data.dateStr ?? format(now, "yyyy-MM-dd")

  const [session] = await db
    .insert(workoutSessions)
    .values({
      ...parsed.data,
      profileId,
      startedAt: now,
      dateStr,
    })
    .returning()

  // If from a routine, pre-populate logged exercises
  if (parsed.data.routineId) {
    const routineExs = await db
      .select({ exerciseId: routineExercises.exerciseId, sortOrder: routineExercises.sortOrder, name: exercises.name })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(eq(routineExercises.routineId, parsed.data.routineId))

    for (const re of routineExs) {
      await db.insert(loggedExercises).values({
        sessionId: session.id,
        exerciseId: re.exerciseId,
        exerciseName: re.name,
        sortOrder: re.sortOrder,
      })
    }
  }

  return NextResponse.json(session, { status: 201 })
}
