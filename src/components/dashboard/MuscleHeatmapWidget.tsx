"use client"
import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

interface MuscleData {
  chest: number
  back: number
  legs: number
  shoulders: number
  arms: number
  core: number
  cardio: number
  other: number
}

function getIntensity(count: number, max: number): string {
  if (max === 0 || count === 0) return "fill-secondary stroke-border"
  const ratio = count / max
  if (ratio >= 0.75) return "fill-primary/80 stroke-primary"
  if (ratio >= 0.5) return "fill-primary/50 stroke-primary/70"
  if (ratio >= 0.25) return "fill-primary/25 stroke-primary/40"
  return "fill-primary/10 stroke-primary/20"
}

export function MuscleHeatmapWidget() {
  const [data, setData] = useState<MuscleData | null>(null)

  useEffect(() => {
    fetch("/api/stats/muscle-groups?days=7")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null)
  }, [])

  const maxVal = data ? Math.max(...Object.values(data)) : 0

  const groups = data ? [
    { label: "Chest", count: data.chest },
    { label: "Back", count: data.back },
    { label: "Legs", count: data.legs },
    { label: "Shoulders", count: data.shoulders },
    { label: "Arms", count: data.arms },
    { label: "Core", count: data.core },
    { label: "Cardio", count: data.cardio },
  ] : []

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Muscle Groups (7 days)</p>
      </div>

      {!data ? (
        <div className="animate-pulse h-24 bg-secondary rounded-lg" />
      ) : (
        <>
          {/* Simple SVG body silhouette with colored regions */}
          <div className="flex gap-4 items-start">
            <svg viewBox="0 0 80 160" className="w-20 h-40 shrink-0" aria-hidden="true">
              {/* Head */}
              <circle cx="40" cy="14" r="10" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Neck */}
              <rect x="35" y="22" width="10" height="6" className="fill-secondary stroke-border" strokeWidth="0.5" />
              {/* Shoulders */}
              <ellipse cx="40" cy="36" rx="24" ry="8" className={`${getIntensity(data.shoulders, maxVal)} transition-all`} strokeWidth="1" />
              {/* Chest */}
              <rect x="25" y="38" width="30" height="20" rx="3" className={`${getIntensity(data.chest, maxVal)} transition-all`} strokeWidth="1" />
              {/* Arms left */}
              <rect x="10" y="36" width="12" height="36" rx="5" className={`${getIntensity(data.arms, maxVal)} transition-all`} strokeWidth="1" />
              {/* Arms right */}
              <rect x="58" y="36" width="12" height="36" rx="5" className={`${getIntensity(data.arms, maxVal)} transition-all`} strokeWidth="1" />
              {/* Core / abs */}
              <rect x="27" y="58" width="26" height="22" rx="2" className={`${getIntensity(data.core, maxVal)} transition-all`} strokeWidth="1" />
              {/* Back (behind — show as lighter overlay) */}
              <rect x="27" y="38" width="26" height="42" rx="3" className={`fill-transparent ${getIntensity(data.back, maxVal).includes("primary") ? "stroke-blue-400" : "stroke-transparent"} transition-all`} strokeWidth="2" strokeDasharray="3,2" />
              {/* Legs left */}
              <rect x="24" y="82" width="14" height="50" rx="5" className={`${getIntensity(data.legs, maxVal)} transition-all`} strokeWidth="1" />
              {/* Legs right */}
              <rect x="42" y="82" width="14" height="50" rx="5" className={`${getIntensity(data.legs, maxVal)} transition-all`} strokeWidth="1" />
            </svg>

            {/* Legend grid */}
            <div className="flex-1 grid grid-cols-2 gap-1.5">
              {groups.map((g) => (
                <div key={g.label} className="flex items-center justify-between text-xs bg-secondary/50 rounded px-2 py-1">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className={`font-medium tabular-nums ${g.count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {g.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {maxVal === 0 && (
            <p className="text-xs text-muted-foreground">No workouts in the last 7 days</p>
          )}
        </>
      )}
    </div>
  )
}
