import { Plus } from "lucide-react"
import { AddContactDialog } from "./add-contact-dialog"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn("flex items-center justify-between py-4", className)}>
      <h1 className="text-4xl font-semibold">Contact</h1>
      <AddContactDialog>
        <button className="p-2 hover:bg-accent rounded-full">
          <Plus className="w-6 h-6" />
        </button>
      </AddContactDialog>
    </header>
  )
}

