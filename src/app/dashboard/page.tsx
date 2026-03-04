import type { Metadata } from "next"
import { Suspense } from "react"
import { db } from "@/db"
import { foodLog, profile, workoutSessions } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { todayStr, formatDateStr } from "@/lib/utils"
import { MacroRingsGroup } from "@/components/dashboard/MacroRingsGroup"
import { CalorieProgressBar } from "@/components/dashboard/CalorieProgressBar"
import { TodayWorkoutWidget } from "@/components/dashboard/TodayWorkoutWidget"
import { WeeklyStatsPanel } from "@/components/dashboard/WeeklyStatsPanel"
import { WeightWidget } from "@/components/dashboard/WeightWidget"
import { XPLevelWidget } from "@/components/dashboard/XPLevelWidget"
import { ChallengesWidget } from "@/components/dashboard/ChallengesWidget"
import { AchievementsWidget } from "@/components/dashboard/AchievementsWidget"
import { WaterWidget } from "@/components/dashboard/WaterWidget"
import { MuscleHeatmapWidget } from "@/components/dashboard/MuscleHeatmapWidget"
import { MotivationalWidget } from "@/components/dashboard/MotivationalWidget"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { format, subDays, startOfWeek, eachDayOfInterval, addWeeks, addDays } from "date-fns"

export const metadata: Metadata = { title: "Dashboard" }
export const revalidate = 0

async function getDashboardData() {
  const today = todayStr()
  const now = new Date()

  const [userProfile] = await db.select().from(profile).where(eq(profile.id, 1))
  const todayEntries = await db.select().from(foodLog).where(eq(foodLog.dateStr, today))

  const totals = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  // 28-day rolling window for weekly stats
  const window28Start = format(subDays(now, 27), "yyyy-MM-dd")
  const todayDateStr = format(now, "yyyy-MM-dd")

  const [sessions28, logs28] = await Promise.all([
    db.select({ dateStr: workoutSessions.dateStr })
      .from(workoutSessions)
      .where(and(gte(workoutSessions.dateStr, window28Start), lte(workoutSessions.dateStr, todayDateStr))),
    db.select({ dateStr: foodLog.dateStr, calories: foodLog.calories })
      .from(foodLog)
      .where(and(gte(foodLog.dateStr, window28Start), lte(foodLog.dateStr, todayDateStr))),
  ])

  const workoutByDay = new Map<string, number>()
  for (const s of sessions28) workoutByDay.set(s.dateStr, (workoutByDay.get(s.dateStr) ?? 0) + 1)

  const calsByDay = new Map<string, number>()
  for (const l of logs28) calsByDay.set(l.dateStr, (calsByDay.get(l.dateStr) ?? 0) + l.calories)

  const targetCals = userProfile?.targetCalories ?? 2000

  function countStreak(check: (ds: string) => boolean): number {
    let streak = 0
    let d = new Date(now)
    while (true) {
      const ds = format(d, "yyyy-MM-dd")
      if (!check(ds)) break
      streak++
      d = subDays(d, 1)
      if (streak > 28) break
    }
    return streak
  }

  const workoutStreak = countStreak((ds) => (workoutByDay.get(ds) ?? 0) > 0)
  const nutritionStreak = countStreak((ds) => (calsByDay.get(ds) ?? 0) > 0)

  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const daysThisWeek = eachDayOfInterval({ start: monday, end: now })
  const thisWeekWorkouts = daysThisWeek.filter(
    (d) => (workoutByDay.get(format(d, "yyyy-MM-dd")) ?? 0) > 0
  ).length
  const thisWeekCalPercents = daysThisWeek.map((d) =>
    Math.min((calsByDay.get(format(d, "yyyy-MM-dd")) ?? 0) / targetCals, 1)
  )
  const thisWeekAvgCalPercent =
    thisWeekCalPercents.reduce((a, b) => a + b, 0) / Math.max(thisWeekCalPercents.length, 1)

  const weeklyBuckets = [-3, -2, -1, 0].map((offset) => {
    const weekStart = addWeeks(monday, offset)
    const weekEnd = offset === 0 ? now : addDays(weekStart, 6)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const workoutDays = days.filter((d) => (workoutByDay.get(format(d, "yyyy-MM-dd")) ?? 0) > 0).length
    const calPercents = days.map((d) =>
      Math.min((calsByDay.get(format(d, "yyyy-MM-dd")) ?? 0) / targetCals, 1)
    )
    const avgCalPercent = calPercents.reduce((a, b) => a + b, 0) / Math.max(calPercents.length, 1)
    const label =
      offset === 0 ? "This wk" :
      offset === -1 ? "Last wk" :
      `${format(weekStart, "M/d")}–${format(weekEnd, "M/d")}`
    return { label, workoutDays, avgCalPercent }
  })

  return {
    summary: {
      ...totals,
      targetCalories: userProfile?.targetCalories ?? 2000,
      targetProteinG: userProfile?.targetProteinG ?? 150,
      targetCarbsG: userProfile?.targetCarbsG ?? 200,
      targetFatG: userProfile?.targetFatG ?? 65,
    },
    weeklyStats: { workoutStreak, nutritionStreak, thisWeekWorkouts, thisWeekAvgCalPercent, weeklyBuckets },
    today,
  }
}

export default async function DashboardPage() {
  const { summary, weeklyStats, today } = await getDashboardData()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDateStr(today)}</p>
      </div>

      {/* Daily quote */}
      <MotivationalWidget />

      {/* Macro rings */}
      <MacroRingsGroup summary={summary} />

      {/* Calorie bar + today's workout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalorieProgressBar summary={summary} />
        <Suspense fallback={<div className="bento-card animate-pulse h-32" />}>
          <TodayWorkoutWidget />
        </Suspense>
      </div>

      {/* Weekly stats panel */}
      <WeeklyStatsPanel stats={weeklyStats} />

      {/* XP Level + Challenges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <XPLevelWidget />
        <ChallengesWidget />
      </div>

      {/* Water + Body weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WaterWidget />
        <WeightWidget />
      </div>

      {/* Muscle heatmap + Achievements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MuscleHeatmapWidget />
        <AchievementsWidget />
      </div>
    </div>
  )
}
