import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { weightLog } from "@/db/schema"
import { eq, and, gte, asc } from "drizzle-orm"
import { getActiveProfileId } from "@/lib/profile"
import { format, subDays } from "date-fns"

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get("days") ?? "60"), 365)
  const since = format(subDays(new Date(), days - 1), "yyyy-MM-dd")

  const entries = await db
    .select()
    .from(weightLog)
    .where(and(eq(weightLog.profileId, profileId), gte(weightLog.dateStr, since)))
    .orderBy(asc(weightLog.dateStr))

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { weightKg, dateStr } = await req.json()

  if (typeof weightKg !== "number" || weightKg <= 0) {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  // Upsert: one entry per profile per day
  const existing = await db
    .select()
    .from(weightLog)
    .where(and(eq(weightLog.profileId, profileId), eq(weightLog.dateStr, dateStr)))
    .limit(1)

  let entry
  if (existing.length > 0) {
    const [updated] = await db
      .update(weightLog)
      .set({ weightKg, loggedAt: new Date() })
      .where(and(eq(weightLog.profileId, profileId), eq(weightLog.dateStr, dateStr)))
      .returning()
    entry = updated
  } else {
    const [inserted] = await db
      .insert(weightLog)
      .values({ profileId, weightKg, dateStr })
      .returning()
    entry = inserted
  }

  return NextResponse.json(entry, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date")
  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 })

  await db
    .delete(weightLog)
    .where(and(eq(weightLog.profileId, profileId), eq(weightLog.dateStr, dateStr)))

  return NextResponse.json({ ok: true })
}
