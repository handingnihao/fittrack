"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Camera, Trash2, Upload, X } from "lucide-react"
import { todayStr } from "@/lib/utils"
import Image from "next/image"

interface Photo {
  id: number
  date_str: string
  filename: string
  angle: "front" | "side" | "back"
  notes: string | null
}

export function PhotosPanel() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [angle, setAngle] = useState<"front" | "side" | "back">("front")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((d) => setPhotos(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("photo", file)
      fd.append("dateStr", todayStr())
      fd.append("angle", angle)

      const res = await fetch("/api/photos", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const photo = await res.json()
      setPhotos((prev) => [photo, ...prev])
      toast.success("Photo saved!")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/photos/${id}`, { method: "DELETE" })
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    if (viewing?.id === id) setViewing(null)
  }

  // Group by date
  const byDate = photos.reduce((acc, p) => {
    if (!acc[p.date_str]) acc[p.date_str] = []
    acc[p.date_str].push(p)
    return acc
  }, {} as Record<string, Photo[]>)

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Progress Photos</h3>
      </div>

      {/* Upload controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["front", "side", "back"] as const).map((a) => (
            <Button
              key={a}
              variant={angle === a ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs capitalize"
              onClick={() => setAngle(a)}
            >
              {a}
            </Button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Upload Photo"}
        </Button>
      </div>

      {/* Photo grid by date */}
      {Object.keys(byDate).length === 0 ? (
        <p className="text-xs text-muted-foreground">No photos yet. Upload your first progress photo!</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, datePhotos]) => (
            <div key={date}>
              <p className="text-xs text-muted-foreground mb-2">{date}</p>
              <div className="flex flex-wrap gap-2">
                {datePhotos.map((p) => (
                  <div
                    key={p.id}
                    className="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border border-border hover:border-primary/50 transition-colors group"
                    onClick={() => setViewing(p)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${p.id}`}
                      alt={`${p.angle} view`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 capitalize">
                      {p.angle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo viewer dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">{viewing?.angle} View — {viewing?.date_str}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${viewing.id}`}
                alt={`${viewing.angle} view`}
                className="w-full rounded-lg"
              />
              {viewing.notes && <p className="text-xs text-muted-foreground">{viewing.notes}</p>}
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => handleDelete(viewing.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Photo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
