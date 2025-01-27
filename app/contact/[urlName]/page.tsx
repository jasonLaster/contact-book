import { getContacts } from "@/lib/actions"
import { ContactPane } from "@/components/contact-pane"
import { notFound } from "next/navigation"

export default async function ContactPage({ params }: { params: { urlName: string } }) {
  const contacts = await getContacts()
  const contact = contacts.find((c: any) => c.urlName === params.urlName)

  if (!contact) {
    notFound()
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ContactPane contact={contact} isMobile={true} />
    </div>
  )
}

