import { getContacts, getGroups } from "@/lib/actions"
import { ContactList } from "@/components/contact-list"
import { ContactPane } from "@/components/contact-pane"
import { GroupsSidebar } from "@/components/groups-sidebar"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"

interface PageProps {
  searchParams: {
    search?: string
    group?: string
    contact?: string
  }
}

export default async function Page({
  searchParams,
}: PageProps) {
  const [contacts, groups] = await Promise.all([
    getContacts(searchParams?.search, searchParams?.group),
    getGroups()
  ])
  
  const selectedContact = contacts.find((c) => c.urlName === searchParams?.contact)

  return (
    <div className="h-screen grid grid-cols-[auto_1fr_500px] bg-background">
      <div className="hidden lg:flex flex-col">
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
  )
}

