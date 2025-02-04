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
  const [contacts, groups] = await Promise.all([
    getContacts(searchParams?.search, searchParams?.group),
    getGroups()
  ])
  
  const selectedContact = contacts.find((c) => c.urlName === searchParams?.contact)

  return <AppShell contacts={contacts} groups={groups} selectedContact={selectedContact} />
}

