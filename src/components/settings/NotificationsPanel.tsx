"use client"
import { useState, useEffect } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function NotificationsPanel() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState("08:00")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const isSupported = "Notification" in window && "serviceWorker" in navigator
    setSupported(isSupported)
    if (isSupported) {
      setPermission(Notification.permission)
      const stored = localStorage.getItem("fittrack_reminder_enabled")
      const storedTime = localStorage.getItem("fittrack_reminder_time")
      if (stored === "true") setEnabled(true)
      if (storedTime) setTime(storedTime)
    }
  }, [])

  async function handleEnable() {
    if (!supported) return
    setSaving(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") {
        toast.error("Notification permission denied")
        return
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Schedule the notification
      reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATION", time, message: "Time to work out! 💪" })

      localStorage.setItem("fittrack_reminder_enabled", "true")
      localStorage.setItem("fittrack_reminder_time", time)
      setEnabled(true)
      toast.success(`Daily reminder set for ${time}`)
    } catch {
      toast.error("Failed to enable notifications")
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable() {
    setSaving(true)
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        reg.active?.postMessage({ type: "CANCEL_NOTIFICATION" })
      }
      localStorage.removeItem("fittrack_reminder_enabled")
      localStorage.removeItem("fittrack_reminder_time")
      setEnabled(false)
      toast.success("Reminder cancelled")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!enabled) return handleEnable()
    setSaving(true)
    try {
      const reg = await navigator.serviceWorker.ready
      reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATION", time, message: "Time to work out! 💪" })
      localStorage.setItem("fittrack_reminder_time", time)
      toast.success(`Reminder updated to ${time}`)
    } finally {
      setSaving(false)
    }
  }

  if (!supported) {
    return (
      <div className="bento-card space-y-3">
        <div className="flex items-center gap-2">
          <BellOff className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <p className="text-xs text-muted-foreground">Notifications are not supported in this browser.</p>
      </div>
    )
  }

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Workout Reminders</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Daily Reminder</p>
            <p className="text-xs text-muted-foreground">
              {permission === "denied" ? "Permission denied — please enable in browser settings" :
               enabled ? "Reminder is active" : "Get a daily push notification to work out"}
            </p>
          </div>
          <Button
            variant={enabled ? "destructive" : "default"}
            size="sm"
            onClick={enabled ? handleDisable : handleEnable}
            disabled={saving || permission === "denied"}
          >
            {enabled ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Reminder Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-8 text-sm mt-1"
            />
          </div>
          {enabled && (
            <Button size="sm" variant="outline" onClick={handleUpdate} disabled={saving} className="h-8">
              Update
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
