"use client"
import { useState, useEffect } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const PLATES = [45, 35, 25, 10, 5, 2.5] as const
type PlateWeight = (typeof PLATES)[number]

const BAR_WEIGHT = 45

function decompose(totalLbs: number): Record<PlateWeight, number> {
  let remaining = (totalLbs - BAR_WEIGHT) / 2
  if (remaining < 0) remaining = 0
  const counts = {} as Record<PlateWeight, number>
  for (const plate of PLATES) {
    counts[plate] = Math.floor(remaining / plate)
    remaining -= counts[plate] * plate
    remaining = Math.round(remaining * 10) / 10
  }
  return counts
}

interface Props {
  currentWeightLbs: number | null
  onConfirm: (lbs: number) => void
  children: React.ReactNode
}

export function PlateCalculator({ currentWeightLbs, onConfirm, children }: Props) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<Record<PlateWeight, number>>(() =>
    decompose(currentWeightLbs ?? BAR_WEIGHT)
  )

  useEffect(() => {
    if (open) {
      setCounts(decompose(currentWeightLbs ?? BAR_WEIGHT))
    }
  }, [open, currentWeightLbs])

  const total = BAR_WEIGHT + 2 * PLATES.reduce((sum, p) => sum + p * counts[p], 0)

  function adjust(plate: PlateWeight, delta: number) {
    setCounts(prev => ({
      ...prev,
      [plate]: Math.max(0, prev[plate] + delta),
    }))
  }

  function handleConfirm() {
    onConfirm(total)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Plate Calculator</DialogTitle>
        </DialogHeader>

        {/* Total weight */}
        <div className="text-center py-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-3xl font-bold text-primary">{total} lbs</p>
          <p className="text-xs text-muted-foreground mt-1">Bar 45 + {(total - BAR_WEIGHT) / 2} per side</p>
        </div>

        {/* Plate controls */}
        <div className="space-y-2">
          {PLATES.map(plate => (
            <div key={plate} className="flex items-center gap-3">
              <span className="w-14 text-sm font-medium text-right">{plate} lb</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => adjust(plate, -1)}
                disabled={counts[plate] === 0}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-6 text-center text-sm font-bold">{counts[plate]}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => adjust(plate, 1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: Math.min(counts[plate], 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-5 rounded-sm bg-primary/40 border border-primary/50"
                    style={{ width: `${Math.max(8, 40 / Math.max(counts[plate], 1))}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={handleConfirm}>
          Use {total} lbs
        </Button>
      </DialogContent>
    </Dialog>
  )
}
