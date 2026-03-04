"use client"
import { useEffect, useState } from "react"
import { Zap, Star } from "lucide-react"
import { getLevel, LEVEL_THRESHOLDS } from "@/lib/gamification"

interface GamificationData {
  stats: { total_xp: number; level: number; lifetime_workouts: number; lifetime_prs: number }
  levelInfo: { level: number; currentXp: number; xpToNextLevel: number | null; progressPct: number }
  recentXpEvents: Array<{ event_type: string; xp_gained: number; description: string | null; date_str: string }>
}

export function XPLevelWidget() {
  const [data, setData] = useState<GamificationData | null>(null)

  useEffect(() => {
    fetch("/api/gamification")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null)
  }, [])

  if (!data) {
    return (
      <div className="bento-card animate-pulse h-36" />
    )
  }

  const { stats, levelInfo, recentXpEvents } = data
  const maxLevel = LEVEL_THRESHOLDS.length

  const eventTypeLabel: Record<string, string> = {
    workout_complete: "Workout",
    pr_set: "Personal Record",
    nutrition_logged: "Nutrition",
    challenge_complete: "Challenge",
    streak_milestone: "Streak",
    measurement_logged: "Measurement",
  }

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-400" />
        <p className="text-sm font-semibold">XP & Level</p>
      </div>

      {/* Level badge + XP */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 text-white font-bold text-lg">
          {levelInfo.level}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            Level {levelInfo.level}
            {levelInfo.level < maxLevel ? ` · ${levelInfo.currentXp.toLocaleString()} / ${levelInfo.xpToNextLevel?.toLocaleString()} XP` : " · MAX"}
          </p>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressPct * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total_xp.toLocaleString()} total XP · {stats.lifetime_workouts} workouts · {stats.lifetime_prs} PRs
          </p>
        </div>
      </div>

      {/* Recent XP events */}
      {recentXpEvents.length > 0 && (
        <div className="space-y-1">
          {recentXpEvents.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{eventTypeLabel[ev.event_type] ?? ev.event_type}</span>
              <span className="text-yellow-400 font-medium">+{ev.xp_gained} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
