"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Profile } from "@/db/schema"

const schema = z.object({
  name: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm({ profile }: { profile: Profile }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.name },
  })

  const onSubmit = async (data: FormValues) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    })
    if (res.ok) toast.success("Profile name updated")
    else toast.error("Failed to update profile")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Name</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="Your name" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
