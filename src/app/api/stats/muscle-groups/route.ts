import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { format, subDays } from "date-fns"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") ?? "7")
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const since = format(subDays(new Date(), days - 1), "yyyy-MM-dd")

  const rows = sqlite.prepare(`
    SELECT e.category, COUNT(DISTINCT ws.id) as session_count
    FROM workout_sessions ws
    JOIN logged_exercises le ON le.session_id = ws.id
    JOIN exercises e ON le.exercise_id = e.id
    WHERE ws.profile_id = ? AND ws.date_str >= ?
    GROUP BY e.category
  `).all(profileId, since) as { category: string; session_count: number }[]

  const categories = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"]
  const result: Record<string, number> = {}
  for (const cat of categories) result[cat] = 0
  for (const row of rows) result[row.category] = row.session_count

  return NextResponse.json(result)
}
