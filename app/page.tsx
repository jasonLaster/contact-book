import { getContacts } from "@/lib/actions"
import { ContactList } from "@/components/contact-list"
import { Header } from "@/components/header"
import { SearchBar } from "@/components/search-bar"
import { ContactPane } from "@/components/contact-pane"

export default async function Page({
  searchParams,
}: {
  searchParams: { search?: string; contact?: string }
}) {
  const contacts = await getContacts(searchParams.search)
  const selectedContact = contacts.find((c: any) => c.urlName === searchParams.contact)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Header />
        <SearchBar />
        <div className="mt-6 flex gap-4">
          <div className="flex-1">
            <ContactList contacts={contacts} />
          </div>
          {selectedContact && (
            <div className="w-1/3 hidden lg:block">
              <ContactPane contact={selectedContact} isMobile={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

