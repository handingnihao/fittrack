import type { Metadata } from "next"
import { db } from "@/db"
import { profile, weightLog } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { PageHeader } from "@/components/layout/PageHeader"
import { GoalsCalculator } from "@/components/goals/GoalsCalculator"
import { getActiveProfileId } from "@/lib/profile"

export const metadata: Metadata = { title: "Goals" }
export const revalidate = 0

async function getGoalsData() {
  const profileId = getActiveProfileId()

  const [row] = await db.select().from(profile).where(eq(profile.id, profileId))
  const userProfile = row ?? (await db.insert(profile).values({ id: profileId }).returning())[0]

  const [latestWeight] = await db
    .select()
    .from(weightLog)
    .where(eq(weightLog.profileId, profileId))
    .orderBy(desc(weightLog.dateStr))
    .limit(1)

  return { userProfile, latestWeightKg: latestWeight?.weightKg ?? userProfile.weightKg ?? null }
}

export default async function GoalsPage() {
  const { userProfile, latestWeightKg } = await getGoalsData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        description="Calculate your TDEE and set macro targets"
      />
      <GoalsCalculator profile={userProfile} latestWeightKg={latestWeightKg} />
    </div>
  )
}
