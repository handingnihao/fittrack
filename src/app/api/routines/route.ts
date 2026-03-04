import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { routines, routineExercises, exercises } from "@/db/schema"
import { asc, eq } from "drizzle-orm"
import { CreateRoutineSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const allRoutines = await db
    .select()
    .from(routines)
    .where(eq(routines.profileId, profileId))
    .orderBy(asc(routines.sortOrder), asc(routines.createdAt))

  // Fetch exercises for each routine
  const result = await Promise.all(
    allRoutines.map(async (routine) => {
      const exs = await db
        .select({
          id: routineExercises.id,
          exerciseId: routineExercises.exerciseId,
          exerciseName: exercises.name,
          category: exercises.category,
          sortOrder: routineExercises.sortOrder,
          defaultSets: routineExercises.defaultSets,
          defaultRepsMin: routineExercises.defaultRepsMin,
          defaultRepsMax: routineExercises.defaultRepsMax,
          defaultWeightKg: routineExercises.defaultWeightKg,
          restSeconds: routineExercises.restSeconds,
          notes: routineExercises.notes,
        })
        .from(routineExercises)
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(eq(routineExercises.routineId, routine.id))
        .orderBy(asc(routineExercises.sortOrder))
      return { ...routine, exercises: exs }
    })
  )

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = CreateRoutineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [routine] = await db.insert(routines).values({ ...parsed.data, profileId }).returning()
  return NextResponse.json({ ...routine, exercises: [] }, { status: 201 })
}
