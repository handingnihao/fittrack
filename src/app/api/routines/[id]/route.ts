import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { routines, routineExercises, exercises } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { UpdateRoutineSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const profileId = getActiveProfileId(req)
  const [routine] = await db.select().from(routines).where(and(eq(routines.id, id), eq(routines.profileId, profileId)))
  if (!routine) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
    .where(eq(routineExercises.routineId, id))
    .orderBy(asc(routineExercises.sortOrder))

  return NextResponse.json({ ...routine, exercises: exs })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = UpdateRoutineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [updated] = await db
    .update(routines)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(routines.id, id), eq(routines.profileId, profileId)))
    .returning()
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const profileId = getActiveProfileId(req)
  await db.delete(routines).where(and(eq(routines.id, id), eq(routines.profileId, profileId)))
  return NextResponse.json({ ok: true })
}
