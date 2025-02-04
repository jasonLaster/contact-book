'use client'

import { ContactPane } from "@/components/contact-pane"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Contact, PhoneNumber } from "@/lib/db/schema"

interface ContactPageProps {
  contact: (Contact & { phoneNumbers: PhoneNumber[]; urlName: string }) | null
  backHref: string
}

export function ContactPageContent({ contact, backHref }: ContactPageProps) {
  return (
    <div className="flex flex-1 bg-background">
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center px-4 bg-background border-b z-50">
        <Link href={backHref}>
          <Button variant="ghost" size="icon" data-testid="back-button">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
      </div>
      <div className="flex-1 pt-14">
        <ContactPane contact={contact} isMobile={true} />
      </div>
    </div>
  )
} 