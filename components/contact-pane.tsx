"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Contact, PhoneNumber } from "@/lib/db/schema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ArrowLeft, UserCircle2, Pencil, X, Upload, Loader2, Plus, GripVertical, Save } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"

interface ContactPaneProps {
  contact: (Contact & { phoneNumbers: PhoneNumber[]; urlName: string }) | null
  onClose?: () => void
  isMobile: boolean
  isLoading?: boolean
}

type UpdatePhoneNumber = {
  id?: number
  number: string
  label?: string
  type: string
  isPrimary?: boolean
}

type FormDataType = {
  id: string
  name: string
  phoneNumbers: UpdatePhoneNumber[]
  email?: string | null
  notes?: string | null
  imageUrl?: string | null
  urlName: string
  createdAt?: Date
}

type ContactUpdateData = {
  name: string
  phoneNumbers: UpdatePhoneNumber[]
  email?: string
  notes?: string
  imageUrl?: string
}

const convertPhoneNumber = (p: PhoneNumber): UpdatePhoneNumber => ({
  id: p.id ? Number(p.id) : undefined,
  number: p.number,
  label: p.label ?? undefined,
  type: "mobile", // Default to mobile since it's not in the DB
  isPrimary: p.isPrimary ?? false
})

const convertDbContactToFormData = (contact: Contact & { phoneNumbers: PhoneNumber[]; urlName: string }): FormDataType => {
  const { id, name, email, notes, imageUrl, urlName, createdAt, phoneNumbers } = contact
  return {
    id,
    name,
    email: email ?? null,
    notes: notes ?? null,
    imageUrl: imageUrl ?? null,
    urlName,
    createdAt,
    phoneNumbers: phoneNumbers.map(convertPhoneNumber)
  }
}

const createEmptyFormData = (): FormDataType => ({
  id: "",
  name: "",
  phoneNumbers: [{ number: "", label: undefined, type: "mobile", isPrimary: false }],
  email: null,
  notes: null,
  imageUrl: null,
  urlName: "",
})

const convertFormDataToUpdate = (data: FormDataType): ContactUpdateData => {
  const { name, phoneNumbers } = data
  const updateData: ContactUpdateData = {
    name,
    phoneNumbers: phoneNumbers.map(p => ({
      id: p.id,
      number: p.number,
      label: p.label,
      type: p.type,
      isPrimary: p.isPrimary
    }))
  }

  if (data.email !== null) {
    updateData.email = data.email
  }
  if (data.notes !== null) {
    updateData.notes = data.notes
  }
  if (data.imageUrl !== null) {
    updateData.imageUrl = data.imageUrl
  }

  return updateData
}

const convertDbContactToUpdateData = (contact: Contact & { phoneNumbers: PhoneNumber[]; urlName: string }): ContactUpdateData => {
  const { name, phoneNumbers, email, notes, imageUrl } = contact
  const updateData: ContactUpdateData = {
    name,
    phoneNumbers: phoneNumbers.map(p => ({
      id: p.id ? Number(p.id) : undefined,
      number: p.number,
      label: p.label ?? undefined,
      type: "mobile", // Default to mobile since it's not in the DB
      isPrimary: p.isPrimary ?? false
    }))
  }

  if (email) {
    updateData.email = email
  }
  if (notes) {
    updateData.notes = notes
  }
  if (imageUrl) {
    updateData.imageUrl = imageUrl
  }

  return updateData
}

const convertToUpdateData = (data: FormDataType | (Contact & { phoneNumbers: PhoneNumber[]; urlName: string })): ContactUpdateData => {
  if ('urlName' in data && 'createdAt' in data) {
    return convertDbContactToUpdateData(data as Contact & { phoneNumbers: PhoneNumber[]; urlName: string })
  }
  return convertFormDataToUpdate(data as FormDataType)
}

export function ContactPane({ contact, onClose, isMobile, isLoading }: ContactPaneProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState("")
  const [formData, setFormData] = useState<FormDataType>(createEmptyFormData())
  const [isSaving, setIsSaving] = useState(false)
  const [showQuotaError, setShowQuotaError] = useState(false)
  const { toast } = useToast()
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousContactRef = useRef<typeof contact>(null)

  useEffect(() => {
    if (contact && !isLoading) {
      if (contact.id !== previousContactRef.current?.id) {
        const updatedFormData = convertDbContactToFormData(contact)
        setFormData(updatedFormData)
        setLocalNotes(contact.notes || "")
        previousContactRef.current = contact
      }
    }
  }, [contact, isLoading])

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
        const updateData: ContactUpdateData = {
          name: updatedFormData.name,
          phoneNumbers: updatedFormData.phoneNumbers,
          email: updatedFormData.email ?? undefined,
          notes: updatedFormData.notes ?? undefined,
          imageUrl: updatedFormData.imageUrl ?? undefined,
        }
        await updateContact(contact.id, updateData)
        toast({
          title: "Contact updated",
          description: "Your changes have been saved successfully.",
        })
      } catch (error: any) {
        console.error("Error updating contact:", error)
        // Revert changes on error
        setFormData(convertDbContactToFormData(contact))
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
    (index: number, field: "number" | "label" | "type") => (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const newPhoneNumbers = [...formData.phoneNumbers]
      if (field === "number" && typeof e !== "string") {
        newPhoneNumbers[index].number = formatPhoneNumber(e.target.value)
      } else if (field === "type" && typeof e === "string") {
        newPhoneNumbers[index].type = e
      } else if (field === "label" && typeof e !== "string") {
        newPhoneNumbers[index].label = e.target.value
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
        const updateData: ContactUpdateData = {
          name: formData.name,
          phoneNumbers: formData.phoneNumbers,
          email: formData.email ?? undefined,
          notes: formData.notes ?? undefined,
          imageUrl: formData.imageUrl ?? undefined,
        }
        const updatedContact = await updateContact(contact.id, updateData, file)
        setFormData(convertDbContactToFormData(updatedContact))
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
    setLocalNotes(newNotes)

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
    }

    notesTimeoutRef.current = setTimeout(() => {
      handleSaveNotes(newNotes)
    }, 1000)
  }

  const handleSaveNotes = async (notes: string) => {
    if (!contact || notes === formData.notes) return

    setIsSavingNotes(true)
    try {
      const updateData = convertToUpdateData({
        ...formData,
        notes
      })
      await updateContact(contact.id, updateData)
      setFormData(prev => ({ ...prev, notes }))
    } catch (error) {
      console.error("Error updating notes:", error)
      setLocalNotes(formData.notes || "")
      toast({
        title: "Error saving notes",
        description: "Your changes couldn't be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleNotesBlur = () => {
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
      handleSaveNotes(localNotes)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : "p-6 shadow-lg"}`}>
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0">
          {(isMobile || !onClose) && (
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled>
              <Pencil className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 overflow-hidden">
          <div className="flex flex-col items-center space-y-4 flex-shrink-0">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>

          <div className="mt-6 flex flex-col flex-1 min-h-0 overflow-auto">
            <div className="space-y-2 flex-shrink-0">
              <Label>Phone Numbers</Label>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-2 flex-shrink-0 mt-4">
              <Label>Email</Label>
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2 flex flex-col flex-1 min-h-0 overflow-hidden mt-4">
              <Label>Notes</Label>
              <Skeleton className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : "p-6 shadow-lg"}`}>
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0">
          {isMobile && (
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex-1" />
        </div>

        <div className="flex flex-col flex-1 items-center justify-center p-4">
          <UserCircle2 className="w-24 h-24 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No Contact Selected</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : "p-6 shadow-lg"} transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}>
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0">
          {isMobile && (
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

        <div className="flex flex-col flex-1 p-4 overflow-hidden">
          <div className="flex flex-col items-center space-y-4 flex-shrink-0">
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

          <div className="mt-8 flex flex-col flex-1 min-h-0 overflow-auto space-y-8">
            <div className="space-y-3 flex-shrink-0">
              <Label className="text-sm text-muted-foreground font-medium">Phone Numbers</Label>
              <div className="space-y-3">
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
                        <GripVertical className="h-5 w-5 text-muted-foreground/50" />
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
                <Button onClick={handleAddPhone} variant="outline" className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" /> Add Phone Number
                </Button>
              )}
            </div>

            <div className="space-y-3 flex-shrink-0">
              <Label htmlFor="email" className="text-sm text-muted-foreground font-medium">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              ) : (
                <p className="text-muted-foreground/80 text-sm">{formData.email || "Not provided"}</p>
              )}
            </div>

            <div className="space-y-3 flex flex-col flex-1 min-h-0 overflow-hidden">
              <Label htmlFor="notes" className="text-sm text-muted-foreground font-medium flex-shrink-0">Notes</Label>
              <div className={`relative flex-1 flex flex-col min-h-0 ${isSavingNotes ? 'tron-loading' : ''}`}>
                <Textarea
                  id="notes"
                  value={localNotes}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes..."
                  className="flex-1 resize-none overflow-auto min-h-[120px] border-none focus-visible:ring-0"
                />
                {isSavingNotes && (
                  <div className="absolute right-2 top-2 text-muted-foreground animate-pulse">
                    <Save className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <Button onClick={handleSubmit} className="w-full mt-6 flex-shrink-0" disabled={isSaving}>
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

