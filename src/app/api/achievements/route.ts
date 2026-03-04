import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") ?? "0")
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const query = limit > 0
    ? `SELECT * FROM achievements WHERE profile_id = ? ORDER BY unlocked_at DESC LIMIT ${limit}`
    : `SELECT * FROM achievements WHERE profile_id = ? ORDER BY unlocked_at DESC`

  const rows = sqlite.prepare(query).all(profileId) as object[]
  return NextResponse.json(rows)
}
