"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { addGroup } from "@/lib/actions"
import { useToast } from "./ui/use-toast"
import { Smile } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import EmojiPicker, { Theme } from "emoji-picker-react"

interface AddGroupDialogProps {
  children?: React.ReactNode
}

export function AddGroupDialog({ children }: AddGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await addGroup(selectedEmoji ? `${selectedEmoji} ${name}` : name)
      toast({
        title: "Group created",
        description: "The group has been created successfully."
      })
      setIsOpen(false)
      setName("")
      setSelectedEmoji("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmojiSelect = (emojiData: any) => {
    setSelectedEmoji(emojiData.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle>Add Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                {selectedEmoji || <Smile className="h-4 w-4" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none" side="bottom" align="start">
              <EmojiPicker 
                onEmojiClick={handleEmojiSelect}
                theme={Theme.AUTO}
                searchPlaceholder="Search emoji..."
                width="100%"
                height="350px"
              />
            </PopoverContent>
          </Popover>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Group name"
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 