import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { routines, routineExercises, exercises } from "@/db/schema"
import { asc, eq } from "drizzle-orm"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)

  const allRoutines = await db
    .select()
    .from(routines)
    .where(eq(routines.profileId, profileId))
    .orderBy(asc(routines.sortOrder), asc(routines.createdAt))

  const result = await Promise.all(
    allRoutines.map(async (routine) => {
      const exs = await db
        .select({
          exerciseName: exercises.name,
          category: exercises.category,
          equipment: exercises.equipment,
          muscleGroup: exercises.muscleGroup,
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

      return {
        name: routine.name,
        description: routine.description,
        color: routine.color,
        exercises: exs,
      }
    })
  )

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    routines: result,
  }

  return NextResponse.json(payload)
}
