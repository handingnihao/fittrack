import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { profile } from "@/db/schema"
import { asc } from "drizzle-orm"

export async function GET() {
  const profiles = await db.select().from(profile).orderBy(asc(profile.id))
  return NextResponse.json(profiles)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = (body?.name ?? "Athlete").toString().trim().slice(0, 100) || "Athlete"

  const [created] = await db
    .insert(profile)
    .values({ name, targetCalories: 2000, targetProteinG: 150, targetCarbsG: 200, targetFatG: 65 })
    .returning()
  return NextResponse.json(created, { status: 201 })
}
