"use client"
import { useEffect, useState } from "react"
import { Target, CheckCircle2 } from "lucide-react"

interface Challenge {
  id: number
  challenge_key: string
  title: string
  description: string
  target_value: number
  current_value: number
  is_completed: boolean
  xp_reward: number
}

export function ChallengesWidget() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        setChallenges(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="bento-card animate-pulse h-40" />

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-neon-orange" />
        <p className="text-sm font-semibold">Weekly Challenges</p>
      </div>

      {challenges.length === 0 ? (
        <p className="text-xs text-muted-foreground">No challenges this week</p>
      ) : (
        <div className="space-y-3">
          {challenges.map((ch) => {
            const pct = Math.min(ch.current_value / ch.target_value, 1)
            return (
              <div key={ch.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {ch.is_completed && <CheckCircle2 className="w-3.5 h-3.5 text-neon-green shrink-0" />}
                    <p className="text-xs font-medium truncate">{ch.title}</p>
                  </div>
                  <span className="text-[10px] text-yellow-400 shrink-0">+{ch.xp_reward} XP</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{ch.description}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${ch.is_completed ? "bg-neon-green" : "bg-primary"}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {ch.current_value}/{ch.target_value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
