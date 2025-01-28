import { getContacts } from "@/lib/actions"
import { ContactList } from "@/components/contact-list"
import { Header } from "@/components/header"
import { ContactPane } from "@/components/contact-pane"

export default async function Page({
  searchParams,
}: {
  searchParams: { search?: string; contact?: string }
}) {
  const contacts = await getContacts(searchParams.search)
  const selectedContact = contacts.find((c: any) => c.urlName === searchParams.contact)

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="container mx-auto p-4 flex flex-col flex-1 min-h-0">
        <Header className="flex-shrink-0" />
        <div className="flex flex-1 gap-4 mt-6 min-h-0">
          <div className="flex-1 min-h-0">
            <ContactList contacts={contacts} />
          </div>
          <div className="w-1/3 hidden lg:block min-h-0">
            <ContactPane contact={selectedContact || null} isMobile={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

