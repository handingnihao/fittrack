"use client"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import type { WeeklyStats } from "@/types"

interface Props {
  stats: WeeklyStats
}

function StatChip({ label, value, color }: { label: string; value: string; color: "purple" | "blue" }) {
  const colorClass = color === "purple"
    ? "text-neon-purple bg-purple-500/10 border-purple-500/20"
    : "text-neon-blue bg-blue-500/10 border-blue-500/20"
  return (
    <div className={`rounded-lg border px-3 py-2 ${colorClass}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  )
}

function StreakChip({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2 bg-secondary/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">
        {icon} {value}-day streak
      </p>
    </div>
  )
}

export function WeeklyStatsPanel({ stats }: Props) {
  const { workoutStreak, nutritionStreak, thisWeekWorkouts, thisWeekAvgCalPercent, weeklyBuckets } = stats

  const chartData = weeklyBuckets.map((b) => ({
    name: b.label,
    workouts: Math.round((b.workoutDays / 7) * 100),
    calories: Math.round(b.avgCalPercent * 100),
  }))

  return (
    <div className="bento-card space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">Weekly Activity</p>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2">
        <StatChip
          label="This week"
          value={`${thisWeekWorkouts} workout${thisWeekWorkouts !== 1 ? "s" : ""}`}
          color="purple"
        />
        <StatChip
          label="Avg cal target"
          value={`${Math.round(thisWeekAvgCalPercent * 100)}%`}
          color="blue"
        />
      </div>

      {/* Streak chips */}
      <div className="grid grid-cols-2 gap-2">
        <StreakChip icon="🔥" label="Workout streak" value={workoutStreak} />
        <StreakChip icon="🥗" label="Nutrition streak" value={nutritionStreak} />
      </div>

      {/* 4-week bar chart */}
      <div className="h-28 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} barCategoryGap="35%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(val: number, name: string) => [
                `${val}%`,
                name === "workouts" ? "Workout days" : "Cal adherence",
              ]}
            />
            <Bar dataKey="workouts" fill="rgba(167,139,250,0.8)" radius={[3, 3, 0, 0]} name="workouts" />
            <Bar dataKey="calories" fill="rgba(96,165,250,0.8)" radius={[3, 3, 0, 0]} name="calories" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
