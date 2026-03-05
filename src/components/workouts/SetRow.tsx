"use client"
import { Check, Trash2, Scale, Trophy, Timer, Ruler } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, kgToLbs, lbsToKg } from "@/lib/utils"
import type { ActiveSet } from "@/types"
import { useState, useEffect } from "react"
import { PlateCalculator } from "./PlateCalculator"

interface Props {
  set: ActiveSet
  setIndex: number
  onUpdate: (field: keyof ActiveSet, value: number | boolean | null) => void
  onComplete: () => void
  onRemove: () => void
  previousWeight?: number | null
  previousReps?: number | null
  previousDistanceM?: number | null
  exerciseCategory?: string
  exerciseName?: string
  isPersonalBest?: boolean
}

function epley1RM(weightKg: number, reps: number): number {
  if (reps < 2) return weightKg
  return weightKg * (1 + reps / 30)
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function SetRow({ set, setIndex, onUpdate, onComplete, onRemove, previousWeight, previousReps, previousDistanceM, exerciseCategory, exerciseName, isPersonalBest }: Props) {
  const isCardio = exerciseCategory === "cardio"
  const nameLower = exerciseName?.toLowerCase() ?? ""
  const isTreadmill = nameLower.includes("treadmill")
  const isBike = nameLower.includes("bike") || nameLower.includes("cycle") || nameLower.includes("stationary")

  const [weightStr, setWeightStr] = useState(() => {
    if (set.weightKg == null) return ""
    const lbs = kgToLbs(set.weightKg)
    return Number.isInteger(lbs) ? String(lbs) : lbs.toFixed(1)
  })

  // Cardio: distance in miles, duration in seconds
  const [distanceMiStr, setDistanceMiStr] = useState(() => {
    if ((set as any).distanceM == null) return ""
    return ((set as any).distanceM / 1609.344).toFixed(2)
  })
  const [durationStr, setDurationStr] = useState(() => {
    const sec = (set as any).durationSec ?? null
    if (sec == null) return ""
    return formatDuration(sec)
  })

  const [inclineStr, setInclineStr] = useState(() => {
    const v = (set as any).incline ?? null
    return v == null ? "" : String(v)
  })

  const [resistanceStr, setResistanceStr] = useState(() => {
    const v = (set as any).resistance ?? null
    return v == null ? "" : String(v)
  })

  const [speedMphStr, setSpeedMphStr] = useState(() => {
    const v = (set as any).speedMph ?? null
    return v == null ? "" : String(v)
  })

  // Sync when weightKg changes from outside (e.g. plate calculator confirm)
  useEffect(() => {
    if (set.weightKg == null) {
      setWeightStr("")
    } else {
      const lbs = kgToLbs(set.weightKg)
      setWeightStr(Number.isInteger(lbs) ? String(lbs) : lbs.toFixed(1))
    }
  }, [set.weightKg])

  function handleWeightBlur() {
    const parsed = parseFloat(weightStr)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate("weightKg", lbsToKg(parsed))
    } else if (weightStr === "") {
      onUpdate("weightKg", null)
    }
  }

  function handlePlateConfirm(lbs: number) {
    onUpdate("weightKg", lbsToKg(lbs))
  }

  function handleDistanceBlur() {
    const parsed = parseFloat(distanceMiStr)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate("distanceM" as keyof ActiveSet, parsed * 1609.344)
    } else if (distanceMiStr === "") {
      onUpdate("distanceM" as keyof ActiveSet, null)
    }
  }

  function handleDurationBlur() {
    // Parse MM:SS or plain seconds
    const parts = durationStr.split(":")
    let sec = 0
    if (parts.length === 2) {
      sec = parseInt(parts[0]) * 60 + parseInt(parts[1])
    } else {
      sec = parseInt(durationStr)
    }
    if (!isNaN(sec) && sec >= 0) {
      onUpdate("durationSec" as keyof ActiveSet, sec)
    }
  }

  function handleInclineBlur() {
    const parsed = parseFloat(inclineStr)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate("incline" as keyof ActiveSet, parsed)
    } else if (inclineStr === "") {
      onUpdate("incline" as keyof ActiveSet, null)
    }
  }

  function handleResistanceBlur() {
    const parsed = parseFloat(resistanceStr)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate("resistance" as keyof ActiveSet, parsed)
    } else if (resistanceStr === "") {
      onUpdate("resistance" as keyof ActiveSet, null)
    }
  }

  function handleSpeedBlur() {
    const parsed = parseFloat(speedMphStr)
    if (!isNaN(parsed) && parsed > 0) {
      onUpdate("speedMph" as keyof ActiveSet, parsed)
      // Auto-calculate distance from speed × duration
      const durSec = (set as any).durationSec as number | null
      if (durSec && durSec > 0) {
        const distMi = parsed * (durSec / 3600)
        onUpdate("distanceM" as keyof ActiveSet, distMi * 1609.344)
        setDistanceMiStr(distMi.toFixed(2))
      }
    } else if (speedMphStr === "") {
      onUpdate("speedMph" as keyof ActiveSet, null)
    }
  }

  // Compute pace (min/mi) for cardio
  const distanceM = (set as any).distanceM as number | null
  const durationSec = (set as any).durationSec as number | null
  const paceMinsPerMile = distanceM && durationSec && distanceM > 0
    ? (durationSec / 60) / (distanceM / 1609.344)
    : null

  const currentLbs = set.weightKg != null ? kgToLbs(set.weightKg) : null

  const weightPlaceholder =
    previousWeight != null
      ? (() => { const lbs = kgToLbs(previousWeight); return Number.isInteger(lbs) ? String(lbs) : lbs.toFixed(1) })()
      : "lbs"

  // 1RM estimate
  const oneRM = !isCardio && !set.isWarmup && set.weightKg != null && set.reps != null && set.reps >= 2
    ? epley1RM(set.weightKg, set.reps)
    : null

  const showPR = isPersonalBest || (set as any).isPersonalBest

  return (
    <div className={cn(
      "flex items-center gap-2 py-2 px-2 rounded-lg transition-all",
      set.completed ? "bg-neon-green/5 border border-neon-green/20" : "hover:bg-secondary/50",
      set.isWarmup ? "opacity-70" : ""
    )}>
      {/* Set number / type */}
      <button
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors border",
          set.isWarmup
            ? "border-yellow-500/40 text-yellow-500 bg-yellow-500/10"
            : "border-border text-muted-foreground hover:border-primary/50"
        )}
        onClick={() => onUpdate("isWarmup", !set.isWarmup)}
        title={set.isWarmup ? "Warmup set" : "Working set"}
      >
        {set.isWarmup ? "W" : set.setNumber}
      </button>

      {/* Previous performance hint */}
      <div className="w-14 text-center hidden sm:block">
        {isCardio && previousDistanceM ? (
          <p className="text-xs text-muted-foreground">{(previousDistanceM / 1609.344).toFixed(2)} mi</p>
        ) : (!isCardio && previousWeight && previousReps) ? (
          <p className="text-xs text-muted-foreground">{kgToLbs(previousWeight)}×{previousReps}</p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      {isCardio ? (
        /* Cardio inputs: distance (mi) + duration (MM:SS) [+ incline or resistance] */
        <>
          <div className="flex-1">
            <Input
              type="text"
              inputMode="decimal"
              value={distanceMiStr}
              onChange={(e) => setDistanceMiStr(e.target.value)}
              onBlur={handleDistanceBlur}
              placeholder="mi"
              className="h-9 text-center text-sm"
              disabled={set.completed}
            />
          </div>
          <div className="flex-1">
            <Input
              type="text"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              onBlur={handleDurationBlur}
              placeholder="MM:SS"
              className="h-9 text-center text-sm"
              disabled={set.completed}
            />
          </div>
          {isTreadmill && (
            <div className="w-16">
              <Input
                type="text"
                inputMode="decimal"
                value={speedMphStr}
                onChange={(e) => setSpeedMphStr(e.target.value)}
                onBlur={handleSpeedBlur}
                placeholder="mph"
                className="h-9 text-center text-sm"
                disabled={set.completed}
              />
            </div>
          )}
          {isTreadmill && (
            <div className="w-16">
              <Input
                type="text"
                inputMode="decimal"
                value={inclineStr}
                onChange={(e) => setInclineStr(e.target.value)}
                onBlur={handleInclineBlur}
                placeholder="% inc"
                className="h-9 text-center text-sm"
                disabled={set.completed}
              />
            </div>
          )}
          {isBike && (
            <div className="w-16">
              <Input
                type="text"
                inputMode="decimal"
                value={resistanceStr}
                onChange={(e) => setResistanceStr(e.target.value)}
                onBlur={handleResistanceBlur}
                placeholder="lvl"
                className="h-9 text-center text-sm"
                disabled={set.completed}
              />
            </div>
          )}
          {/* Pace display for non-treadmill, non-bike cardio */}
          {paceMinsPerMile && !isBike && !isTreadmill && (
            <div className="text-xs text-muted-foreground w-12 text-center shrink-0">
              {paceMinsPerMile.toFixed(1)}<span className="text-[10px]">min/mi</span>
            </div>
          )}
        </>
      ) : (
        /* Strength inputs: weight + reps */
        <>
          <div className="flex-1 flex items-center gap-1">
            <Input
              type="text"
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              onBlur={handleWeightBlur}
              placeholder={weightPlaceholder}
              className="h-9 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={set.completed}
            />
            {!set.completed && (
              <PlateCalculator currentWeightLbs={currentLbs} onConfirm={handlePlateConfirm}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                  title="Plate calculator"
                  type="button"
                >
                  <Scale className="w-4 h-4" />
                </Button>
              </PlateCalculator>
            )}
          </div>

          <div className="flex-1">
            <Input
              type="number"
              step="1"
              min="0"
              value={set.reps ?? ""}
              onChange={(e) => onUpdate("reps", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="reps"
              className="h-9 text-center text-sm"
              disabled={set.completed}
            />
          </div>
        </>
      )}

      {/* PR badge */}
      {showPR && (
        <div className="shrink-0" title="Personal Best!">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
      )}

      {/* 1RM estimate */}
      {oneRM && !showPR && (
        <div className="text-[10px] text-muted-foreground shrink-0 hidden sm:block whitespace-nowrap">
          ~{Math.round(kgToLbs(oneRM))} 1RM
        </div>
      )}

      {/* Complete / remove */}
      {set.completed ? (
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-neon-green/20">
          <Check className="w-4 h-4 text-neon-green" />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          className="w-9 h-9 rounded-lg hover:bg-neon-green/20 hover:text-neon-green transition-colors shrink-0"
          onClick={onComplete}
          disabled={isCardio
            ? ((set as any).distanceM == null && (set as any).durationSec == null)
            : (set.reps === null && set.weightKg === null)}
        >
          <Check className="w-4 h-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
        disabled={set.completed}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  )
}
