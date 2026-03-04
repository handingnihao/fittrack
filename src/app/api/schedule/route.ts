import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const rows = sqlite.prepare(`
    SELECT rs.*, r.name as routine_name, r.color as routine_color
    FROM routine_schedule rs
    JOIN routines r ON rs.routine_id = r.id
    WHERE r.profile_id = ?
    ORDER BY rs.routine_id, rs.day_of_week
  `).all(profileId) as object[]

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const { routineId, dayOfWeek, enabled } = body
  const sqlite = (db as any).session?.client ?? (db as any)._client

  // Verify routine belongs to profile
  const routine = sqlite.prepare(`SELECT id FROM routines WHERE id = ? AND profile_id = ?`).get(routineId, profileId)
  if (!routine) return NextResponse.json({ error: "Routine not found" }, { status: 404 })

  if (enabled) {
    sqlite.prepare(`INSERT OR IGNORE INTO routine_schedule (routine_id, day_of_week) VALUES (?, ?)`).run(routineId, dayOfWeek)
  } else {
    sqlite.prepare(`DELETE FROM routine_schedule WHERE routine_id = ? AND day_of_week = ?`).run(routineId, dayOfWeek)
  }

  return NextResponse.json({ ok: true })
}
