import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { foodLog } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { UpdateFoodLogSchema } from "@/lib/validators"
import { getActiveProfileId } from "@/lib/profile"

export async function PATCH(req: NextRequest, { params }: { params: { entryId: string } }) {
  const id = parseInt(params.entryId)
  const profileId = getActiveProfileId(req)
  const body = await req.json()
  const parsed = UpdateFoodLogSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [existing] = await db.select().from(foodLog).where(and(eq(foodLog.id, id), eq(foodLog.profileId, profileId)))
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const newServings = parsed.data.servings ?? existing.servings
  const ratio = newServings / existing.servings

  const [updated] = await db
    .update(foodLog)
    .set({
      servings: newServings,
      mealType: parsed.data.mealType ?? existing.mealType,
      calories: existing.calories * ratio,
      proteinG: existing.proteinG * ratio,
      carbsG: existing.carbsG * ratio,
      fatG: existing.fatG * ratio,
      fiberG: existing.fiberG ? existing.fiberG * ratio : null,
    })
    .where(and(eq(foodLog.id, id), eq(foodLog.profileId, profileId)))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { entryId: string } }) {
  const id = parseInt(params.entryId)
  const profileId = getActiveProfileId(req)
  await db.delete(foodLog).where(and(eq(foodLog.id, id), eq(foodLog.profileId, profileId)))
  return NextResponse.json({ ok: true })
}
