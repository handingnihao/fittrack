import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { routines, routineExercises, exercises } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getActiveProfileId } from "@/lib/profile"

interface ImportExercise {
  exerciseName: string
  category?: string
  equipment?: string
  muscleGroup?: string
  sortOrder?: number
  defaultSets?: number
  defaultRepsMin?: number
  defaultRepsMax?: number
  defaultWeightKg?: number | null
  restSeconds?: number
  notes?: string | null
}

interface ImportRoutine {
  name: string
  description?: string | null
  color?: string
  exercises: ImportExercise[]
}

interface ImportPayload {
  version: number
  routines: ImportRoutine[]
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body: ImportPayload = await req.json()

  if (!body || body.version !== 1 || !Array.isArray(body.routines)) {
    return NextResponse.json({ error: "Invalid import file format" }, { status: 400 })
  }

  const created: string[] = []

  for (const r of body.routines) {
    if (!r.name || typeof r.name !== "string") continue

    // Create the routine
    const [routine] = await db
      .insert(routines)
      .values({
        profileId,
        name: r.name.trim(),
        description: r.description ?? null,
        color: r.color ?? "#a78bfa",
        sortOrder: 0,
      })
      .returning()

    // Insert each exercise
    const exArr = Array.isArray(r.exercises) ? r.exercises : []
    for (let i = 0; i < exArr.length; i++) {
      const ex = exArr[i]
      if (!ex.exerciseName) continue

      // Find existing exercise by name (case-insensitive)
      const allExs = await db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)

      const match = allExs.find(
        (e) => e.name.toLowerCase() === ex.exerciseName.toLowerCase()
      )

      let exerciseId: number
      if (match) {
        exerciseId = match.id
      } else {
        // Create as custom exercise
        const [newEx] = await db
          .insert(exercises)
          .values({
            name: ex.exerciseName.trim(),
            category: (ex.category as "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio" | "other") ?? "other",
            equipment: (ex.equipment as "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable" | "other") ?? null,
            muscleGroup: ex.muscleGroup ?? null,
            isCustom: true,
          })
          .returning()
        exerciseId = newEx.id
      }

      await db.insert(routineExercises).values({
        routineId: routine.id,
        exerciseId,
        sortOrder: ex.sortOrder ?? i,
        defaultSets: ex.defaultSets ?? 3,
        defaultRepsMin: ex.defaultRepsMin ?? 8,
        defaultRepsMax: ex.defaultRepsMax ?? 12,
        defaultWeightKg: ex.defaultWeightKg ?? null,
        restSeconds: ex.restSeconds ?? 90,
        notes: ex.notes ?? null,
      })
    }

    created.push(routine.name)
  }

  return NextResponse.json({ imported: created.length, routines: created })
}
