"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { ACHIEVEMENT_MAP } from "@/lib/gamification"

interface Achievement {
  id: number
  achievement_key: string
  unlocked_at: number
}

export function AchievementsWidget() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/achievements?limit=4")
      .then((r) => r.json())
      .then((d) => {
        setAchievements(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="bento-card animate-pulse h-24" />

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-semibold">Achievements</p>
        </div>
        <Link href="/achievements" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      {achievements.length === 0 ? (
        <p className="text-xs text-muted-foreground">Complete workouts to earn badges</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {achievements.map((ach) => {
            const def = ACHIEVEMENT_MAP[ach.achievement_key]
            if (!def) return null
            return (
              <div
                key={ach.id}
                className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2.5 py-1"
                title={def.description}
              >
                <span className="text-base leading-none">{def.icon}</span>
                <span className="text-xs font-medium text-yellow-400">{def.title}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
