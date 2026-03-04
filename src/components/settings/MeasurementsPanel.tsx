"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Trash2, Ruler } from "lucide-react"
import { todayStr } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Measurement {
  id: number
  date_str: string
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  neck_cm: number | null
  body_fat_pct: number | null
}

function cmToIn(cm: number) { return (cm / 2.54).toFixed(1) }
function inToCm(s: string) { return parseFloat(s) * 2.54 }

export function MeasurementsPanel() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [unit, setUnit] = useState<"cm" | "in">("cm")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    dateStr: todayStr(),
    chestCm: "", waistCm: "", hipsCm: "",
    leftArmCm: "", neckCm: "", bodyFatPct: "",
  })

  useEffect(() => {
    fetch("/api/measurements?limit=10")
      .then((r) => r.json())
      .then((d) => setMeasurements(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  function displayVal(cm: number | null) {
    if (cm == null) return "—"
    return unit === "in" ? `${cmToIn(cm)}"` : `${cm.toFixed(1)} cm`
  }

  async function handleSave() {
    setSaving(true)
    try {
      const toNum = (s: string, isIn: boolean) => {
        const n = parseFloat(s)
        if (isNaN(n)) return undefined
        return isIn ? inToCm(s) : n
      }

      const body = {
        dateStr: form.dateStr,
        chestCm: toNum(form.chestCm, unit === "in"),
        waistCm: toNum(form.waistCm, unit === "in"),
        hipsCm: toNum(form.hipsCm, unit === "in"),
        leftArmCm: toNum(form.leftArmCm, unit === "in"),
        neckCm: toNum(form.neckCm, unit === "in"),
        bodyFatPct: form.bodyFatPct ? parseFloat(form.bodyFatPct) : undefined,
      }

      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const { measurement } = await res.json()
      setMeasurements((prev) => [measurement, ...prev].slice(0, 10))
      toast.success("Measurements saved! +30 XP")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/measurements/${id}`, { method: "DELETE" })
    setMeasurements((prev) => prev.filter((m) => m.id !== id))
  }

  // Waist trend chart data
  const chartData = [...measurements]
    .reverse()
    .filter((m) => m.waist_cm != null)
    .map((m) => ({
      date: m.date_str.slice(5),
      waist: unit === "in" ? parseFloat(cmToIn(m.waist_cm!)) : m.waist_cm!,
    }))

  const fields = [
    { key: "chestCm", label: "Chest" },
    { key: "waistCm", label: "Waist" },
    { key: "hipsCm", label: "Hips" },
    { key: "leftArmCm", label: "Arm" },
    { key: "neckCm", label: "Neck" },
  ] as const

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Body Measurements</h3>
        </div>
        <div className="flex gap-1">
          {(["cm", "in"] as const).map((u) => (
            <Button
              key={u}
              variant={unit === u ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setUnit(u)}
            >
              {u}
            </Button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-3">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={form.dateStr}
            onChange={(e) => setForm((p) => ({ ...p, dateStr: e.target.value }))}
            className="h-8 text-sm mt-1"
          />
        </div>
        {fields.map(({ key, label }) => (
          <div key={key}>
            <Label className="text-xs">{label} ({unit})</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={(form as any)[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={unit === "cm" ? "cm" : "in"}
              className="h-8 text-sm mt-1"
            />
          </div>
        ))}
        <div>
          <Label className="text-xs">Body Fat %</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="60"
            value={form.bodyFatPct}
            onChange={(e) => setForm((p) => ({ ...p, bodyFatPct: e.target.value }))}
            placeholder="%"
            className="h-8 text-sm mt-1"
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save Measurements"}
      </Button>

      {/* Waist trend chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Waist trend</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={30} />
              <Tooltip formatter={(v) => [`${v} ${unit}`, "Waist"]} />
              <Line type="monotone" dataKey="waist" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      {measurements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-1">Date</th>
                <th className="text-right pb-1">Chest</th>
                <th className="text-right pb-1">Waist</th>
                <th className="text-right pb-1">Hips</th>
                <th className="text-right pb-1">BF%</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-1.5">{m.date_str}</td>
                  <td className="text-right text-muted-foreground">{displayVal(m.chest_cm)}</td>
                  <td className="text-right text-muted-foreground">{displayVal(m.waist_cm)}</td>
                  <td className="text-right text-muted-foreground">{displayVal(m.hips_cm)}</td>
                  <td className="text-right text-muted-foreground">{m.body_fat_pct != null ? `${m.body_fat_pct}%` : "—"}</td>
                  <td className="text-right">
                    <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
