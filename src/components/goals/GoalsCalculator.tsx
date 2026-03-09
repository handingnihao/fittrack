"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { calcBMR, calcTDEE } from "@/lib/tdee"
import { kgToLbs, cmToFtInParts, ftInToCm } from "@/lib/utils"
import { ACTIVITY_LEVELS } from "@/lib/constants"
import type { Profile } from "@/db/schema"

const LBS_PER_WEEK_OPTIONS = [
  { value: -2, label: "–2 lbs/week (fast loss)" },
  { value: -1.5, label: "–1.5 lbs/week" },
  { value: -1, label: "–1 lb/week (moderate loss)" },
  { value: -0.5, label: "–0.5 lbs/week (slow loss)" },
  { value: 0, label: "0 (maintain)" },
  { value: 0.5, label: "+0.5 lbs/week (slow gain)" },
  { value: 1, label: "+1 lb/week (moderate gain)" },
]

const DIET_TYPES = [
  {
    id: "balanced",
    label: "Balanced",
    description: "25% protein · 45% carbs · 30% fat",
    protein: 0.25,
    carbs: 0.45,
    fat: 0.30,
  },
  {
    id: "highProtein",
    label: "High Protein",
    description: "40% protein · 35% carbs · 25% fat",
    protein: 0.40,
    carbs: 0.35,
    fat: 0.25,
  },
  {
    id: "lowCarb",
    label: "Low Carb",
    description: "30% protein · 25% carbs · 45% fat",
    protein: 0.30,
    carbs: 0.25,
    fat: 0.45,
  },
]

interface Props {
  profile: Profile
  latestWeightKg: number | null
}

export function GoalsCalculator({ profile, latestWeightKg }: Props) {
  const initHeight = profile.heightCm ? cmToFtInParts(profile.heightCm) : null

  const [age, setAge] = useState(profile.ageYears?.toString() ?? "")
  const [heightFt, setHeightFt] = useState(initHeight?.ft?.toString() ?? "")
  const [heightIn, setHeightIn] = useState(initHeight?.inches?.toString() ?? "")
  const [sex, setSex] = useState<string>(profile.biologicalSex ?? "")
  const [activityLevel, setActivityLevel] = useState<string>(profile.activityLevel ?? "")
  const [lbsPerWeek, setLbsPerWeek] = useState<number>(profile.goalLbsPerWeek ?? 0)
  const [dietType, setDietType] = useState((profile as any).dietType ?? "balanced")
  const [saving, setSaving] = useState(false)
  const [applyingTargets, setApplyingTargets] = useState(false)

  const weightKg = latestWeightKg
  const weightLbs = weightKg ? kgToLbs(weightKg) : null

  // Compute TDEE
  const ageNum = parseFloat(age)
  const ftNum = parseFloat(heightFt)
  const inNum = parseFloat(heightIn)
  const hasStats =
    weightKg !== null &&
    !isNaN(ageNum) && ageNum > 0 &&
    (!isNaN(ftNum) || !isNaN(inNum)) &&
    (heightFt !== "" || heightIn !== "") &&
    sex !== "" &&
    activityLevel !== ""

  const heightCmCalc = hasStats
    ? ftInToCm(isNaN(ftNum) ? 0 : ftNum, isNaN(inNum) ? 0 : inNum)
    : 0

  const bmr = hasStats && weightKg
    ? calcBMR(weightKg, heightCmCalc, ageNum, sex as "male" | "female" | "other")
    : null
  const tdee = bmr !== null ? calcTDEE(bmr, activityLevel) : null

  const calorieDelta = Math.round(lbsPerWeek * 500)
  const targetCalories = tdee !== null ? Math.max(1200, tdee + calorieDelta) : null

  const diet = DIET_TYPES.find(d => d.id === dietType) ?? DIET_TYPES[0]
  const proteinG = targetCalories ? Math.round(targetCalories * diet.protein / 4) : null
  const carbsG = targetCalories ? Math.round(targetCalories * diet.carbs / 4) : null
  const fatG = targetCalories ? Math.round(targetCalories * diet.fat / 9) : null

  async function saveGoalPref(patch: Record<string, unknown>) {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        console.error("Failed to save goal pref:", res.status)
      }
    } catch (err) {
      console.error("Failed to save goal pref:", err)
    }
  }

  function handleLbsPerWeekChange(v: string) {
    const val = parseFloat(v)
    setLbsPerWeek(val)
    saveGoalPref({ goalLbsPerWeek: val })
  }

  function handleDietTypeChange(id: string) {
    setDietType(id)
    saveGoalPref({ dietType: id })
  }

  async function saveStats() {
    setSaving(true)
    const ft = parseFloat(heightFt)
    const inches = parseFloat(heightIn)
    const hasHeight = heightFt !== "" || heightIn !== ""
    const body: Record<string, unknown> = {
      ageYears: age !== "" ? parseInt(age) : null,
      heightCm: hasHeight ? ftInToCm(isNaN(ft) ? 0 : ft, isNaN(inches) ? 0 : inches) : null,
      biologicalSex: sex !== "" ? sex : null,
      activityLevel: activityLevel !== "" ? activityLevel : null,
    }
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) toast.success("Stats saved")
    else toast.error("Failed to save stats")
  }

  async function applyTargets() {
    if (!targetCalories || !proteinG || !carbsG || !fatG) return
    setApplyingTargets(true)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories,
        targetProteinG: proteinG,
        targetCarbsG: carbsG,
        targetFatG: fatG,
      }),
    })
    setApplyingTargets(false)
    if (res.ok) toast.success("Targets applied")
    else toast.error("Failed to apply targets")
  }

  return (
    <div className="space-y-6">
      {/* Physical Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Physical Stats</CardTitle>
          <CardDescription>Used to calculate your TDEE</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Weight (lbs)</Label>
              <Input
                value={weightLbs !== null ? weightLbs.toString() : ""}
                readOnly
                className="bg-secondary/50 cursor-not-allowed"
                placeholder="Log weight on Dashboard"
              />
              <p className="text-xs text-muted-foreground">Update via Dashboard</p>
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Height</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={heightFt}
                  onChange={e => setHeightFt(e.target.value)}
                  placeholder="ft"
                  className="w-20"
                />
                <Input
                  type="number"
                  value={heightIn}
                  onChange={e => setHeightIn(e.target.value)}
                  placeholder="in"
                  className="w-20"
                  step="0.5"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Biological Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Activity Level</Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map(a => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label} — {a.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveStats} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Stats"}
          </Button>
        </CardContent>
      </Card>

      {/* TDEE Display */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated Energy</CardTitle>
          <CardDescription>Based on Mifflin-St Jeor formula</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">BMR</p>
              <p className="text-2xl font-bold text-foreground">
                {bmr !== null ? Math.round(bmr).toLocaleString() : "—"}
              </p>
              <p className="text-xs text-muted-foreground">kcal / day at rest</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">TDEE</p>
              <p className="text-2xl font-bold text-primary">
                {tdee !== null ? tdee.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-muted-foreground">kcal / day with activity</p>
            </div>
          </div>
          {!hasStats && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Fill in all stats above to calculate your TDEE
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weight Goal */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Goal</CardTitle>
          <CardDescription>Adjust calorie target based on desired rate of change</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rate of change</Label>
            <Select
              value={lbsPerWeek.toString()}
              onValueChange={handleLbsPerWeekChange}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LBS_PER_WEEK_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tdee !== null && (
            <div className="rounded-lg bg-secondary p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">
                {lbsPerWeek === 0
                  ? "Maintenance calories"
                  : `TDEE ${lbsPerWeek > 0 ? "+" : ""}${calorieDelta} kcal/day`}
              </span>
              <span className="font-bold text-primary text-base">
                {targetCalories?.toLocaleString()} kcal
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diet Type */}
      <Card>
        <CardHeader>
          <CardTitle>Diet Type</CardTitle>
          <CardDescription>Macro split applied to your target calories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DIET_TYPES.map(d => (
              <button
                key={d.id}
                onClick={() => handleDietTypeChange(d.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  dietType === d.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <p className="font-semibold text-sm">{d.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resulting Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Resulting Targets</CardTitle>
          <CardDescription>Apply these to your nutrition tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Calories", value: targetCalories, unit: "kcal", color: "#34d399" },
              { label: "Protein", value: proteinG, unit: "g", color: "#a78bfa" },
              { label: "Carbs", value: carbsG, unit: "g", color: "#60a5fa" },
              { label: "Fat", value: fatG, unit: "g", color: "#fb923c" },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-lg bg-secondary p-3 text-center"
                style={{ borderTop: `3px solid ${item.color}` }}
              >
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-xl font-bold">
                  {item.value !== null ? item.value.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={applyTargets}
            disabled={applyingTargets || targetCalories === null}
            className="w-full sm:w-auto"
          >
            {applyingTargets ? "Applying..." : "Apply Targets"}
          </Button>
          {targetCalories === null && (
            <p className="text-xs text-muted-foreground">
              Complete physical stats and TDEE calculation above to apply targets
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
