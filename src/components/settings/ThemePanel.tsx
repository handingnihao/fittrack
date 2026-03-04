"use client"
import { useTheme } from "@/components/layout/ThemeProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const DARK_THEMES = [
  { key: "dark-purple", label: "Purple", bg: "#0f0f0f", accent: "#a78bfa" },
  { key: "dark-ocean",  label: "Ocean",  bg: "#0f0f0f", accent: "#38bdf8" },
  { key: "dark-forest", label: "Forest", bg: "#0f0f0f", accent: "#4ade80" },
  { key: "dark-ember",  label: "Ember",  bg: "#0f0f0f", accent: "#fb923c" },
]

const LIGHT_THEMES = [
  { key: "light-purple", label: "Purple", bg: "#fafafa", accent: "#7c3aed" },
  { key: "light-ocean",  label: "Ocean",  bg: "#fafafa", accent: "#0369a1" },
  { key: "light-forest", label: "Forest", bg: "#fafafa", accent: "#15803d" },
  { key: "light-ember",  label: "Ember",  bg: "#fafafa", accent: "#ea580c" },
]

function ThemeSwatch({
  themeKey, label, bg, accent, active, onSelect,
}: {
  themeKey: string
  label: string
  bg: string
  accent: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
        active ? "border-primary" : "border-border hover:border-muted-foreground/40"
      )}
    >
      <div
        className="w-full h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <span className="text-xs font-medium">{label}</span>
      {active && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}

export function ThemePanel() {
  const { theme, setTheme, customAccent, setCustomAccent, customBase, setCustomBase } = useTheme()

  function handleCustomAccent(hex: string) {
    setCustomAccent(hex)
    if (theme !== "custom") setTheme("custom")
  }

  function handleCustomBase(base: "dark" | "light") {
    setCustomBase(base)
    if (theme !== "custom") setTheme("custom")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dark Themes</p>
          <div className="grid grid-cols-4 gap-2">
            {DARK_THEMES.map(t => (
              <ThemeSwatch
                key={t.key}
                themeKey={t.key}
                label={t.label}
                bg={t.bg}
                accent={t.accent}
                active={theme === t.key}
                onSelect={() => setTheme(t.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Light Themes</p>
          <div className="grid grid-cols-4 gap-2">
            {LIGHT_THEMES.map(t => (
              <ThemeSwatch
                key={t.key}
                themeKey={t.key}
                label={t.label}
                bg={t.bg}
                accent={t.accent}
                active={theme === t.key}
                onSelect={() => setTheme(t.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Custom</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => handleCustomBase("dark")}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  theme === "custom" && customBase === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                Dark
              </button>
              <button
                onClick={() => handleCustomBase("light")}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  theme === "custom" && customBase === "light"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                Light
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Accent</span>
              <input
                type="color"
                value={customAccent}
                onChange={(e) => handleCustomAccent(e.target.value)}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
              />
            </div>
            {theme !== "custom" && (
              <button
                onClick={() => setTheme("custom")}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Use custom
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
