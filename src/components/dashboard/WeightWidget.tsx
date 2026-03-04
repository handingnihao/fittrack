"use client"
import { useState, useEffect } from "react"
import { Scale, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { kgToLbs, lbsToKg, todayStr, round1 } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { format, parseISO } from "date-fns"
import type { WeightEntry } from "@/db/schema"

interface ChartPoint {
  dateStr: string
  label: string
  lbs: number
}

export function WeightWidget() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [inputLbs, setInputLbs] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/weight?days=60")
      .then((r) => r.json())
      .then((data: WeightEntry[]) => {
        setEntries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const today = todayStr()
  const todayEntry = entries.find((e) => e.dateStr === today)
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null

  async function handleLog() {
    const lbs = parseFloat(inputLbs)
    if (isNaN(lbs) || lbs <= 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: lbsToKg(lbs), dateStr: today }),
      })
      if (res.ok) {
        const updated: WeightEntry = await res.json()
        setEntries((prev) => {
          const without = prev.filter((e) => e.dateStr !== today)
          return [...without, updated].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
        })
        setInputLbs("")
        toast.success("Weight logged!")
      } else {
        toast.error("Failed to log weight")
      }
    } finally {
      setSaving(false)
    }
  }

  const chartData: ChartPoint[] = entries.map((e) => ({
    dateStr: e.dateStr,
    label: format(parseISO(e.dateStr), "M/d"),
    lbs: round1(kgToLbs(e.weightKg)),
  }))

  const weights = chartData.map((d) => d.lbs)
  const minW = weights.length > 0 ? Math.floor(Math.min(...weights)) - 2 : 0
  const maxW = weights.length > 0 ? Math.ceil(Math.max(...weights)) + 2 : 300

  return (
    <div className="bento-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Body Weight</p>
        </div>
        {latestEntry && (
          <p className="text-lg font-bold text-foreground">
            {round1(kgToLbs(latestEntry.weightKg))} lbs
          </p>
        )}
      </div>

      {/* Log form */}
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="50"
          max="999"
          value={inputLbs}
          onChange={(e) => setInputLbs(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          placeholder={todayEntry ? `${round1(kgToLbs(todayEntry.weightKg))} lbs today` : "Log weight (lbs)"}
          className="h-9 text-sm"
          disabled={saving}
        />
        <Button
          size="sm"
          className="h-9 px-3 gap-1.5 shrink-0"
          onClick={handleLog}
          disabled={saving || !inputLbs}
        >
          <Plus className="w-3.5 h-3.5" />
          {todayEntry ? "Update" : "Log"}
        </Button>
      </div>

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <div className="h-32 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minW, maxW]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(val: number) => [`${val} lbs`, "Weight"]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="lbs"
                stroke="rgba(167,139,250,0.9)"
                strokeWidth={2}
                dot={{ r: 3, fill: "rgba(167,139,250,0.9)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Log your weight to start tracking trends
        </p>
      )}

      {!loading && chartData.length === 1 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Log on more days to see a trend chart
        </p>
      )}
    </div>
  )
}
