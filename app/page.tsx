import { getContacts, getGroups } from "@/lib/actions"
import { AppShell } from "@/components/app-shell"

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
  console.log('Debug - Page component searchParams:', searchParams)
  
  const [contacts, groups] = await Promise.all([
    getContacts(searchParams.search, searchParams.group),
    getGroups(),
  ])
  
  console.log('Debug - Fetched contacts count:', contacts.length)
  console.log('Debug - Fetched groups count:', groups.length)

  const selectedContact = searchParams.contact
    ? contacts.find((c) => c.urlName === searchParams.contact)
    : undefined

  return (
    <AppShell
      contacts={contacts}
      groups={groups}
      selectedContact={selectedContact}
    />
  )
}

