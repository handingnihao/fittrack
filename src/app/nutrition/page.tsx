"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { todayStr } from "@/lib/utils"

export default function NutritionPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/nutrition/${todayStr()}`)
  }, [router])
  return null
}
