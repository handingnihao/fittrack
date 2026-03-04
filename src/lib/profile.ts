import { cookies } from "next/headers"
import { NextRequest } from "next/server"

export function getActiveProfileId(req?: NextRequest): number {
  if (req) {
    const val = req.cookies.get("fittrack_profile_id")?.value
    return val ? parseInt(val) : 1
  }
  // For server components
  const val = cookies().get("fittrack_profile_id")?.value
  return val ? parseInt(val) : 1
}
