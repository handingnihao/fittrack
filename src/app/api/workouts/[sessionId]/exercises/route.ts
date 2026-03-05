import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { loggedExercises, exercises, sets } from "@/db/schema"
import { eq, asc, inArray } from "drizzle-orm"
import { AddLoggedExerciseSchema } from "@/lib/validators"

export async function GET(_: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = parseInt(params.sessionId)
  const exs = await db
    .select()
    .from(loggedExercises)
    .where(eq(loggedExercises.sessionId, sessionId))
    .orderBy(asc(loggedExercises.sortOrder))

  // Fetch categories for all exercise IDs in this session
  const exerciseIds = exs.map((e) => e.exerciseId)
  const catMap: Record<number, string> = {}
  if (exerciseIds.length > 0) {
    const cats = await db
      .select({ id: exercises.id, category: exercises.category })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds))
    for (const c of cats) catMap[c.id] = c.category
  }

  const withSets = await Promise.all(
    exs.map(async (ex) => {
      const exSets = await db
        .select()
        .from(sets)
        .where(eq(sets.loggedExerciseId, ex.id))
        .orderBy(asc(sets.setNumber))
      return { ...ex, sets: exSets, exerciseCategory: catMap[ex.exerciseId] ?? null }
    })
  )
  return NextResponse.json(withSets)
}

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = parseInt(params.sessionId)
  const body = await req.json()
  const parsed = AddLoggedExerciseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Get exercise name and category
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, parsed.data.exerciseId))
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 })

  const [logged] = await db
    .insert(loggedExercises)
    .values({ ...parsed.data, sessionId, exerciseName: ex.name })
    .returning()
  return NextResponse.json({ ...logged, sets: [], exerciseCategory: ex.category }, { status: 201 })
}
