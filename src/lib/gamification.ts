import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import type * as schema from "@/db/schema"
import { todayStr } from "@/lib/utils"
import { format } from "date-fns"

// ─────────────────────────────────────────────
// XP RULES
// ─────────────────────────────────────────────
export const XP_RULES = {
  workout_complete: 50,
  pr_set: 100,
  nutrition_logged: 20,
  challenge_complete: 150,
  streak_7: 200,
  streak_30: 500,
  measurement_logged: 30,
} as const

export type XpEventType = "workout_complete" | "pr_set" | "nutrition_logged" | "challenge_complete" | "streak_milestone" | "measurement_logged"

// ─────────────────────────────────────────────
// LEVEL THRESHOLDS
// ─────────────────────────────────────────────
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000]

export interface LevelInfo {
  level: number
  currentXp: number
  xpToNextLevel: number | null
  progressPct: number
}

export function getLevel(totalXp: number): LevelInfo {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  const levelIdx = level - 1
  const levelStart = LEVEL_THRESHOLDS[levelIdx] ?? 0
  const levelEnd = LEVEL_THRESHOLDS[level] ?? null
  const currentXp = totalXp - levelStart
  const xpToNextLevel = levelEnd != null ? levelEnd - levelStart : null
  const progressPct = xpToNextLevel != null ? Math.min(currentXp / xpToNextLevel, 1) : 1
  return { level, currentXp, xpToNextLevel, progressPct }
}

// ─────────────────────────────────────────────
// ACHIEVEMENT DEFINITIONS
// ─────────────────────────────────────────────
export interface AchievementDef {
  key: string
  title: string
  description: string
  icon: string
  category: "workouts" | "streaks" | "prs" | "nutrition" | "volume" | "misc"
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Workouts
  { key: "first_workout", title: "First Rep", description: "Complete your first workout", icon: "🏋️", category: "workouts" },
  { key: "workouts_10", title: "Consistent", description: "Complete 10 workouts", icon: "💪", category: "workouts" },
  { key: "workouts_50", title: "Dedicated", description: "Complete 50 workouts", icon: "🔥", category: "workouts" },
  { key: "workouts_100", title: "Centurion", description: "Complete 100 workouts", icon: "🏆", category: "workouts" },
  { key: "workouts_250", title: "Legend", description: "Complete 250 workouts", icon: "👑", category: "workouts" },
  // Streaks
  { key: "streak_3", title: "Warm Up", description: "3-day workout streak", icon: "🌡️", category: "streaks" },
  { key: "streak_7", title: "Full Week", description: "7-day workout streak", icon: "📅", category: "streaks" },
  { key: "streak_14", title: "Two Weeks", description: "14-day workout streak", icon: "⚡", category: "streaks" },
  { key: "streak_30", title: "Monthly Warrior", description: "30-day workout streak", icon: "🦁", category: "streaks" },
  { key: "streak_100", title: "Unstoppable", description: "100-day workout streak", icon: "🌟", category: "streaks" },
  // PRs
  { key: "first_pr", title: "Personal Best", description: "Set your first PR", icon: "🥇", category: "prs" },
  { key: "prs_10", title: "PR Machine", description: "Set 10 personal records", icon: "📈", category: "prs" },
  { key: "prs_50", title: "Strength God", description: "Set 50 personal records", icon: "⚡", category: "prs" },
  { key: "prs_100", title: "PR Legend", description: "Set 100 personal records", icon: "💯", category: "prs" },
  // Nutrition
  { key: "first_nutrition", title: "Fueled Up", description: "Log your first meal", icon: "🍎", category: "nutrition" },
  { key: "nutrition_7days", title: "Week of Eating", description: "Log nutrition 7 days in a row", icon: "📊", category: "nutrition" },
  { key: "nutrition_30days", title: "Month of Macros", description: "Log nutrition 30 days in a row", icon: "🥗", category: "nutrition" },
  { key: "hit_protein_7", title: "Protein King", description: "Hit protein goal 7 days in a row", icon: "🥩", category: "nutrition" },
  { key: "calorie_goal_14", title: "Calorie Perfect", description: "Hit calorie goal 14 days in a row", icon: "🎯", category: "nutrition" },
  // Volume
  { key: "volume_10k_lbs", title: "Iron Starter", description: "Lift 10,000 lbs total volume", icon: "🏗️", category: "volume" },
  { key: "volume_100k_lbs", title: "Iron Worker", description: "Lift 100,000 lbs total volume", icon: "⚙️", category: "volume" },
  { key: "volume_500k_lbs", title: "Iron Master", description: "Lift 500,000 lbs total volume", icon: "🔩", category: "volume" },
  { key: "volume_1m_lbs", title: "Iron God", description: "Lift 1,000,000 lbs total volume", icon: "🏛️", category: "volume" },
  // Misc
  { key: "first_measurement", title: "Body Check", description: "Log your first body measurement", icon: "📏", category: "misc" },
  { key: "first_photo", title: "Before Shot", description: "Upload your first progress photo", icon: "📸", category: "misc" },
  { key: "early_bird", title: "Early Bird", description: "Complete a workout before 7am", icon: "🌅", category: "misc" },
  { key: "night_owl", title: "Night Owl", description: "Complete a workout after 10pm", icon: "🦉", category: "misc" },
  { key: "variety_5exercises", title: "Variety Show", description: "Use 5 different exercises in one workout", icon: "🎭", category: "misc" },
  { key: "all_categories_week", title: "Well Rounded", description: "Train every muscle group in one week", icon: "🔄", category: "misc" },
  { key: "water_goal_7", title: "Hydration Hero", description: "Hit water goal 7 days in a row", icon: "💧", category: "misc" },
  { key: "level_5", title: "Rising Star", description: "Reach level 5", icon: "⭐", category: "misc" },
  { key: "level_10", title: "Veteran", description: "Reach level 10", icon: "🌟", category: "misc" },
  { key: "level_max", title: "Maxed Out", description: "Reach the maximum level", icon: "👑", category: "misc" },
]

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENT_DEFS.map((a) => [a.key, a]))

// ─────────────────────────────────────────────
// CHALLENGE TEMPLATES
// ─────────────────────────────────────────────
export interface ChallengeTemplate {
  key: string
  title: string
  description: string
  targetValue: number
  xpReward: number
  eventType: XpEventType | "any"
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { key: "workouts_3", title: "Triple Threat", description: "Complete 3 workouts this week", targetValue: 3, xpReward: 150, eventType: "workout_complete" },
  { key: "workouts_4", title: "Four Days Strong", description: "Complete 4 workouts this week", targetValue: 4, xpReward: 200, eventType: "workout_complete" },
  { key: "workouts_5", title: "Five Star Week", description: "Complete 5 workouts this week", targetValue: 5, xpReward: 300, eventType: "workout_complete" },
  { key: "nutrition_5", title: "Macro Tracker", description: "Log nutrition for 5 days this week", targetValue: 5, xpReward: 150, eventType: "nutrition_logged" },
  { key: "nutrition_7", title: "Perfect Logging", description: "Log nutrition every day this week", targetValue: 7, xpReward: 200, eventType: "nutrition_logged" },
  { key: "pr_2", title: "PR Chaser", description: "Set 2 personal records this week", targetValue: 2, xpReward: 200, eventType: "pr_set" },
  { key: "pr_5", title: "Record Breaker", description: "Set 5 personal records this week", targetValue: 5, xpReward: 300, eventType: "pr_set" },
  { key: "measurement_1", title: "Body Check", description: "Log a body measurement this week", targetValue: 1, xpReward: 100, eventType: "measurement_logged" },
  { key: "workouts_2", title: "Getting Started", description: "Complete 2 workouts this week", targetValue: 2, xpReward: 100, eventType: "workout_complete" },
]

// ─────────────────────────────────────────────
// WEEK STRING (ISO week)
// ─────────────────────────────────────────────
export function getWeekStr(date?: Date): string {
  const d = date ?? new Date()
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, "0")}`
}

// ─────────────────────────────────────────────
// DB HELPER TYPES
// ─────────────────────────────────────────────
type Db = ReturnType<typeof import("drizzle-orm/better-sqlite3").drizzle>

// ─────────────────────────────────────────────
// AWARD XP
// ─────────────────────────────────────────────
export async function awardXp(
  db: Db,
  profileId: number,
  eventType: XpEventType,
  xpOverride?: number,
  refId?: number,
  description?: string
): Promise<{ xpGained: number; newLevel?: number }> {
  const xpGained = xpOverride ?? (eventType === "streak_milestone" ? XP_RULES.streak_7 : XP_RULES[eventType as keyof typeof XP_RULES] ?? 0)
  const today = todayStr()

  // Insert XP event
  // Use raw SQL via the db instance
  const sqlite = (db as any).session?.client ?? (db as any)._client
  if (sqlite) {
    sqlite.prepare(`
      INSERT INTO xp_events (profile_id, event_type, xp_gained, ref_id, description, date_str)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(profileId, eventType, xpGained, refId ?? null, description ?? null, today)

    // Upsert profile_stats
    sqlite.prepare(`
      INSERT INTO profile_stats (profile_id, total_xp, level)
      VALUES (?, ?, 1)
      ON CONFLICT(profile_id) DO UPDATE SET total_xp = total_xp + ?
    `).run(profileId, xpGained, xpGained)

    const stats = sqlite.prepare(`SELECT total_xp FROM profile_stats WHERE profile_id = ?`).get(profileId) as { total_xp: number } | null
    const totalXp = stats?.total_xp ?? xpGained
    const { level } = getLevel(totalXp)

    // Update level in stats
    sqlite.prepare(`UPDATE profile_stats SET level = ? WHERE profile_id = ?`).run(level, profileId)
    return { xpGained, newLevel: level }
  }

  return { xpGained }
}

// ─────────────────────────────────────────────
// CHECK AND AWARD ACHIEVEMENTS
// ─────────────────────────────────────────────
export async function checkAndAwardAchievements(
  db: Db,
  profileId: number
): Promise<string[]> {
  const sqlite = (db as any).session?.client ?? (db as any)._client
  if (!sqlite) return []

  const newKeys: string[] = []

  // Get current stats
  const stats = sqlite.prepare(`SELECT * FROM profile_stats WHERE profile_id = ?`).get(profileId) as {
    total_xp: number; level: number; lifetime_workouts: number; lifetime_prs: number; lifetime_volume_kg: number;
  } | null

  const existingKeys = new Set(
    (sqlite.prepare(`SELECT achievement_key FROM achievements WHERE profile_id = ?`).all(profileId) as { achievement_key: string }[]).map((r) => r.achievement_key)
  )

  function tryAward(key: string, condition: boolean) {
    if (condition && !existingKeys.has(key)) {
      sqlite.prepare(`INSERT OR IGNORE INTO achievements (profile_id, achievement_key) VALUES (?, ?)`).run(profileId, key)
      existingKeys.add(key)
      newKeys.push(key)
    }
  }

  const workouts = stats?.lifetime_workouts ?? 0
  const prs = stats?.lifetime_prs ?? 0
  const volumeKg = stats?.lifetime_volume_kg ?? 0
  const volumeLbs = volumeKg * 2.20462
  const level = stats?.level ?? 1

  tryAward("first_workout", workouts >= 1)
  tryAward("workouts_10", workouts >= 10)
  tryAward("workouts_50", workouts >= 50)
  tryAward("workouts_100", workouts >= 100)
  tryAward("workouts_250", workouts >= 250)
  tryAward("first_pr", prs >= 1)
  tryAward("prs_10", prs >= 10)
  tryAward("prs_50", prs >= 50)
  tryAward("prs_100", prs >= 100)
  tryAward("volume_10k_lbs", volumeLbs >= 10000)
  tryAward("volume_100k_lbs", volumeLbs >= 100000)
  tryAward("volume_500k_lbs", volumeLbs >= 500000)
  tryAward("volume_1m_lbs", volumeLbs >= 1000000)
  tryAward("level_5", level >= 5)
  tryAward("level_10", level >= 10)
  tryAward("level_max", level >= LEVEL_THRESHOLDS.length)

  // Check measurements
  const measCount = (sqlite.prepare(`SELECT COUNT(*) as c FROM measurements WHERE profile_id = ?`).get(profileId) as { c: number }).c
  tryAward("first_measurement", measCount >= 1)

  // Check photos
  const photoCount = (sqlite.prepare(`SELECT COUNT(*) as c FROM progress_photos WHERE profile_id = ?`).get(profileId) as { c: number }).c
  tryAward("first_photo", photoCount >= 1)

  // Check food log for first nutrition
  const foodCount = (sqlite.prepare(`SELECT COUNT(*) as c FROM food_log WHERE profile_id = ?`).get(profileId) as { c: number }).c
  tryAward("first_nutrition", foodCount >= 1)

  return newKeys
}

// ─────────────────────────────────────────────
// WEEKLY CHALLENGES
// ─────────────────────────────────────────────
export async function getOrCreateWeeklyChallenges(
  db: Db,
  profileId: number,
  weekStr: string
): Promise<object[]> {
  const sqlite = (db as any).session?.client ?? (db as any)._client
  if (!sqlite) return []

  const existing = sqlite.prepare(`SELECT * FROM challenges WHERE profile_id = ? AND week_str = ?`).all(profileId, weekStr) as object[]
  if (existing.length > 0) return existing

  // Pick 3 random non-repeating challenges
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3)
  const stmt = sqlite.prepare(`
    INSERT INTO challenges (profile_id, week_str, challenge_key, title, description, target_value, xp_reward)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const t of shuffled) {
    stmt.run(profileId, weekStr, t.key, t.title, t.description, t.targetValue, t.xpReward)
  }

  return sqlite.prepare(`SELECT * FROM challenges WHERE profile_id = ? AND week_str = ?`).all(profileId, weekStr) as object[]
}

export async function updateChallengeProgress(
  db: Db,
  profileId: number,
  weekStr: string,
  eventType: XpEventType | "any",
  value: number
): Promise<string[]> {
  const sqlite = (db as any).session?.client ?? (db as any)._client
  if (!sqlite) return []

  const completedKeys: string[] = []

  // Find matching challenges
  const challenges = sqlite.prepare(`
    SELECT * FROM challenges WHERE profile_id = ? AND week_str = ? AND is_completed = 0
  `).all(profileId, weekStr) as { id: number; challenge_key: string; target_value: number; current_value: number; xp_reward: number }[]

  for (const ch of challenges) {
    const template = CHALLENGE_TEMPLATES.find((t) => t.key === ch.challenge_key)
    if (!template) continue
    if (template.eventType !== "any" && template.eventType !== eventType) continue

    const newVal = ch.current_value + value
    if (newVal >= ch.target_value) {
      sqlite.prepare(`
        UPDATE challenges SET current_value = ?, is_completed = 1, completed_at = unixepoch()
        WHERE id = ?
      `).run(ch.target_value, ch.id)
      // Award XP for completing challenge
      await awardXp(db, profileId, "challenge_complete", ch.xp_reward, ch.id, `Challenge: ${ch.challenge_key}`)
      completedKeys.push(ch.challenge_key)
    } else {
      sqlite.prepare(`UPDATE challenges SET current_value = ? WHERE id = ?`).run(newVal, ch.id)
    }
  }

  return completedKeys
}

// ─────────────────────────────────────────────
// STREAK FREEZE
// ─────────────────────────────────────────────
export async function earnStreakFreezeIfEligible(
  db: Db,
  profileId: number,
  weekStr: string
): Promise<boolean> {
  const sqlite = (db as any).session?.client ?? (db as any)._client
  if (!sqlite) return false

  const stats = sqlite.prepare(`SELECT streak_freeze_tokens, last_freeze_earned_week FROM profile_stats WHERE profile_id = ?`).get(profileId) as {
    streak_freeze_tokens: number; last_freeze_earned_week: string | null
  } | null

  if (!stats) return false
  if (stats.last_freeze_earned_week === weekStr) return false // Already earned this week
  if (stats.streak_freeze_tokens >= 3) return false // Max stored

  // Count workouts this week
  const weekWorkouts = sqlite.prepare(`
    SELECT COUNT(DISTINCT date_str) as c FROM workout_sessions WHERE profile_id = ? AND date_str >= ? AND date_str <= ?
  `).get(profileId, weekStr + "-Mon", weekStr + "-Sun") as { c: number } | null

  // Simpler: just check if they worked out enough (at least 3 days this week)
  const startOfWeek = getWeekStartDate(weekStr)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 6)

  const weekStart = format(startOfWeek, "yyyy-MM-dd")
  const weekEnd = format(endOfWeek, "yyyy-MM-dd")

  const count = (sqlite.prepare(`
    SELECT COUNT(DISTINCT date_str) as c FROM workout_sessions
    WHERE profile_id = ? AND date_str >= ? AND date_str <= ?
  `).get(profileId, weekStart, weekEnd) as { c: number }).c

  if (count < 3) return false

  sqlite.prepare(`
    UPDATE profile_stats SET streak_freeze_tokens = streak_freeze_tokens + 1, last_freeze_earned_week = ?
    WHERE profile_id = ?
  `).run(weekStr, profileId)

  return true
}

function getWeekStartDate(weekStr: string): Date {
  const [year, week] = weekStr.split("-W").map(Number)
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay() // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const firstMonday = new Date(jan1)
  firstMonday.setDate(jan1.getDate() + daysToMonday)
  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7)
  return weekStart
}
