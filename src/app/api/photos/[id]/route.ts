import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import fs from "fs"
import path from "path"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profileId = getActiveProfileId(req)
  const id = parseInt(params.id)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const photo = sqlite.prepare(
    `SELECT * FROM progress_photos WHERE id = ? AND profile_id = ?`
  ).get(id, profileId) as { filename: string; profile_id: number } | null

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filepath = path.join("/data", "photos", String(photo.profile_id), photo.filename)
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "File not found" }, { status: 404 })

  const buffer = fs.readFileSync(filepath)
  const ext = photo.filename.split(".").pop()?.toLowerCase() ?? "jpg"
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"

  return new NextResponse(buffer, {
    headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const profileId = getActiveProfileId(req)
  const id = parseInt(params.id)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const photo = sqlite.prepare(
    `SELECT * FROM progress_photos WHERE id = ? AND profile_id = ?`
  ).get(id, profileId) as { filename: string; profile_id: number } | null

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete file
  const filepath = path.join("/data", "photos", String(photo.profile_id), photo.filename)
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath)

  sqlite.prepare(`DELETE FROM progress_photos WHERE id = ? AND profile_id = ?`).run(id, profileId)
  return NextResponse.json({ ok: true })
}
