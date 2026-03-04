import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { todayStr } from "@/lib/utils"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date") ?? todayStr()
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const row = sqlite.prepare(
    `SELECT * FROM water_log WHERE profile_id = ? AND date_str = ?`
  ).get(profileId, dateStr) as { total_ml: number; goal_ml: number } | null

  return NextResponse.json(row ?? { totalMl: 0, goalMl: 2500, dateStr })
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const { dateStr, totalMl, goalMl } = body
  const sqlite = (db as any).session?.client ?? (db as any)._client

  sqlite.prepare(`
    INSERT INTO water_log (profile_id, date_str, total_ml, goal_ml, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(profile_id, date_str) DO UPDATE SET
      total_ml = excluded.total_ml,
      goal_ml = COALESCE(excluded.goal_ml, goal_ml),
      updated_at = unixepoch()
  `).run(profileId, dateStr ?? todayStr(), totalMl ?? 0, goalMl ?? 2500)

  const row = sqlite.prepare(
    `SELECT * FROM water_log WHERE profile_id = ? AND date_str = ?`
  ).get(profileId, dateStr ?? todayStr()) as object

  return NextResponse.json(row)
}
