"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addContact } from "@/lib/actions"
import { formatPhoneNumber } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"

interface PhoneNumber {
  number: string
  label: string
  type: string
  isPrimary: boolean
}

export function AddContactDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    { number: "", label: "", type: "mobile", isPrimary: true },
  ])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await addContact(
        formData.get("name") as string,
        phoneNumbers,
        (formData.get("email") as string) || undefined,
        (formData.get("notes") as string) || undefined,
      )
      setLoading(false)
      setOpen(false)
      setPhoneNumbers([{ number: "", label: "", type: "mobile", isPrimary: true }])
    } catch (error) {
      console.error("Error adding contact:", error)
      setLoading(false)
      // You might want to show an error message to the user here
    }
  }

  const handlePhoneChange =
    (index: number, field: keyof PhoneNumber) => (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const newPhoneNumbers = [...phoneNumbers]
      if (field === "number" && typeof e !== "string") {
        newPhoneNumbers[index].number = formatPhoneNumber(e.target.value)
      } else if (field === "type" && typeof e === "string") {
        newPhoneNumbers[index].type = e
      } else if (typeof e !== "string") {
        newPhoneNumbers[index][field] = e.target.value as string
      }
      setPhoneNumbers(newPhoneNumbers)
    }

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { number: "", label: "", type: "mobile", isPrimary: false }])
  }

  const removePhoneNumber = (index: number) => {
    const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index)
    if (newPhoneNumbers.length > 0 && phoneNumbers[index].isPrimary) {
      newPhoneNumbers[0].isPrimary = true
    }
    setPhoneNumbers(newPhoneNumbers)
  }

  const togglePrimary = (index: number) => {
    const newPhoneNumbers = phoneNumbers.map((phone, i) => ({
      ...phone,
      isPrimary: i === index,
    }))
    setPhoneNumbers(newPhoneNumbers)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label>Phone Numbers</Label>
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={phone.number}
                  onChange={(e) => handlePhoneChange(index, "number")(e)}
                  placeholder="Phone number"
                  required
                />
                <Input value={phone.label} onChange={(e) => handlePhoneChange(index, "label")(e)} placeholder="Label" />
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
                <Button type="button" variant="ghost" size="icon" onClick={() => togglePrimary(index)}>
                  {phone.isPrimary ? "✓" : "○"}
                </Button>
                {phoneNumbers.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePhoneNumber(index)}>
                    <Minus className="h-4 w-4" />
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

