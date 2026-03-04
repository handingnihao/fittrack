import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { profile } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const profileId = parseInt(body?.profileId)
  if (isNaN(profileId) || profileId < 1) {
    return NextResponse.json({ error: "Invalid profileId" }, { status: 400 })
  }

  // Verify the profile exists
  const [row] = await db.select().from(profile).where(eq(profile.id, profileId))
  if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set("fittrack_profile_id", String(profileId), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
  return response
}
