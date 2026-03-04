"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, ChevronDown, Plus, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface Profile {
  id: number
  name: string
}

function getActiveCookieId(): number {
  if (typeof document === "undefined") return 1
  const match = document.cookie.match(/(?:^|;\s*)fittrack_profile_id=([^;]*)/)
  return match ? parseInt(match[1]) : 1
}

export function ProfileSwitcher() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState<number>(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setActiveId(getActiveCookieId())
    fetch("/api/profiles")
      .then(r => r.json())
      .then(data => setProfiles(data))
      .catch(() => {})
  }, [])

  const active = profiles.find(p => p.id === activeId)

  async function switchProfile(id: number) {
    if (id === activeId) return
    setLoading(true)
    await fetch("/api/profile-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: id }),
    })
    setActiveId(id)
    setLoading(false)
    router.refresh()
  }

  async function addProfile() {
    const name = prompt("Profile name:")
    if (!name?.trim()) return
    setLoading(true)
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    const created = await res.json()
    setProfiles(prev => [...prev, created])
    await switchProfile(created.id)
    setLoading(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 py-2 h-auto text-sm font-medium"
          disabled={loading}
        >
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-primary" />
          </div>
          <span className="flex-1 text-left truncate">{active?.name ?? "Profile"}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {profiles.map(p => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => switchProfile(p.id)}
            className="flex items-center gap-2"
          >
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="flex-1 truncate">{p.name}</span>
            {p.id === activeId && <Check className="w-3 h-3 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={addProfile} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
