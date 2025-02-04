"use client"

import { GroupsSidebar } from "@/components/groups-sidebar"
import { SearchBar } from "@/components/search-bar"
import { ContactList } from "@/components/contact-list"
import { ContactPane } from "@/components/contact-pane"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarProvider } from "@/lib/contexts/sidebar-context"
import type { Contact, Group } from "@/lib/db/schema"

interface AppShellProps {
  contacts: (Contact & { phoneNumbers: any[]; urlName: string })[]
  groups: (Group & { contactCount: number })[]
  selectedContact: (Contact & { phoneNumbers: any[]; urlName: string }) | undefined
}

export function AppShell({ contacts, groups, selectedContact }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="h-screen grid grid-cols-[auto_1fr_500px] bg-background">
        <div className="flex flex-col">
          <GroupsSidebar groups={groups} />
        </div>
        <div className="grid grid-rows-[auto_1fr] border-r overflow-hidden">
          <div className="h-14 border-b px-4">
            <SearchBar />
          </div>
          <ContactList contacts={contacts} hideSearchBar />
        </div>
        <div className="hidden lg:grid grid-rows-[auto_1fr]">
          <div className="h-14 flex items-center justify-end px-4 border-b">
            <AddContactDialog>
              <Button size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </AddContactDialog>
          </div>
          {selectedContact && (
            <ContactPane contact={selectedContact} isMobile={false} />
          )}
        </div>
      </div>
    </SidebarProvider>
  )
} 