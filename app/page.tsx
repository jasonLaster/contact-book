import { getContacts, getGroups } from "@/lib/actions"
import { ContactList } from "@/components/contact-list"
import { ContactPane } from "@/components/contact-pane"
import { GroupsSidebar } from "@/components/groups-sidebar"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Plus } from "lucide-react"

export default async function Page({
  searchParams,
}: {
  searchParams: { search?: string; contact?: string; group?: string }
}) {
  const [contacts, groups] = await Promise.all([
    getContacts(searchParams.search, searchParams.group),
    getGroups()
  ])
  const selectedContact = contacts.find((c: any) => c.urlName === searchParams.contact)

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <GroupsSidebar 
          groups={groups} 
          className="hidden lg:flex border-r"
        />
        <div className="flex-1 min-h-0">
          <ContactList contacts={contacts} />
        </div>
        <div className="w-[400px] hidden lg:flex flex-col min-h-0 border-l">
          <div className="h-[56px] px-4 flex items-center justify-end border-b">
            <AddContactDialog>
              <button className="p-1.5 hover:bg-accent rounded-full">
                <Plus className="w-5 h-5" />
              </button>
            </AddContactDialog>
          </div>
          <div className="flex-1 min-h-0">
            <ContactPane contact={selectedContact || null} isMobile={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

