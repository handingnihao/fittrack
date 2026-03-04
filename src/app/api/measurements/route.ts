import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { awardXp, checkAndAwardAchievements } from "@/lib/gamification"
import { todayStr } from "@/lib/utils"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") ?? "10")
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const rows = sqlite.prepare(
    `SELECT * FROM measurements WHERE profile_id = ? ORDER BY date_str DESC LIMIT ?`
  ).all(profileId, limit) as object[]

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const dateStr = body.dateStr ?? todayStr()

  const result = sqlite.prepare(`
    INSERT INTO measurements (
      profile_id, date_str, chest_cm, waist_cm, hips_cm,
      left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm,
      neck_cm, shoulders_cm, body_fat_pct, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    profileId, dateStr,
    body.chestCm ?? null, body.waistCm ?? null, body.hipsCm ?? null,
    body.leftArmCm ?? null, body.rightArmCm ?? null,
    body.leftThighCm ?? null, body.rightThighCm ?? null,
    body.neckCm ?? null, body.shouldersCm ?? null,
    body.bodyFatPct ?? null, body.notes ?? null
  )

  // Award XP
  await awardXp(db, profileId, "measurement_logged", undefined, undefined, "Body measurement logged")

  // Update profile_stats
  sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)

  // Check achievements
  const newAchievements = await checkAndAwardAchievements(db, profileId)

  const row = sqlite.prepare(`SELECT * FROM measurements WHERE id = ?`).get(result.lastInsertRowid) as object
  return NextResponse.json({ measurement: row, newAchievements }, { status: 201 })
}
