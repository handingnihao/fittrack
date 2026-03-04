import { NextRequest, NextResponse } from "next/server"
import { exportAllDataAsJson, exportWorkoutsCsv, exportNutritionCsv } from "@/lib/export"
import { db } from "@/db"
import { exercises, foods, workoutSessions, loggedExercises, sets, foodLog, routines, profile } from "@/db/schema"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") ?? "json"
  const profileId = getActiveProfileId(req)

  if (format === "workouts-csv") {
    const csv = await exportWorkoutsCsv(profileId)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fittrack-workouts.csv"`,
      },
    })
  }

  if (format === "nutrition-csv") {
    const csv = await exportNutritionCsv(profileId)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fittrack-nutrition.csv"`,
      },
    })
  }

  // Default: full JSON backup
  const data = await exportAllDataAsJson(profileId)
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fittrack-backup.json"`,
    },
  })
}

// Import endpoint — merges data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body?.data || body?.version !== "1.0") {
      return NextResponse.json({ error: "Invalid backup format. Expected version 1.0" }, { status: 400 })
    }

    const { data } = body
    let imported = 0

    // Import exercises
    if (Array.isArray(data.exercises)) {
      for (const ex of data.exercises) {
        try {
          await db.insert(exercises).values(ex).onConflictDoNothing()
          imported++
        } catch { /* skip */ }
      }
    }

    // Import foods
    if (Array.isArray(data.foods)) {
      for (const food of data.foods) {
        try {
          await db.insert(foods).values(food).onConflictDoNothing()
          imported++
        } catch { /* skip */ }
      }
    }

    // Import food log
    if (Array.isArray(data.foodLog)) {
      for (const entry of data.foodLog) {
        try {
          await db.insert(foodLog).values(entry).onConflictDoNothing()
          imported++
        } catch { /* skip */ }
      }
    }

    return NextResponse.json({ ok: true, imported })
  } catch (e) {
    return NextResponse.json({ error: "Failed to parse backup" }, { status: 400 })
  }
}
