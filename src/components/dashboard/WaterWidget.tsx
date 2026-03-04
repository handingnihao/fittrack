"use client"
import { useEffect, useState } from "react"
import { Droplets } from "lucide-react"
import { Button } from "@/components/ui/button"
import { todayStr } from "@/lib/utils"

interface WaterData {
  total_ml?: number
  totalMl?: number
  goal_ml?: number
  goalMl?: number
}

export function WaterWidget() {
  const [data, setData] = useState<{ totalMl: number; goalMl: number }>({ totalMl: 0, goalMl: 2500 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const today = todayStr()

  useEffect(() => {
    fetch(`/api/water?date=${today}`)
      .then((r) => r.json())
      .then((d: WaterData) => {
        setData({
          totalMl: d.total_ml ?? d.totalMl ?? 0,
          goalMl: d.goal_ml ?? d.goalMl ?? 2500,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [today])

  async function addWater(ml: number) {
    setSaving(true)
    const newTotal = Math.min(data.totalMl + ml, data.goalMl * 2)
    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr: today, totalMl: newTotal, goalMl: data.goalMl }),
      })
      setData((prev) => ({ ...prev, totalMl: newTotal }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="bento-card animate-pulse h-32" />

  const pct = Math.min(data.totalMl / data.goalMl, 1)
  const remaining = Math.max(data.goalMl - data.totalMl, 0)

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-blue-400" />
        <p className="text-sm font-semibold">Hydration</p>
      </div>

      {/* Amount display */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{(data.totalMl / 1000).toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/ {(data.goalMl / 1000).toFixed(1)} L</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-blue-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {remaining > 0 && (
        <p className="text-xs text-muted-foreground">{remaining} mL remaining</p>
      )}
      {remaining === 0 && (
        <p className="text-xs text-blue-400 font-medium">Goal reached! 💧</p>
      )}

      {/* Quick add buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {[250, 500, 750].map((ml) => (
          <Button
            key={ml}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => addWater(ml)}
            disabled={saving}
          >
            +{ml} mL
          </Button>
        ))}
      </div>
    </div>
  )
}
