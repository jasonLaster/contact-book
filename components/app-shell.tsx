"use client"

import { GroupsSidebar } from "@/components/groups-sidebar"
import { SearchBar } from "@/components/search-bar"
import { ContactList } from "@/components/contact-list"
import { ContactPane } from "@/components/contact-pane"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Plus, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarProvider } from "@/lib/contexts/sidebar-context"
import type { Contact, Group } from "@/lib/db/schema"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AppShellProps {
  contacts: (Contact & { phoneNumbers: any[]; urlName: string })[]
  groups: (Group & { contactCount: number })[]
  selectedContact: (Contact & { phoneNumbers: any[]; urlName: string }) | undefined
}

export function AppShell({ contacts, groups, selectedContact }: AppShellProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <SidebarProvider>
      <div className={`h-screen bg-background ${isMobile ? 'flex flex-col' : 'grid grid-cols-[auto_1fr_500px]'}`}>
        {/* Mobile Bottom Sheet Sidebar */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <GroupsSidebar groups={groups} className="h-full border-none" />
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="flex flex-col">
            <GroupsSidebar groups={groups} />
          </div>
        )}

        {/* Contact List */}
        <div className={`grid grid-rows-[auto_1fr] ${!isMobile && 'border-r'} overflow-hidden`}>
          <div className="h-14 border-b px-4">
            <SearchBar />
          </div>
          <ContactList contacts={contacts} hideSearchBar />
        </div>

        {/* Contact Details Pane - Hidden on mobile as it's handled by the hub/spoke route */}
        {!isMobile && (
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
        )}
      </div>
    </SidebarProvider>
  )
} 