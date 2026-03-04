"use client"
import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ACHIEVEMENT_DEFS } from "@/lib/gamification"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

interface EarnedAchievement {
  id: number
  achievement_key: string
  unlocked_at: number
}

const CATEGORIES = [
  { key: "workouts", label: "Workouts" },
  { key: "streaks", label: "Streaks" },
  { key: "prs", label: "PRs" },
  { key: "nutrition", label: "Nutrition" },
  { key: "volume", label: "Volume" },
  { key: "misc", label: "Misc" },
] as const

export default function AchievementsPage() {
  const [earned, setEarned] = useState<EarnedAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => {
        setEarned(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const earnedMap = new Map(earned.map((a) => [a.achievement_key, a]))

  const earnedCount = earned.length
  const totalCount = ACHIEVEMENT_DEFS.length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Achievements"
        description={`${earnedCount} / ${totalCount} unlocked`}
      />

      <Tabs defaultValue="workouts">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          {CATEGORIES.map((cat) => {
            const catDefs = ACHIEVEMENT_DEFS.filter((d) => d.category === cat.key)
            const catEarned = catDefs.filter((d) => earnedMap.has(d.key)).length
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="flex-1 text-xs">
                {cat.label} ({catEarned}/{catDefs.length})
              </TabsTrigger>
            )
          })}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const catDefs = ACHIEVEMENT_DEFS.filter((d) => d.category === cat.key)
          return (
            <TabsContent key={cat.key} value={cat.key} className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {catDefs.map((def) => {
                  const earnedEntry = earnedMap.get(def.key)
                  const isEarned = !!earnedEntry

                  return (
                    <div
                      key={def.key}
                      className={cn(
                        "bento-card flex flex-col items-center text-center gap-2 py-4 transition-all",
                        isEarned
                          ? "border-yellow-400/30 bg-yellow-400/5"
                          : "opacity-50 grayscale"
                      )}
                    >
                      <span className={cn("text-3xl", !isEarned && "opacity-40")}>{def.icon}</span>
                      <div>
                        <p className={cn("text-xs font-bold", isEarned ? "text-yellow-400" : "text-muted-foreground")}>
                          {def.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{def.description}</p>
                        {isEarned && earnedEntry && (
                          <p className="text-[10px] text-yellow-400/70 mt-1">
                            {format(new Date(earnedEntry.unlocked_at * 1000), "MMM d, yyyy")}
                          </p>
                        )}
                        {!isEarned && (
                          <p className="text-[10px] text-muted-foreground/50 mt-1">Locked</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
