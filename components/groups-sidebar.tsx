"use client"

import { Plus, Star, Users, Pencil, Smile, PanelLeftClose, PanelLeft, BookOpen, Trash2, GripVertical } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Group } from "@/lib/db/schema"
import { AddGroupDialog } from "./add-group-dialog"
import { useRouter, useSearchParams } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { updateGroup, deleteGroup, reorderGroups } from "@/lib/actions"
import { useToast } from "./ui/use-toast"
import EmojiPicker, { Theme } from "emoji-picker-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface GroupsSidebarProps {
  groups: (Group & { contactCount: number })[]
  className?: string
}

interface SortableGroupItemProps {
  group: Group & { contactCount: number }
  selectedGroupId: string | null
  onEdit: (group: Group) => void
}

function SortableGroupItem({ group, selectedGroupId, onEdit }: SortableGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  }

  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const params = new URLSearchParams(searchParams)
    params.set('group', group.id)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent group",
        "transition-colors duration-200",
        selectedGroupId === group.id && "bg-accent",
        isDragging && "opacity-50 bg-accent/50 cursor-move"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <div className="w-4 flex items-center">
          {group.name.match(/^(\p{Extended_Pictographic})/u)?.[1] || <div className="w-4" />}
        </div>
        <span className="truncate">{group.name.replace(/^\p{Extended_Pictographic}/u, '').trim()}</span>
      </div>
      <div className="flex items-center gap-1 relative">
        <span className="text-xs text-muted-foreground">{group.contactCount}</span>
        <div
          onClick={(e) => {
            e.stopPropagation()
            onEdit(group)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onEdit(group)
            }
          }}
          className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-background bg-popover rounded-sm z-10 shadow-sm cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
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
  const [optimisticGroups, setOptimisticGroups] = useState(groups)
  const [mounted, setMounted] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<(Group & { contactCount: number })[]>([])
  const customGroups = optimisticGroups.filter(g => g.type === 'custom')
  const { toast } = useToast()

  // Mount check for client-side only features
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update optimistic groups when props change
  useEffect(() => {
    setOptimisticGroups(groups)
  }, [groups])

  useEffect(() => {
    setFavorites(groups.filter(g => g.type === 'system' && g.name === 'Favorites'))
  }, [groups])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    // Get the indices for reordering
    const oldIndex = customGroups.findIndex(g => g.id === active.id)
    const newIndex = customGroups.findIndex(g => g.id === over.id)

    // Update the optimistic state immediately
    const newGroups = [...optimisticGroups]
    const customGroupsSection = newGroups.filter(g => g.type === 'custom')
    const reorderedCustomGroups = arrayMove(customGroupsSection, oldIndex, newIndex)
    const updatedGroups = [
      ...newGroups.filter(g => g.type !== 'custom'),
      ...reorderedCustomGroups
    ]
    setOptimisticGroups(updatedGroups)

    try {
      const result = await reorderGroups(active.id.toString(), over.id.toString())
      if (!result?.success) {
        // If the server update fails, revert to the original order
        setOptimisticGroups(groups)
        toast({
          title: "Error",
          description: "Failed to reorder groups. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      // On error, revert to the original order
      setOptimisticGroups(groups)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder groups. Please try again.",
        variant: "destructive"
      })
    }
  }

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

  const handleDeleteGroup = async () => {
    if (!editingGroup) return
    setIsSubmitting(true)
    try {
      await deleteGroup(editingGroup)
      setEditingGroup(null)
      setShowEmojiPicker(false)
      setIsEditDialogOpen(false)
      setSelectedEmoji("")
      toast({
        title: "Group deleted",
        description: "The group has been deleted successfully."
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
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
      "flex flex-col h-full transition-all duration-300",
      className
    )}>
      <div className="h-14 flex items-center gap-2 px-4 border-b">
        <BookOpen className="h-5 w-5" />
        <h2 className="font-semibold">Groups</h2>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            <div
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer",
                !selectedGroupId && "bg-accent"
              )}
              onClick={() => handleGroupSelect(null)}
            >
              <Users className="h-4 w-4" />
              <span>All Contacts</span>
            </div>
            {favorites.map(group => (
              <div
                key={group.id}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer",
                  selectedGroupId === group.id && "bg-accent"
                )}
                onClick={() => handleGroupSelect(group.id)}
              >
                <Star className="h-4 w-4" />
                <span>{group.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{group.contactCount}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 
