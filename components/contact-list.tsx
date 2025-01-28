"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useRouter, useSelectedLayoutSegments } from "next/navigation"
import type { Contact, PhoneNumber } from "@/lib/db/schema"
import { VariableSizeList } from "react-window"
import { ContactPane } from "./contact-pane"

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
  const selectedContactUrlName = segments[1] // ['contact', 'urlName']
  const [scrollOffset, setScrollOffset] = useState(0)

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
  const selectedContact = contacts.find((c) => c.urlName === selectedContactUrlName)

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

  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattenedItems[index]
    
    if (item.type === "header") {
      return (
        <div style={style}>
          <div className="text-2xl font-semibold bg-background z-20 py-2">
            {item.letter}
          </div>
        </div>
      )
    }

    if (!item.contact) return null

    return (
      <div
        style={style}
        className={`p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer ${
          selectedContactUrlName === item.contact.urlName ? "bg-accent" : ""
        }`}
        onClick={() => handleContactSelect(item.contact!)}
      >
        <div className="font-medium">{item.contact.name}</div>
      </div>
    )
  }

  const renderContactList = () => (
    <div className="relative flex-1">
      <div ref={containerRef} className="h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] pr-[40px] relative">
        {flattenedItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No contacts found</div>
        ) : (
          <>
            <nav
              className="absolute right-[16px] top-0 bottom-0 flex flex-col justify-center text-xs space-y-1 pl-2 pr-1 bg-background/80 backdrop-blur-sm z-30"
              style={{ transform: `translateX(-${SCROLLBAR_WIDTH}px)` }}
              aria-label="Alphabet navigation"
            >
              {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => (
                <button
                  key={letter}
                  className={`text-muted-foreground hover:text-foreground ${
                    availableLetters.includes(letter) ? "font-bold" : ""
                  }`}
                  onClick={() => {
                    const index = letterToIndex.get(letter)
                    if (index !== undefined && listRef.current) {
                      listRef.current.scrollToItem(index, "start")
                    }
                  }}
                  disabled={!availableLetters.includes(letter)}
                  aria-label={`Scroll to ${letter}`}
                >
                  {letter}
                </button>
              ))}
            </nav>
            <VariableSizeList
              ref={listRef}
              height={containerHeight || 400}
              width="100%"
              itemCount={flattenedItems.length}
              itemSize={getItemSize}
              onScroll={({ scrollOffset }) => setScrollOffset(scrollOffset)}
              estimatedItemSize={ITEM_SIZE}
            >
              {renderRow}
            </VariableSizeList>
          </>
        )}
      </div>
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

