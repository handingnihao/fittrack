import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { profile } from "@/db/schema"
import { eq } from "drizzle-orm"
import { UpdateProfileSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"

export async function GET(req: NextRequest) {
  try {
    const profileId = getActiveProfileId(req)
    const [row] = await db.select().from(profile).where(eq(profile.id, profileId))
    if (!row) {
      const [created] = await db.insert(profile).values({ id: profileId }).returning()
      return NextResponse.json(created)
    }
    return NextResponse.json(row)
  } catch (error) {
    console.error("GET /api/profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profileId = getActiveProfileId(req)
    const body = await req.json()
    const parsed = UpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const [updated] = await db
      .update(profile)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profile.id, profileId))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
