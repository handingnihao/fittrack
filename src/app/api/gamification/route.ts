import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { getLevel, getWeekStr, getOrCreateWeeklyChallenges } from "@/lib/gamification"
import { todayStr } from "@/lib/utils"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  // Get or init profile_stats
  const stats = sqlite.prepare(`SELECT * FROM profile_stats WHERE profile_id = ?`).get(profileId) as {
    profile_id: number; total_xp: number; level: number; streak_freeze_tokens: number;
    lifetime_workouts: number; lifetime_prs: number; lifetime_volume_kg: number;
  } | null

  if (!stats) {
    sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)
  }

  const totalXp = stats?.total_xp ?? 0
  const levelInfo = getLevel(totalXp)

  // Recent XP events (last 5)
  const recentXpEvents = sqlite.prepare(`
    SELECT * FROM xp_events WHERE profile_id = ? ORDER BY created_at DESC LIMIT 5
  `).all(profileId) as object[]

  // Recent achievements (last 4)
  const recentAchievements = sqlite.prepare(`
    SELECT * FROM achievements WHERE profile_id = ? ORDER BY unlocked_at DESC LIMIT 4
  `).all(profileId) as { achievement_key: string }[]

  // Current challenges
  const weekStr = getWeekStr()
  await getOrCreateWeeklyChallenges(db, profileId, weekStr)
  const challenges = sqlite.prepare(`SELECT * FROM challenges WHERE profile_id = ? AND week_str = ?`).all(profileId, weekStr) as object[]

  return NextResponse.json({
    stats: stats ?? { profile_id: profileId, total_xp: 0, level: 1, streak_freeze_tokens: 0, lifetime_workouts: 0, lifetime_prs: 0, lifetime_volume_kg: 0 },
    levelInfo,
    recentXpEvents,
    recentAchievements,
    challenges,
  })
}
