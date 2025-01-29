"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useRouter, useSelectedLayoutSegments } from "next/navigation"
import type { Contact, PhoneNumber } from "@/lib/db/schema"
import { VariableSizeList } from "react-window"
import { ContactPane } from "./contact-pane"
import { SearchBar } from "./search-bar"

type ContactWithPhoneNumbers = Contact & { phoneNumbers: PhoneNumber[]; urlName: string }

type ListItem = {
  type: "header" | "contact"
  letter?: string
  contact?: ContactWithPhoneNumbers
  height: number
}

const ITEM_SIZE = 40 // Height in pixels for each item
const HEADER_SIZE = 56 // Height in pixels for section headers
const SCROLLBAR_WIDTH = 16 // Default browser scrollbar width
const ALPHABET_WIDTH = 24 // Width of the alphabet navigation

export function ContactList({ contacts }: { contacts: ContactWithPhoneNumbers[] }) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const listRef = useRef<VariableSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const segments = useSelectedLayoutSegments()
  const [selectedContactUrlName, setSelectedContactUrlName] = useState<string | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Update selected contact from URL
  useEffect(() => {
    const updateSelectedContact = () => {
      // Check URL segments first (mobile route)
      if (segments[1]) {
        setSelectedContactUrlName(segments[1])
        return
      }

      // Check query parameters (desktop route)
      const params = new URLSearchParams(window.location.search)
      const contactParam = params.get('contact')
      setSelectedContactUrlName(contactParam)
    }

    updateSelectedContact()
    
    // Listen for URL changes
    window.addEventListener('popstate', updateSelectedContact)
    return () => window.removeEventListener('popstate', updateSelectedContact)
  }, [segments])

  // Add debug logging for selection state
  useEffect(() => {
    console.log("[ContactList] URL Segments:", segments)
    console.log("[ContactList] Selected Contact URL:", selectedContactUrlName)
    console.log("[ContactList] Current URL:", window.location.href)
  }, [segments, selectedContactUrlName])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const { flattenedItems, letterToIndex, totalHeight } = useMemo(() => {
    const items: ListItem[] = []
    const letterMap = new Map<string, number>()
    const groupedContacts = new Map<string, Set<ContactWithPhoneNumbers>>()
    const seenContacts = new Set<string>()
    let height = 0

    // Group contacts by first letter
    contacts.forEach(contact => {
      if (!contact.name || seenContacts.has(contact.id)) return
      const letter = contact.name[0].toUpperCase()
      if (!/[A-Z]/.test(letter)) return

      seenContacts.add(contact.id)
      if (!groupedContacts.has(letter)) {
        groupedContacts.set(letter, new Set())
      }
      groupedContacts.get(letter)!.add(contact)
    })

    // Create flattened list with headers
    Array.from(groupedContacts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([letter, contactsSet]) => {
        letterMap.set(letter, items.length)
        items.push({ type: "header", letter, height: HEADER_SIZE })
        height += HEADER_SIZE
        
        Array.from(contactsSet)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(contact => {
            items.push({ type: "contact", contact, height: ITEM_SIZE })
            height += ITEM_SIZE
          })
      })

    return {
      flattenedItems: items,
      letterToIndex: letterMap,
      totalHeight: height
    }
  }, [contacts])

  const availableLetters = Array.from(letterToIndex.keys()).sort()
  const selectedContactFromUrl = contacts.find((c) => c.urlName === selectedContactUrlName)

  const handleContactSelect = (contact: ContactWithPhoneNumbers) => {
    if (isMobile) {
      router.push(`/contact/${contact.urlName}`)
    } else {
      router.push(`/?contact=${contact.urlName}`)
    }
  }

  const getItemSize = (index: number) => {
    return flattenedItems[index].height
  }

  const getCurrentLetter = () => {
    if (!listRef.current) return ""
    let currentPosition = 0
    let currentHeaderIndex = -1
    
    for (let i = 0; i < flattenedItems.length; i++) {
      if (currentPosition > scrollOffset) break
      if (flattenedItems[i].type === "header") {
        currentHeaderIndex = i
      }
      currentPosition += flattenedItems[i].height
    }
    
    return currentHeaderIndex >= 0 ? flattenedItems[currentHeaderIndex].letter : ""
  }

  const renderContactList = () => (
    <div className="flex flex-col h-full">
      <div className="border-b">
        <SearchBar />
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {flattenedItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No contacts found</div>
        ) : (
          <>
            <div className="pr-8 overflow-auto h-full">
              <div className="relative">
                {flattenedItems.map((item, index) => {
                  if (item.type === "header") {
                    return (
                      <div key={item.letter} className="sticky top-0 z-10">
                        <div className="text-2xl font-semibold bg-background/95 backdrop-blur-sm py-2 px-4">
                          {item.letter}
                        </div>
                      </div>
                    )
                  }

                  if (!item.contact) return null

                  return (
                    <div
                      key={item.contact.id}
                      className={`px-4 py-2 hover:bg-accent transition-colors cursor-pointer ${
                        selectedContactUrlName === item.contact.urlName ? "bg-accent" : ""
                      }`}
                      onClick={() => {
                        if (item.contact) {
                          console.log("[ContactList] Selecting contact:", item.contact.name, item.contact.urlName)
                          handleContactSelect(item.contact)
                        }
                      }}
                    >
                      <div className="font-medium">{item.contact.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <nav
              className="absolute right-0 top-0 bottom-0 flex flex-col justify-center text-xs space-y-1 pl-2 pr-1 bg-background/80 backdrop-blur-sm z-30"
              aria-label="Alphabet navigation"
            >
              {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => (
                <button
                  key={letter}
                  className={`w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground ${
                    availableLetters.includes(letter) ? "font-bold" : ""
                  }`}
                  onClick={() => {
                    const index = letterToIndex.get(letter)
                    if (index !== undefined) {
                      const element = document.querySelector(`[data-letter="${letter}"]`)
                      element?.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  disabled={!availableLetters.includes(letter)}
                  aria-label={`Scroll to ${letter}`}
                >
                  {letter}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </div>
  )

  if (isMobile && selectedContactFromUrl) {
    return null // Let the dynamic route handle mobile view
  }

  return (
    <div className="h-full overflow-hidden">
      {renderContactList()}
    </div>
  )
}

