"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { User, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Profile {
  id: number
  name: string
}

function getActiveCookieId(): number {
  if (typeof document === "undefined") return 1
  const match = document.cookie.match(/(?:^|;\s*)fittrack_profile_id=([^;]*)/)
  return match ? parseInt(match[1]) : 1
}

export function ProfilesPanel() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setActiveId(getActiveCookieId())
    fetch("/api/profiles")
      .then(r => r.json())
      .then(data => { setProfiles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function switchProfile(id: number) {
    if (id === activeId) return
    await fetch("/api/profile-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: id }),
    })
    setActiveId(id)
    router.refresh()
    toast.success("Switched profile")
  }

  async function addProfile() {
    const name = prompt("Profile name:")
    if (!name?.trim()) return
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (!res.ok) { toast.error("Failed to create profile"); return }
    const created: Profile = await res.json()
    setProfiles(prev => [...prev, created])
    await fetch("/api/profile-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: created.id }),
    })
    setActiveId(created.id)
    router.refresh()
    toast.success(`Created "${created.name}"`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profiles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select
            value={loading ? undefined : String(activeId)}
            onValueChange={(val) => switchProfile(Number(val))}
            disabled={loading}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Loading..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={addProfile} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
