import { NextRequest, NextResponse } from "next/server"

const API_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY"

// Nutrient IDs in FoodData Central
const NUTRIENT = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
} as const

interface UsdaNutrient {
  nutrientId: number
  value: number
}

interface UsdaFood {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  foodNutrients: UsdaNutrient[]
}

function nutrient(list: UsdaNutrient[], id: number): number {
  return Math.round((list.find((n) => n.nutrientId === id)?.value ?? 0) * 10) / 10
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q) return NextResponse.json([])

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search")
  url.searchParams.set("query", q)
  url.searchParams.set("api_key", API_KEY)
  // Foundation & SR Legacy are always per-100 g; exclude Branded (per-serving complexity)
  url.searchParams.set("dataType", "Foundation,SR Legacy")
  url.searchParams.set("pageSize", "15")

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const foods: UsdaFood[] = data.foods ?? []

    return NextResponse.json(
      foods.map((f) => ({
        fdcId: f.fdcId,
        name: f.description.slice(0, 200),
        brand: f.brandOwner ?? f.brandName ?? null,
        servingSizeG: 100,
        servingUnit: "g",
        calories: nutrient(f.foodNutrients, NUTRIENT.calories),
        proteinG: nutrient(f.foodNutrients, NUTRIENT.protein),
        carbsG: nutrient(f.foodNutrients, NUTRIENT.carbs),
        fatG: nutrient(f.foodNutrients, NUTRIENT.fat),
        fiberG: nutrient(f.foodNutrients, NUTRIENT.fiber) || null,
      }))
    )
  } catch {
    return NextResponse.json([])
  }
}
