import { getContacts } from "@/lib/actions"
import { notFound } from "next/navigation"
import { ContactPageContent } from "@/components/contact-page"

export default async function Page({
  params,
  searchParams,
}: {
  params: { urlName: string }
  searchParams: { search?: string, group?: string, contact?: string }
}) {
  try {
    const contacts = await getContacts()
    const urlName = String(params.urlName)
    
    console.log('Debug - URL Name:', urlName)
    console.log('Debug - Contacts:', contacts.map(c => ({ urlName: c.urlName, name: c.name })))
    
    const contact = contacts.find((c: any) => {
      console.log('Debug - Comparing:', { 
        contactUrlName: c.urlName, 
        searchUrlName: urlName,
        match: c.urlName === urlName 
      })
      return c.urlName === urlName
    })

    if (!contact) {
      console.log('Debug - No contact found for urlName:', urlName)
      notFound()
    }

    // Build query string manually for allowed parameters
    const searchParamsObj = new URLSearchParams()
    if (searchParams.search) searchParamsObj.set('search', searchParams.search)
    if (searchParams.group) searchParamsObj.set('group', searchParams.group)
    if (searchParams.contact) searchParamsObj.set('contact', searchParams.contact)

    const queryString = searchParamsObj.toString()
    const backHref = queryString ? `/?${queryString}` : '/'

    console.log('Debug - Found contact:', { name: contact.name, urlName: contact.urlName })
    return <ContactPageContent contact={contact} backHref={backHref} />
  } catch (error) {
    console.error('Error in contact page:', error)
    notFound()
  }
}

// Mark as a React component
Page.displayName = 'ContactPage'

