import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { foodLog } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { AddFoodLogSchema } from "@/lib/validators"
import { todayStr } from "@/lib/utils"
import { getActiveProfileId } from "@/lib/profile"
import { awardXp, getWeekStr, updateChallengeProgress } from "@/lib/gamification"

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date") ?? todayStr()

  const entries = await db
    .select()
    .from(foodLog)
    .where(and(eq(foodLog.dateStr, dateStr), eq(foodLog.profileId, profileId)))
    .orderBy(asc(foodLog.loggedAt))

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = AddFoodLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const [entry] = await db.insert(foodLog).values({ ...parsed.data, profileId }).returning()

  // Award XP only once per day for nutrition logging
  const sqlite = (db as any).session?.client ?? (db as any)._client
  const today = todayStr()
  const alreadyAwarded = sqlite.prepare(`
    SELECT id FROM xp_events
    WHERE profile_id = ? AND event_type = 'nutrition_logged' AND date_str = ?
    LIMIT 1
  `).get(profileId, today)

  if (!alreadyAwarded) {
    await awardXp(db, profileId, "nutrition_logged", undefined, undefined, "Daily nutrition logged")
    await updateChallengeProgress(db, profileId, getWeekStr(), "nutrition_logged", 1)
  }

  return NextResponse.json(entry, { status: 201 })
}
