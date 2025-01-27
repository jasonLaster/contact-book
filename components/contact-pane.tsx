"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Contact, PhoneNumber } from "@/lib/db/schema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ArrowLeft, UserCircle2, Pencil, X, Upload, Loader2, Plus, GripVertical } from "lucide-react"
import { deleteContact, updateContact } from "@/lib/actions"
import { formatPhoneNumber } from "@/lib/utils"
import "@/styles/animations.css"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

interface ContactPaneProps {
  contact: (Contact & { phoneNumbers: PhoneNumber[]; urlName: string }) | null
  onClose?: () => void
  isMobile: boolean
}

export function ContactPane({ contact, onClose, isMobile }: ContactPaneProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [formData, setFormData] = useState(
    contact || {
      id: "",
      name: "",
      phoneNumbers: [],
      email: "",
      notes: "",
      imageUrl: "",
      urlName: "",
    },
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showQuotaError, setShowQuotaError] = useState(false)
  const { toast } = useToast()
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (contact) {
      console.log("Contact imageUrl:", contact.imageUrl)
      setFormData({
        ...contact,
        imageUrl: contact.imageUrl || "",
        phoneNumbers:
          contact.phoneNumbers.length > 0
            ? contact.phoneNumbers
            : [{ number: "", label: "", type: "mobile", isPrimary: true }],
      })
    }
  }, [contact])

  const handleDelete = async () => {
    if (contact) {
      try {
        await deleteContact(contact.id)
        router.push("/")
        toast({
          title: "Contact deleted",
          description: `${contact.name} has been removed from your contacts.`,
        })
      } catch (error) {
        console.error("Error deleting contact:", error)
        toast({
          title: "Error",
          description: "Failed to delete contact. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (contact) {
      setIsSaving(true)
      const updatedFormData = {
        ...formData,
        phoneNumbers: formData.phoneNumbers.filter((phone) => phone.number.trim() !== ""),
      }
      // Optimistically update the UI
      setFormData(updatedFormData)
      setIsEditing(false)

      try {
        await updateContact(contact.id, updatedFormData)
        toast({
          title: "Contact updated",
          description: "Your changes have been saved successfully.",
        })
      } catch (error: any) {
        console.error("Error updating contact:", error)
        // Revert changes on error
        setFormData(contact)
        setIsEditing(true)
        if (error.message && error.message.includes("Data transfer quota exceeded")) {
          setShowQuotaError(true)
        } else {
          toast({
            title: "Error",
            description: "Failed to update contact. Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handlePhoneChange =
    (index: number, field: keyof PhoneNumber) => (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const newPhoneNumbers = [...formData.phoneNumbers]
      if (field === "number" && typeof e !== "string") {
        newPhoneNumbers[index].number = formatPhoneNumber(e.target.value)
      } else if (field === "type" && typeof e === "string") {
        newPhoneNumbers[index].type = e
      }
      setFormData((prev) => ({ ...prev, phoneNumbers: newPhoneNumbers }))
    }

  const handleAddPhone = () => {
    if (formData.phoneNumbers.every((phone) => phone.number.trim() !== "")) {
      setFormData((prev) => ({
        ...prev,
        phoneNumbers: [...prev.phoneNumbers, { number: "", label: "", type: "mobile", isPrimary: false }],
      }))
    } else {
      toast({
        title: "Cannot add phone number",
        description: "Please fill in the existing empty phone number first.",
        variant: "destructive",
      })
    }
  }

  const handleRemovePhone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index),
    }))
  }

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newPhoneNumbers = [...formData.phoneNumbers]
      const draggedItem = newPhoneNumbers[dragItem.current]
      newPhoneNumbers.splice(dragItem.current, 1)
      newPhoneNumbers.splice(dragOverItem.current, 0, draggedItem)
      setFormData((prev) => ({ ...prev, phoneNumbers: newPhoneNumbers }))
    }
    dragItem.current = null
    dragOverItem.current = null
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (contact && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        if (!file.type.startsWith("image/")) {
          console.error("File is not an image:", file.type)
          toast({
            title: "Invalid file",
            description: "Please upload an image file.",
            variant: "destructive",
          })
          return
        }
        await handleImageUpload(file)
      }
    },
    [contact, toast],
  )

  const handleAvatarClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleImageUpload(file)
    }
    input.click()
  }

  const handleImageUpload = async (file: File) => {
    if (contact) {
      setIsUploading(true)
      try {
        const updatedContact = await updateContact(contact.id, formData, file)
        setFormData((prev) => ({ ...prev, imageUrl: updatedContact.imageUrl }))
        toast({
          title: "Image uploaded",
          description: "Your contact's avatar has been updated.",
        })
      } catch (error) {
        console.error("Error uploading image:", error)
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      router.push("/")
    }
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value
    setFormData((prev) => ({ ...prev, notes: newNotes }))

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
    }

    notesTimeoutRef.current = setTimeout(() => {
      handleSaveNotes(newNotes)
    }, 500)
  }

  const handleSaveNotes = async (notes: string) => {
    if (contact) {
      setIsSavingNotes(true)
      try {
        await updateContact(contact.id, { ...formData, notes })
      } catch (error) {
        console.error("Error updating notes:", error)
        toast({
          title: "Error",
          description: "Failed to update notes. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSavingNotes(false)
      }
    }
  }

  const handleNotesBlur = () => {
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
      handleSaveNotes(formData.notes || "")
    }
  }

  if (!contact) {
    return (
      <div className="bg-background p-6 shadow-lg h-full flex flex-col items-center justify-center text-muted-foreground">
        <UserCircle2 className="w-20 h-20 mb-4" />
        <p className="text-lg">Select a contact to view details</p>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-background h-full flex flex-col ${isMobile ? "fixed inset-0 z-50" : "p-6 shadow-lg"}`}>
        <div className="flex items-center justify-between h-14 px-4">
          {(isMobile || !onClose) && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isEditing) {
                  setFormData(contact)
                }
                setIsEditing(!isEditing)
              }}
            >
              {isEditing ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-4 overflow-y-auto">
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`relative group cursor-pointer rounded-full ${isDragging ? "ring-2 ring-primary" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleAvatarClick}
            >
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.imageUrl || ""} alt={formData.name} />
                <AvatarFallback className="text-xl">
                  {formData.name
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
            <div className="text-center">
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="text-2xl font-semibold text-center"
                />
              ) : (
                <h3 className="text-2xl font-semibold">{formData.name}</h3>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              <div className="space-y-2">
                {formData.phoneNumbers.map((phone, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 mb-2 bg-background ${isEditing ? "cursor-move" : ""}`}
                    draggable={isEditing}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {isEditing && (
                      <div className="cursor-move">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Input
                      value={phone.number}
                      onChange={(e) => handlePhoneChange(index, "number")(e)}
                      placeholder="Phone number"
                      disabled={!isEditing}
                      className="flex-grow"
                    />
                    {isEditing ? (
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
                    ) : (
                      <span className="w-[120px] text-sm text-muted-foreground">{phone.type}</span>
                    )}
                    {isEditing && index > 0 && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemovePhone(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <Button onClick={handleAddPhone} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Phone Number
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              ) : (
                <p className="text-muted-foreground">{formData.email || "Not provided"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <div className="relative">
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                  className={`min-h-[100px] ${isSavingNotes ? "tron-loading" : ""}`}
                  placeholder="Add notes..."
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <Button onClick={handleSubmit} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </div>
      </div>
      <AlertDialog open={showQuotaError} onOpenChange={setShowQuotaError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Transfer Quota Exceeded</AlertDialogTitle>
            <AlertDialogDescription>
              Your project has exceeded its data transfer quota. To continue using the application, please upgrade your
              plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowQuotaError(false)}>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

