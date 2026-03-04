import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { getWeekStr, getOrCreateWeeklyChallenges } from "@/lib/gamification"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const weekStr = getWeekStr()
  const challenges = await getOrCreateWeeklyChallenges(db, profileId, weekStr)
  return NextResponse.json(challenges)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json().catch(() => ({}))

  if (body.refresh) {
    const sqlite = (db as any).session?.client ?? (db as any)._client
    const weekStr = getWeekStr()

    // Recalculate workout challenge progress from actual DB data
    const weekStart = getWeekStartFromStr(weekStr)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startStr = weekStart.toISOString().slice(0, 10)
    const endStr = weekEnd.toISOString().slice(0, 10)

    const workoutCount = (sqlite.prepare(`
      SELECT COUNT(*) as c FROM workout_sessions
      WHERE profile_id = ? AND date_str >= ? AND date_str <= ? AND finished_at IS NOT NULL
    `).get(profileId, startStr, endStr) as { c: number }).c

    const nutritionCount = (sqlite.prepare(`
      SELECT COUNT(DISTINCT date_str) as c FROM food_log
      WHERE profile_id = ? AND date_str >= ? AND date_str <= ?
    `).get(profileId, startStr, endStr) as { c: number }).c

    const prCount = (sqlite.prepare(`
      SELECT COUNT(*) as c FROM sets s
      JOIN logged_exercises le ON s.logged_exercise_id = le.id
      JOIN workout_sessions ws ON le.session_id = ws.id
      WHERE ws.profile_id = ? AND ws.date_str >= ? AND ws.date_str <= ? AND s.is_personal_best = 1
    `).get(profileId, startStr, endStr) as { c: number }).c

    const measCount = (sqlite.prepare(`
      SELECT COUNT(*) as c FROM measurements WHERE profile_id = ? AND date_str >= ? AND date_str <= ?
    `).get(profileId, startStr, endStr) as { c: number }).c

    // Update challenge progress
    const challenges = sqlite.prepare(`SELECT * FROM challenges WHERE profile_id = ? AND week_str = ?`).all(profileId, weekStr) as {
      id: number; challenge_key: string; target_value: number; is_completed: number
    }[]

    for (const ch of challenges) {
      if (ch.is_completed) continue
      let val = 0
      if (ch.challenge_key.startsWith("workout")) val = workoutCount
      else if (ch.challenge_key.startsWith("nutrition")) val = nutritionCount
      else if (ch.challenge_key.startsWith("pr")) val = prCount
      else if (ch.challenge_key.startsWith("measurement")) val = measCount

      const capped = Math.min(val, ch.target_value)
      const completed = capped >= ch.target_value
      sqlite.prepare(`UPDATE challenges SET current_value = ?, is_completed = ? WHERE id = ?`)
        .run(capped, completed ? 1 : 0, ch.id)
    }

    const updated = sqlite.prepare(`SELECT * FROM challenges WHERE profile_id = ? AND week_str = ?`).all(profileId, weekStr) as object[]
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Use refresh: true" }, { status: 400 })
}

function getWeekStartFromStr(weekStr: string): Date {
  const [year, week] = weekStr.split("-W").map(Number)
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const firstMonday = new Date(jan1)
  firstMonday.setDate(jan1.getDate() + daysToMonday)
  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7)
  return weekStart
}
