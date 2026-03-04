import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { profile } from "@/db/schema"
import { eq } from "drizzle-orm"
import { UpdateProfileSchema } from "@/lib/validators"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const [row] = await db.select().from(profile).where(eq(profile.id, id))
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const body = await req.json()
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [updated] = await db
    .update(profile)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profile.id, id))
    .returning()
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)

  // Guard: can't delete the last profile
  const all = await db.select().from(profile)
  if (all.length <= 1) {
    return NextResponse.json({ error: "Cannot delete the only profile" }, { status: 400 })
  }

  await db.delete(profile).where(eq(profile.id, id))
  return NextResponse.json({ ok: true })
}
