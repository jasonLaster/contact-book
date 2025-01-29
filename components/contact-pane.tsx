"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Contact, PhoneNumber, Group } from "@/lib/db/schema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, ArrowLeft, UserCircle2, Pencil, X, Upload, Loader2, Plus, GripVertical, Save, Users } from "lucide-react"
import { deleteContact, updateContact, addContactToGroup, removeContactFromGroup } from "@/lib/actions"
import { formatPhoneNumber } from "@/lib/utils"
import "@/styles/animations.css"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EditContactForm } from "./edit-contact-form"
import { DeleteContactDialog } from "./delete-contact-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGroups } from "@/hooks/use-groups"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ContactPaneProps {
  contact: (Contact & { phoneNumbers: PhoneNumber[]; urlName: string }) | null
  onClose?: () => void
  isMobile: boolean
  isLoading?: boolean
}

interface FormPhoneNumber {
  id?: string
  number: string
  label: string
  isPrimary: boolean
}

interface FormData {
  id?: string
  name: string
  email: string | undefined
  notes: string | undefined
  phoneNumbers: FormPhoneNumber[]
  imageUrl: string | undefined
  urlName: string
}

interface ContactUpdateData {
  name: string
  phoneNumbers: {
    id?: string
    number: string
    label: string
    isPrimary: boolean
  }[]
  email?: string | null
  notes?: string | null
  imageUrl?: string | null
}

interface GroupWithContacts extends Group {
  contacts?: { contactId: string }[]
  contactCount: number
}

const convertPhoneNumber = (p: PhoneNumber): FormPhoneNumber => ({
  id: p.id,
  number: p.number,
  label: p.label,
  isPrimary: p.isPrimary || false
})

const convertDbContactToFormData = (contact: Contact & { phoneNumbers: PhoneNumber[]; urlName: string }): FormData => {
  const { id, name, email, notes, imageUrl, phoneNumbers, urlName } = contact
  return {
    id,
    name,
    email: email ?? undefined,
    notes: notes ?? undefined,
    phoneNumbers: phoneNumbers.map(convertPhoneNumber),
    imageUrl: imageUrl ?? undefined,
    urlName
  }
}

const createEmptyFormData = (): FormData => ({
  name: "",
  email: undefined,
  notes: undefined,
  phoneNumbers: [{ number: "", label: "", isPrimary: false }],
  imageUrl: undefined,
  urlName: ""
})

const convertFormDataToUpdate = (data: FormData): ContactUpdateData => {
  const { name, phoneNumbers, email, notes, imageUrl } = data
  return {
    name,
    phoneNumbers: phoneNumbers.map(p => ({
      id: p.id,
      number: p.number,
      label: p.label,
      isPrimary: p.isPrimary
    })),
    email,
    notes,
    imageUrl
  }
}

const convertDbContactToUpdateData = (contact: Contact & { phoneNumbers: PhoneNumber[]; urlName: string }): ContactUpdateData => {
  const { name, phoneNumbers, email, notes, imageUrl } = contact
  return {
    name,
    phoneNumbers: phoneNumbers.map(p => ({
      id: p.id,
      number: p.number,
      label: p.label,
      isPrimary: p.isPrimary || false
    })),
    email: email ?? undefined,
    notes: notes ?? undefined,
    imageUrl: imageUrl ?? undefined
  }
}

const convertToUpdateData = (data: FormData | (Contact & { phoneNumbers: PhoneNumber[]; urlName: string })): ContactUpdateData => {
  if ('urlName' in data && 'createdAt' in data) {
    return convertDbContactToUpdateData(data as Contact & { phoneNumbers: PhoneNumber[]; urlName: string })
  }
  return convertFormDataToUpdate(data as FormData)
}

export function ContactPane({ contact, onClose, isMobile, isLoading }: ContactPaneProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState("")
  const [formData, setFormData] = useState<FormData>(createEmptyFormData())
  const [isSaving, setIsSaving] = useState(false)
  const [showQuotaError, setShowQuotaError] = useState(false)
  const { toast } = useToast()
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousContactRef = useRef<typeof contact>(null)
  const { groups, refreshGroups } = useGroups()

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
        const searchParams = new URLSearchParams(window.location.search)
        const currentSearch = searchParams.get('search')
        router.push(currentSearch ? `/?search=${currentSearch}` : '/')
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const formDataToSubmit = {
        name: formData.name,
        phoneNumbers: formData.phoneNumbers.map(p => ({
          id: p.id,
          number: p.number,
          label: p.label,
          isPrimary: p.isPrimary
        })),
        email: formData.email,
        notes: formData.notes,
        imageUrl: formData.imageUrl
      }

      await updateContact(formData.id!, formDataToSubmit)
      setIsEditing(false)
      toast({ title: "Contact updated" })
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "Error updating contact",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const form = e.currentTarget.closest('form')
    if (form) {
      const event = new Event('submit', { bubbles: true, cancelable: true })
      form.dispatchEvent(event)
    }
  }

  const handlePhoneChange =
    (index: number, field: "number" | "label" | "isPrimary") =>
    (e: React.ChangeEvent<HTMLInputElement> | string | boolean) => {
      const newPhoneNumbers = [...formData.phoneNumbers]
      if (field === "number" && !isPrimitive(e) && "target" in e) {
        newPhoneNumbers[index].number = formatPhoneNumber(e.target.value)
      } else if (field === "isPrimary" && typeof e === "boolean") {
        newPhoneNumbers[index].isPrimary = e
      } else if (field === "label" && !isPrimitive(e) && "target" in e) {
        newPhoneNumbers[index].label = e.target.value
      }
      setFormData((prev) => ({
        ...prev,
        phoneNumbers: newPhoneNumbers,
      }))
    }

  // Helper function to check if a value is primitive
  function isPrimitive(value: any): value is string | number | boolean | null | undefined {
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined
    )
  }

  const handleAddPhone = () => {
    if (formData.phoneNumbers.every((phone) => phone.number.trim() !== "")) {
      setFormData((prev) => ({
        ...prev,
        phoneNumbers: [...prev.phoneNumbers, { number: "", label: "", isPrimary: false }],
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
          email: formData.email,
          notes: formData.notes,
          imageUrl: formData.imageUrl
        }
        const updatedContact = await updateContact(contact.id, updateData, file)
        if (updatedContact) {
          setFormData(convertDbContactToFormData({
            ...updatedContact,
            urlName: updatedContact.name.toLowerCase().replace(/\s+/g, "-")
          }))
        }
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
    const newValue = e.target.value;
    setFormData(prev => ({ ...prev, notes: newValue || undefined }));
    
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    
    notesTimeoutRef.current = setTimeout(() => {
      handleSaveNotes(newValue);
    }, 1000);
  }

  const handleSaveNotes = async (notes: string) => {
    if (!contact) return;

    console.log('Starting save, setting isSavingNotes to true');
    setIsSavingNotes(true);
    try {
      const updateData = convertToUpdateData({
        ...formData,
        notes: notes.trim() === "" ? undefined : notes
      });
      await updateContact(contact.id, updateData);
      setFormData(prev => ({ ...prev, notes: notes.trim() === "" ? undefined : notes }));
      console.log('Save completed, will clear isSavingNotes in 1 second');
      setTimeout(() => {
        console.log('Clearing isSavingNotes');
        setIsSavingNotes(false);
      }, 1000);
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({
        title: "Error saving notes",
        description: "Your changes couldn't be saved. Please try again.",
        variant: "destructive",
      });
      setIsSavingNotes(false);
    }
  }

  const handleGroupChange = async (groupId: string, checked: boolean) => {
    if (!contact) return
    
    try {
      if (checked) {
        await addContactToGroup(contact.id, groupId)
      } else {
        await removeContactFromGroup(contact.id, groupId)
      }
      refreshGroups()
    } catch (error) {
      console.error("Error updating contact groups:", error)
      toast({
        title: "Error",
        description: "Failed to update contact groups. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim() === "" ? undefined : e.target.value
    setFormData(prev => ({ ...prev, email: value }))
  }

  if (isLoading) {
    return (
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : ""}`}>
        <div className="h-[56px] px-4 flex items-center justify-between">
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
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : ""}`}>
        <div className="h-[56px] px-4 flex items-center justify-between">
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
      <div className={`bg-background flex flex-col flex-1 ${isMobile ? "fixed inset-0 z-50" : ""} transition-opacity duration-200 ${isLoading ? "opacity-50" : "opacity-100"}`}>
        <div className="h-[56px] px-4 flex items-center justify-between">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Users className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1.5 px-1">
                    {groups?.map((group: GroupWithContacts) => {
                      const isInGroup = group.contacts?.some((c: { contactId: string }) => c.contactId === contact?.id);
                      return (
                        <div 
                          key={group.id} 
                          className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
                            isInGroup ? 'bg-accent/50' : 'hover:bg-accent/30'
                          }`}
                        >
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={isInGroup}
                            onCheckedChange={(checked) => handleGroupChange(group.id, checked as boolean)}
                            className="data-[state=checked]:bg-accent-foreground/20 data-[state=checked]:text-accent-foreground"
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className="flex-1 text-sm font-medium cursor-pointer"
                          >
                            {group.name}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {group.contactCount} {group.contactCount === 1 ? 'contact' : 'contacts'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
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
                      <Select value={phone.isPrimary ? "primary" : "secondary"} onValueChange={(value) => handlePhoneChange(index, "isPrimary")(value === "primary")}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="w-[120px] text-sm text-muted-foreground">{phone.isPrimary ? "Primary" : "Secondary"}</span>
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
                  onChange={handleEmailChange}
                />
              ) : (
                <p className="text-muted-foreground/80 text-sm">{formData.email || "Not provided"}</p>
              )}
            </div>

            <div className="space-y-3 flex flex-col flex-1 min-h-0 overflow-hidden">
              <Label htmlFor="notes" className="text-sm text-muted-foreground font-medium flex-shrink-0">Notes</Label>
              <div className="relative flex-1 flex flex-col min-h-0">
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={handleNotesChange}
                  onBlur={() => {
                    console.log('Blur event triggered');
                    if (notesTimeoutRef.current) {
                      clearTimeout(notesTimeoutRef.current);
                    }
                    setIsSavingNotes(true);
                    console.log('Set isSavingNotes to true on blur');
                    handleSaveNotes(formData.notes || "");
                  }}
                  placeholder="Add notes..."
                  className={`flex-1 resize-none overflow-auto min-h-[120px] p-3 bg-background border-0 focus-visible:ring-0 ${
                    isSavingNotes ? 'saving-notes' : ''
                  }`}
                />
              </div>
            </div>
          </div>
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

