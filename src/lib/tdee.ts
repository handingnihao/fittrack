// Mifflin-St Jeor BMR
export function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female" | "other"
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === "male") return base + 5
  if (sex === "female") return base - 161
  return base - 78 // average of male/female offsets
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
}

export function calcTDEE(bmr: number, activityLevel: string): number {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2))
}
