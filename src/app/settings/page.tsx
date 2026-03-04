import type { Metadata } from "next"
import { db } from "@/db"
import { profile } from "@/db/schema"
import { eq } from "drizzle-orm"
import { PageHeader } from "@/components/layout/PageHeader"
import { ProfileForm } from "@/components/settings/ProfileForm"
import { ProfilesPanel } from "@/components/settings/ProfilesPanel"
import { ExportImportPanel } from "@/components/settings/ExportImportPanel"
import { ThemePanel } from "@/components/settings/ThemePanel"
import { MeasurementsPanel } from "@/components/settings/MeasurementsPanel"
import { PhotosPanel } from "@/components/settings/PhotosPanel"
import { SchedulePanel } from "@/components/settings/SchedulePanel"
import { NotificationsPanel } from "@/components/settings/NotificationsPanel"
import { getActiveProfileId } from "@/lib/profile"

export const metadata: Metadata = { title: "Settings" }
export const revalidate = 0

async function getProfile() {
  const profileId = getActiveProfileId()
  const [row] = await db.select().from(profile).where(eq(profile.id, profileId))
  if (!row) {
    const [created] = await db.insert(profile).values({ id: profileId }).returning()
    return created
  }
  return row
}

export default async function SettingsPage() {
  const userProfile = await getProfile()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profiles and data"
      />
      <ProfilesPanel />
      <ProfileForm profile={userProfile} />
      <ExportImportPanel />
      <ThemePanel />
      <MeasurementsPanel />
      <PhotosPanel />
      <SchedulePanel />
      <NotificationsPanel />
    </div>
  )
}
