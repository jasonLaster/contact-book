import { Plus } from "lucide-react"
import { AddContactDialog } from "./add-contact-dialog"

export function Header() {
  return (
    <header className="flex items-center justify-between py-4">
      <h1 className="text-4xl font-semibold">Contact</h1>
      <AddContactDialog>
        <button className="p-2 hover:bg-accent rounded-full">
          <Plus className="w-6 h-6" />
        </button>
      </AddContactDialog>
    </header>
  )
}

