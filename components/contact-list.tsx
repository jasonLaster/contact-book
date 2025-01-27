"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useParams, useSelectedLayoutSegments } from "next/navigation"
import type { Contact, PhoneNumber } from "@/lib/db/schema"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContactPane } from "./contact-pane"

type ContactWithPhoneNumbers = Contact & { phoneNumbers: PhoneNumber[]; urlName: string }

export function ContactList({ contacts }: { contacts: ContactWithPhoneNumbers[] }) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const segments = useSelectedLayoutSegments()
  const selectedContactUrlName = segments[1] // ['contact', 'urlName']

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const groupedContacts = useMemo(() => {
    const deduped = contacts.reduce(
      (acc, contact) => {
        if (contact.name && contact.name.length > 0) {
          const firstChar = contact.name[0].toUpperCase()
          if (!/^\d+$/.test(firstChar)) {
            if (!acc[contact.name]) {
              acc[contact.name] = contact
            }
          }
        }
        return acc
      },
      {} as Record<string, ContactWithPhoneNumbers>,
    )

    return Object.values(deduped).reduce(
      (acc, contact) => {
        const firstChar = contact.name[0].toUpperCase()
        if (!acc[firstChar]) {
          acc[firstChar] = []
        }
        acc[firstChar].push(contact)
        return acc
      },
      {} as Record<string, ContactWithPhoneNumbers[]>,
    )
  }, [contacts])

  const availableLetters = Object.keys(groupedContacts).sort()
  const selectedContact = contacts.find((c) => c.urlName === selectedContactUrlName)

  const handleContactSelect = (contact: ContactWithPhoneNumbers) => {
    if (isMobile) {
      router.push(`/contact/${contact.urlName}`)
    } else {
      router.push(`/?contact=${contact.urlName}`)
    }
  }

  const renderContactList = () => (
    <div className="relative flex-1">
      <ScrollArea className="h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] pr-8">
        {Object.keys(groupedContacts).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No contacts found</div>
        ) : (
          availableLetters.map((letter) => (
            <div key={letter} id={letter} className="mb-6">
              <h2 className="text-2xl font-semibold mb-4 sticky top-0 bg-background z-20 py-2">{letter}</h2>
              <div className="space-y-2">
                {groupedContacts[letter].map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer ${
                      selectedContactUrlName === contact.urlName ? "bg-accent" : ""
                    }`}
                    onClick={() => handleContactSelect(contact)}
                  >
                    <div className="font-medium">{contact.name}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </ScrollArea>
      <nav
        className="absolute right-0 top-0 bottom-0 flex flex-col justify-center text-xs space-y-1 pl-2 pr-1 bg-background/80 backdrop-blur-sm z-30"
        aria-label="Alphabet navigation"
      >
        {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => (
          <button
            key={letter}
            className={`text-muted-foreground hover:text-foreground ${
              availableLetters.includes(letter) ? "font-bold" : ""
            }`}
            onClick={() => {
              const element = document.getElementById(letter)
              if (element) element.scrollIntoView({ behavior: "smooth" })
            }}
            disabled={!availableLetters.includes(letter)}
            aria-label={`Scroll to ${letter}`}
          >
            {letter}
          </button>
        ))}
      </nav>
    </div>
  )

  if (isMobile && selectedContact) {
    return null // Let the dynamic route handle mobile view
  }

  return (
    <div className="flex flex-row gap-4">
      {renderContactList()}
      {!isMobile && selectedContact && (
        <div className="w-1/3">
          <ContactPane contact={selectedContact} onClose={() => router.push("/")} isMobile={false} />
        </div>
      )}
    </div>
  )
}

