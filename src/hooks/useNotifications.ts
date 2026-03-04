"use client"
import { useState, useEffect, useCallback } from "react"

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledTime, setScheduledTime] = useState<string | null>(null)

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator
    setIsSupported(supported)
    if (supported) {
      setPermission(Notification.permission)
      const stored = localStorage.getItem("fittrack_reminder_enabled")
      const storedTime = localStorage.getItem("fittrack_reminder_time")
      setIsScheduled(stored === "true")
      setScheduledTime(storedTime)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied"
    const perm = await Notification.requestPermission()
    setPermission(perm)
    return perm
  }, [isSupported])

  const scheduleDaily = useCallback(async (time: string, message?: string) => {
    if (!isSupported) throw new Error("Not supported")

    const perm = await requestPermission()
    if (perm !== "granted") throw new Error("Permission denied")

    const reg = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready

    reg.active?.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      time,
      message: message ?? "Time to work out! 💪",
    })

    localStorage.setItem("fittrack_reminder_enabled", "true")
    localStorage.setItem("fittrack_reminder_time", time)
    setIsScheduled(true)
    setScheduledTime(time)
  }, [isSupported, requestPermission])

  const cancelSchedule = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        reg.active?.postMessage({ type: "CANCEL_NOTIFICATION" })
      } catch {}
    }
    localStorage.removeItem("fittrack_reminder_enabled")
    localStorage.removeItem("fittrack_reminder_time")
    setIsScheduled(false)
    setScheduledTime(null)
  }, [])

  return {
    isSupported,
    permission,
    isScheduled,
    scheduledTime,
    requestPermission,
    scheduleDaily,
    cancelSchedule,
  }
}
