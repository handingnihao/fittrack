"use client"
import { useState, useEffect } from "react"
import { Search, Loader2, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import type { Food } from "@/db/schema"

interface UsdaResult {
  fdcId: number
  name: string
  brand: string | null
  servingSizeG: number
  servingUnit: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number | null
}

interface Props {
  onSelect: (food: Food) => void
}

export function FoodSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [usdaResults, setUsdaResults] = useState<UsdaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [open, setOpen] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setLocalResults([])
      setUsdaResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    Promise.all([
      fetch(`/api/foods?q=${encodeURIComponent(debouncedQuery)}&limit=10`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`/api/foods/usda?q=${encodeURIComponent(debouncedQuery)}`)
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([local, usda]) => {
      setLocalResults(Array.isArray(local) ? local : [])
      setUsdaResults(Array.isArray(usda) ? usda : [])
      setOpen(true)
    }).finally(() => setLoading(false))
  }, [debouncedQuery])

  const close = () => {
    setLocalResults([])
    setUsdaResults([])
    setOpen(false)
    setQuery("")
  }

  const handleSelectLocal = (food: Food) => {
    onSelect(food)
    close()
  }

  const handleSelectUsda = async (usda: UsdaResult) => {
    setImporting(true)
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: usda.name,
          brand: usda.brand ?? undefined,
          servingSizeG: usda.servingSizeG,
          servingUnit: usda.servingUnit,
          calories: usda.calories,
          proteinG: usda.proteinG,
          carbsG: usda.carbsG,
          fatG: usda.fatG,
          fiberG: usda.fiberG ?? undefined,
          isCustom: false,
        }),
      })
      if (res.ok) {
        const food: Food = await res.json()
        onSelect(food)
        close()
      }
    } finally {
      setImporting(false)
    }
  }

  const hasResults = localResults.length > 0 || usdaResults.length > 0
  const showEmpty = open && !loading && query.length > 0 && !hasResults

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods..."
          className="pl-9"
          onFocus={() => query.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {(loading || importing) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && hasResults && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-card shadow-xl">
          {localResults.map((food) => (
            <li
              key={food.id}
              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors"
              onMouseDown={() => handleSelectLocal(food)}
            >
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium truncate">{food.name}</p>
                {food.brand && <p className="text-xs text-muted-foreground truncate">{food.brand}</p>}
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0">
                <p>{Math.round(food.calories)} kcal</p>
                <p>{food.servingSizeG}{food.servingUnit}</p>
              </div>
            </li>
          ))}

          {usdaResults.length > 0 && (
            <>
              <li className="px-3 py-1.5 flex items-center gap-1.5 border-t border-border bg-muted/30 sticky top-0">
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground font-medium">USDA Database</span>
              </li>
              {usdaResults.map((food) => (
                <li
                  key={food.fdcId}
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors"
                  onMouseDown={() => handleSelectUsda(food)}
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{food.name}</p>
                    {food.brand && <p className="text-xs text-muted-foreground truncate">{food.brand}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{Math.round(food.calories)} kcal</p>
                    <p>per 100g</p>
                  </div>
                </li>
              ))}
            </>
          )}
        </ul>
      )}

      {showEmpty && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-4 text-center text-sm text-muted-foreground">
          No results for &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}
