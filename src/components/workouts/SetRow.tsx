"use client"
import { Check, Trash2, Scale, Trophy } from "lucide-react"
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

  const oneRM = !isCardio && !set.isWarmup && set.weightKg != null && set.reps != null && set.reps >= 2
    ? epley1RM(set.weightKg, set.reps)
    : null

  const showPR = isPersonalBest || (set as any).isPersonalBest

  // Cardio exercises with extra fields get a second sub-row
  const hasSecondaryRow = isTreadmill || isBike

  return (
    <div className={cn(
      "flex items-start gap-2 py-2 px-2 rounded-lg transition-all",
      set.completed ? "bg-neon-green/5 border border-neon-green/20" : "hover:bg-secondary/50",
      set.isWarmup ? "opacity-70" : ""
    )}>
      {/* Set number / type */}
      <button
        className={cn(
          "w-7 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors border mt-0",
          set.isWarmup
            ? "border-yellow-500/40 text-yellow-500 bg-yellow-500/10"
            : "border-border text-muted-foreground hover:border-primary/50"
        )}
        onClick={() => onUpdate("isWarmup", !set.isWarmup)}
        title={set.isWarmup ? "Warmup set" : "Working set"}
      >
        {set.isWarmup ? "W" : set.setNumber}
      </button>

      {/* Previous performance hint — hidden on mobile */}
      <div className="w-14 text-center hidden sm:flex items-center justify-center" style={{ minHeight: 36 }}>
        {isCardio && previousDistanceM ? (
          <p className="text-xs text-muted-foreground">{(previousDistanceM / 1609.344).toFixed(2)} mi</p>
        ) : (!isCardio && previousWeight && previousReps) ? (
          <p className="text-xs text-muted-foreground">{kgToLbs(previousWeight)}×{previousReps}</p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      {/* Input area — flex-col so secondary row wraps below */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {isCardio ? (
          <>
            {/* Primary row: distance + duration */}
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                value={distanceMiStr}
                onChange={(e) => setDistanceMiStr(e.target.value)}
                onBlur={handleDistanceBlur}
                placeholder="mi"
                className="h-10 text-center text-sm flex-1 min-w-0"
                disabled={set.completed}
              />
              <Input
                type="text"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                onBlur={handleDurationBlur}
                placeholder="MM:SS"
                className="h-10 text-center text-sm flex-1 min-w-0"
                disabled={set.completed}
              />
            </div>

            {/* Secondary row: speed + incline (treadmill) or resistance (bike) */}
            {isTreadmill && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={speedMphStr}
                  onChange={(e) => setSpeedMphStr(e.target.value)}
                  onBlur={handleSpeedBlur}
                  placeholder="mph"
                  className="h-10 text-center text-sm flex-1 min-w-0"
                  disabled={set.completed}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={inclineStr}
                  onChange={(e) => setInclineStr(e.target.value)}
                  onBlur={handleInclineBlur}
                  placeholder="% inc"
                  className="h-10 text-center text-sm flex-1 min-w-0"
                  disabled={set.completed}
                />
              </div>
            )}
            {isBike && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={resistanceStr}
                  onChange={(e) => setResistanceStr(e.target.value)}
                  onBlur={handleResistanceBlur}
                  placeholder="resist."
                  className="h-10 text-center text-sm flex-1 min-w-0"
                  disabled={set.completed}
                />
                <div className="flex-1" /> {/* spacer so resist. field takes half width */}
              </div>
            )}

            {/* Pace for non-treadmill, non-bike */}
            {paceMinsPerMile && !isBike && !isTreadmill && (
              <div className="text-xs text-muted-foreground text-center">
                {paceMinsPerMile.toFixed(1)} <span className="text-[10px]">min/mi</span>
              </div>
            )}
          </>
        ) : (
          /* Strength: weight + reps in one row */
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <Input
                type="text"
                inputMode="decimal"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                onBlur={handleWeightBlur}
                placeholder={weightPlaceholder}
                className="h-10 text-center text-sm flex-1 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={set.completed}
              />
              {!set.completed && (
                <PlateCalculator currentWeightLbs={currentLbs} onConfirm={handlePlateConfirm}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-9 shrink-0 text-muted-foreground hover:text-primary"
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
                className="h-10 text-center text-sm"
                disabled={set.completed}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right-side actions */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {/* PR badge */}
        {showPR && (
          <div title="Personal Best!" className="h-10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
        )}

        {/* 1RM estimate */}
        {oneRM && !showPR && (
          <div className="text-[10px] text-muted-foreground hidden sm:flex items-center h-10 whitespace-nowrap">
            ~{Math.round(kgToLbs(oneRM))} 1RM
          </div>
        )}

        {/* Complete button */}
        {set.completed ? (
          <div className="w-9 h-10 flex items-center justify-center rounded-lg bg-neon-green/20">
            <Check className="w-4 h-4 text-neon-green" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="w-9 h-10 rounded-lg hover:bg-neon-green/20 hover:text-neon-green transition-colors"
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
          className="w-7 h-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={set.completed}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
