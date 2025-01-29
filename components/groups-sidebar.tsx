"use client"

import { Plus, Star, Users, Pencil, Smile, PanelLeftClose, PanelLeft, BookOpen } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Group } from "@/lib/db/schema"
import { AddGroupDialog } from "./add-group-dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { updateGroup } from "@/lib/actions"
import { useToast } from "./ui/use-toast"
import EmojiPicker, { Theme } from "emoji-picker-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { useSidebar } from "@/lib/contexts/sidebar-context"

interface GroupsSidebarProps {
  groups: (Group & { contactCount: number })[]
  className?: string
}

export function GroupsSidebar({ groups, className }: GroupsSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editedName, setEditedName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState("")
  const favorites = groups.filter(g => g.type === 'system' && g.name === 'Favorites')
  const customGroups = groups.filter(g => g.type === 'custom')
  const selectedGroupId = searchParams.get('group')
  const { toast } = useToast()

  const handleGroupSelect = (groupId: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (groupId === null) {
      params.delete('group')
    } else {
      params.set('group', groupId)
    }
    router.push(`/?${params.toString()}`)
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group.id)
    const match = group.name.match(/^(\p{Extended_Pictographic})?(.*)$/u)
    if (match) {
      setSelectedEmoji(match[1] || "")
      setEditedName(match[2].trim())
    } else {
      setSelectedEmoji("")
      setEditedName(group.name)
    }
    setShowEmojiPicker(false)
    setIsEditDialogOpen(true)
  }

  const handleSaveGroup = async () => {
    if (!editingGroup) return
    setIsSubmitting(true)
    try {
      const newName = selectedEmoji ? `${selectedEmoji} ${editedName}` : editedName
      await updateGroup(editingGroup, newName)
      setEditingGroup(null)
      setShowEmojiPicker(false)
      setIsEditDialogOpen(false)
      setSelectedEmoji("")
      toast({
        title: "Group updated",
        description: "The group name has been updated successfully."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
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
    <div className={cn(
      "flex flex-col transition-all duration-300",
      isCollapsed ? "w-0 overflow-hidden" : "w-60",
      className
    )}>
      <div className="h-14 px-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Contacts</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent"
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {/* All Contacts */}
          <button
            onClick={() => handleGroupSelect(null)}
            className={cn(
              "w-full flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-accent",
              !selectedGroupId && "bg-accent"
            )}
          >
            <div className="w-4 flex items-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <span>All Contacts</span>
          </button>

          {/* Favorites */}
          {favorites.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupSelect(group.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent group",
                selectedGroupId === group.id && "bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 flex items-center">
                  <Star className="w-4 h-4 text-muted-foreground" />
                </div>
                <span>{group.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{group.contactCount}</span>
            </button>
          ))}

          {/* Custom Groups */}
          {customGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupSelect(group.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent group",
                selectedGroupId === group.id && "bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 flex items-center">
                  {group.name.match(/^(\p{Extended_Pictographic})/u)?.[1] || <div className="w-4" />}
                </div>
                <span className="truncate">{group.name.replace(/^\p{Extended_Pictographic}/u, '').trim()}</span>
              </div>
              <div className="flex items-center gap-1 relative">
                <span className="text-xs text-muted-foreground">{group.contactCount}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditGroup(group)
                  }}
                  className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-background bg-popover rounded-sm z-10 shadow-sm"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <AddGroupDialog>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        </AddGroupDialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveGroup(); }} className="flex gap-2">
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
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              placeholder="Group name"
              required
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
