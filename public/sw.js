/* FitTrack Service Worker — daily workout reminders */

let notificationInterval = null
let scheduledTime = null

self.addEventListener("message", (event) => {
  const { type, time, message } = event.data ?? {}

  if (type === "SCHEDULE_NOTIFICATION") {
    scheduledTime = time
    const msg = message || "Time to work out! 💪"

    // Clear existing interval
    if (notificationInterval) {
      clearInterval(notificationInterval)
    }

    // Check every 60 seconds if it's time
    notificationInterval = setInterval(() => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      if (hhmm === scheduledTime) {
        self.registration.showNotification("FitTrack", {
          body: msg,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "fittrack-reminder",
          renotify: false,
        }).catch(() => {})
      }
    }, 60000)
  }

  if (type === "CANCEL_NOTIFICATION") {
    if (notificationInterval) {
      clearInterval(notificationInterval)
      notificationInterval = null
    }
    scheduledTime = null
  }
})

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus()
      } else {
        self.clients.openWindow("/workouts")
      }
    })
  )
})
