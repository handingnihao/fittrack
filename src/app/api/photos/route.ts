import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { getActiveProfileId } from "@/lib/profile"
import { checkAndAwardAchievements } from "@/lib/gamification"
import { todayStr } from "@/lib/utils"
import fs from "fs"
import path from "path"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  const rows = sqlite.prepare(
    `SELECT * FROM progress_photos WHERE profile_id = ? ORDER BY date_str DESC, created_at DESC`
  ).all(profileId) as object[]

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const profileId = getActiveProfileId(req)
  const sqlite = (db as any).session?.client ?? (db as any)._client

  try {
    const formData = await req.formData()
    const file = formData.get("photo") as File | null
    if (!file) return NextResponse.json({ error: "No photo provided" }, { status: 400 })

    const dateStr = (formData.get("dateStr") as string) ?? todayStr()
    const angle = (formData.get("angle") as string) ?? "front"
    const notes = (formData.get("notes") as string) ?? null

    // Save file to /data/photos/{profileId}/
    const dir = path.join("/data", "photos", String(profileId))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `${dateStr}_${angle}_${Date.now()}.${ext}`
    const filepath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filepath, buffer)

    const result = sqlite.prepare(`
      INSERT INTO progress_photos (profile_id, date_str, filename, angle, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(profileId, dateStr, filename, angle, notes)

    // Check achievements
    sqlite.prepare(`INSERT OR IGNORE INTO profile_stats (profile_id) VALUES (?)`).run(profileId)
    await checkAndAwardAchievements(db, profileId)

    const row = sqlite.prepare(`SELECT * FROM progress_photos WHERE id = ?`).get(result.lastInsertRowid) as object
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
