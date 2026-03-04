import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { foodLog, profile } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const date = req.nextUrl.searchParams.get("date") ?? ""
  const [userProfile] = await db.select().from(profile).where(eq(profile.id, profileId))
  const entries = await db.select().from(foodLog).where(and(eq(foodLog.dateStr, date), eq(foodLog.profileId, profileId)))

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  return NextResponse.json({
    ...totals,
    targetCalories: userProfile?.targetCalories ?? 2000,
    targetProteinG: userProfile?.targetProteinG ?? 150,
    targetCarbsG: userProfile?.targetCarbsG ?? 200,
    targetFatG: userProfile?.targetFatG ?? 65,
  })
}
