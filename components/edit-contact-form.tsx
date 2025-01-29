"use client"

import { Contact, PhoneNumber } from "@/lib/db/schema"
import { updateContact } from "@/lib/actions"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface EditContactFormProps {
  contact: Contact & { phoneNumbers: PhoneNumber[]; urlName: string }
}

interface FormPhoneNumber {
  id?: string
  number: string
  label: string
  isPrimary: boolean
}

interface FormData {
  name: string
  email: string
  notes: string
  phoneNumbers: FormPhoneNumber[]
}

export function EditContactForm({ contact }: EditContactFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: contact.name,
    email: contact.email || "",
    notes: contact.notes || "",
    phoneNumbers: contact.phoneNumbers.map(p => ({
      id: p.id,
      number: p.number,
      label: p.label,
      isPrimary: p.isPrimary || false
    }))
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await updateContact(contact.id, formData)
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully."
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { number: "", label: "mobile", isPrimary: false }]
    }))
  }

  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }))
  }

  const updatePhoneNumber = (index: number, field: keyof FormPhoneNumber, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) => 
        i === index ? { ...phone, [field]: value } : phone
      )
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Phone Numbers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPhoneNumber}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {formData.phoneNumbers.map((phone, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Number"
                  value={phone.number}
                  onChange={e => updatePhoneNumber(index, 'number', e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Label"
                  value={phone.label}
                  onChange={e => updatePhoneNumber(index, 'label', e.target.value)}
                  required
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePhoneNumber(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
} 
