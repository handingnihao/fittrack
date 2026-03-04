import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const profileId = getActiveProfileId(req)
  const id = parseInt(params.id)
  const sqlite = (db as any).session?.client ?? (db as any)._client
  sqlite.prepare(`DELETE FROM measurements WHERE id = ? AND profile_id = ?`).run(id, profileId)
  return NextResponse.json({ ok: true })
}
