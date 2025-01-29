"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addContact } from "@/lib/actions"
import { formatPhoneNumber } from "@/lib/utils"
import { Plus, Trash2, Upload, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PhoneNumber {
  number: string
  type: string
}

export function AddContactDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    { number: "", type: "mobile" },
  ])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      // Filter out empty phone numbers before submitting
      const validPhoneNumbers = phoneNumbers.filter(p => p.number.trim() !== "")
      
      await addContact(
        formData.get("name") as string,
        validPhoneNumbers.map((p, index) => ({ ...p, label: p.type, isPrimary: index === 0 })),
        (formData.get("email") as string) || undefined,
        (formData.get("notes") as string) || undefined,
        imageFile || undefined
      )
      setLoading(false)
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error adding contact:", error)
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPhoneNumbers([{ number: "", type: "mobile" }])
    setName("")
    setImageFile(null)
    setImagePreview(null)
  }

  const handlePhoneChange =
    (index: number, field: keyof PhoneNumber) => (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const newPhoneNumbers = [...phoneNumbers]
      if (field === "number" && typeof e !== "string") {
        newPhoneNumbers[index].number = formatPhoneNumber(e.target.value)
      } else if (field === "type" && typeof e === "string") {
        newPhoneNumbers[index].type = e
      }
      setPhoneNumbers(newPhoneNumbers)
    }

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { number: "", type: "mobile" }])
  }

  const removePhoneNumber = (index: number) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (!file.type.startsWith("image/")) {
        console.error("File is not an image:", file.type)
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }, [])

  const handleAvatarClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
      }
    }
    input.click()
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) resetForm()
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div
              className="relative group cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleAvatarClick}
            >
              <Avatar className="w-24 h-24">
                <AvatarImage src={imagePreview || ""} />
                <AvatarFallback className="text-xl">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {isUploading ? (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="name"
              placeholder="Name"
              required
              className="text-lg text-center font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Numbers</Label>
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={phone.number}
                  onChange={(e) => handlePhoneChange(index, "number")(e)}
                  placeholder={index === 0 ? "Primary phone number (required)" : "Phone number"}
                  required={index === 0}
                  className="flex-1"
                />
                <Select value={phone.type} onValueChange={(value) => handlePhoneChange(index, "type")(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {index > 0 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePhoneNumber(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPhoneNumber} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Phone Number
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" className="min-h-[100px]" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

