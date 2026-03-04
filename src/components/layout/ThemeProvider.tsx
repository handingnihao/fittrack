"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { hexToHsl } from "@/lib/utils"

interface ThemeContextValue {
  theme: string
  setTheme: (theme: string) => void
  customAccent: string
  setCustomAccent: (hex: string) => void
  customBase: "dark" | "light"
  setCustomBase: (base: "dark" | "light") => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark-purple",
  setTheme: () => {},
  customAccent: "#a78bfa",
  setCustomAccent: () => {},
  customBase: "dark",
  setCustomBase: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState("dark-purple")
  const [customAccent, setCustomAccentState] = useState("#a78bfa")
  const [customBase, setCustomBaseState] = useState<"dark" | "light">("dark")

  useEffect(() => {
    try {
      setThemeState(localStorage.getItem("fittrack-theme") || "dark-purple")
      setCustomAccentState(localStorage.getItem("fittrack-custom-accent-hex") || "#a78bfa")
      setCustomBaseState((localStorage.getItem("fittrack-custom-base") || "dark") as "dark" | "light")
    } catch {}
  }, [])

  function setTheme(t: string) {
    setThemeState(t)
    try { localStorage.setItem("fittrack-theme", t) } catch {}
    document.documentElement.setAttribute("data-theme", t)
    if (t.startsWith("light")) {
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
    }
    if (t !== "custom") {
      document.documentElement.removeAttribute("data-custom-base")
    }
  }

  function setCustomAccent(hex: string) {
    setCustomAccentState(hex)
    const hsl = hexToHsl(hex)
    try {
      localStorage.setItem("fittrack-custom-accent", hsl)
      localStorage.setItem("fittrack-custom-accent-hex", hex)
    } catch {}
    document.documentElement.style.setProperty("--primary", hsl)
    document.documentElement.style.setProperty("--ring", hsl)
  }

  function setCustomBase(base: "dark" | "light") {
    setCustomBaseState(base)
    try { localStorage.setItem("fittrack-custom-base", base) } catch {}
    if (base === "light") {
      document.documentElement.setAttribute("data-custom-base", "light")
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.removeAttribute("data-custom-base")
      document.documentElement.classList.add("dark")
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customAccent, setCustomAccent, customBase, setCustomBase }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
