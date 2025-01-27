"use server"

import { revalidatePath } from "next/cache"
import { db } from "./db"
import { contacts, phoneNumbers } from "./db/schema"
import { eq, or, ilike } from "drizzle-orm"
import { nanoid } from "nanoid"
import { put } from "@vercel/blob"

export async function getContacts(search?: string) {
  try {
    const allContacts = await db
      .select({
        ...contacts,
        phoneNumbers: phoneNumbers,
      })
      .from(contacts)
      .leftJoin(phoneNumbers, eq(contacts.id, phoneNumbers.contactId))

    const groupedContacts = allContacts.reduce(
      (acc, row) => {
        if (!acc[row.id]) {
          acc[row.id] = { ...row, phoneNumbers: [] }
        }
        if (row.phoneNumbers) {
          acc[row.id].phoneNumbers.push(row.phoneNumbers)
        }
        return acc
      },
      {} as Record<string, any>,
    )

    const contactsArray = Object.values(groupedContacts)

    // Generate URL-friendly names and handle duplicates
    const urlNames = new Map<string, number>()
    contactsArray.forEach((contact: any) => {
      let urlName = contact.name.toLowerCase().replace(/\s+/g, "-")
      const count = urlNames.get(urlName) || 0
      if (count > 0) {
        urlName = `${urlName}-${count}`
      }
      urlNames.set(urlName, count + 1)
      contact.urlName = urlName
    })

    console.log("Fetched contacts:", contactsArray)

    if (search) {
      return contactsArray.filter(
        (contact: any) =>
          contact.name.toLowerCase().includes(search.toLowerCase()) ||
          contact.phoneNumbers.some((phone: any) => phone.number.includes(search)) ||
          (contact.email && contact.email.toLowerCase().includes(search.toLowerCase())),
      )
    }

    return contactsArray
  } catch (error) {
    console.error("Error fetching contacts:", error)
    throw new Error("Failed to fetch contacts")
  }
}

export async function addContact(
  name: string,
  phoneNumbers: { number: string; label?: string; type: string; isPrimary?: boolean }[],
  email?: string,
  notes?: string,
) {
  const contactId = nanoid()
  await db.insert(contacts).values({
    id: contactId,
    name,
    email,
    notes,
  })

  if (phoneNumbers && phoneNumbers.length > 0) {
    await db.insert(phoneNumbers).values(
      phoneNumbers.map((phone) => ({
        contactId,
        number: phone.number,
        label: phone.label,
        type: phone.type || "mobile",
        isPrimary: phone.isPrimary || false,
      })),
    )
  }

  revalidatePath("/")
}

export async function updateContact(
  id: string,
  data: {
    name: string
    phoneNumbers: { id?: number; number: string; label?: string; type: string; isPrimary?: boolean }[]
    email?: string
    notes?: string
    imageUrl?: string
  },
  imageFile?: File,
) {
  let imageUrl = data.imageUrl

  if (imageFile) {
    try {
      const blob = await put(`avatars/${id}/${imageFile.name}`, imageFile, {
        access: "public",
      })
      // Store only the direct URL, not the UI wrapper URL
      imageUrl = blob.url
    } catch (error) {
      console.error("Error uploading to Vercel Blob:", error)
      throw new Error("Failed to upload image")
    }
  }

  try {
    await db
      .update(contacts)
      .set({
        name: data.name,
        email: data.email,
        notes: data.notes,
        imageUrl: imageUrl,
      })
      .where(eq(contacts.id, id))

    // Update phone numbers
    const existingPhoneNumbers = await db.select().from(phoneNumbers).where(eq(phoneNumbers.contactId, id))
    const existingIds = new Set(existingPhoneNumbers.map((p) => p.id))

    for (const phone of data.phoneNumbers) {
      if (phone.id && existingIds.has(phone.id)) {
        // Update existing phone number
        await db
          .update(phoneNumbers)
          .set({ number: phone.number, label: phone.label, type: phone.type || "mobile", isPrimary: phone.isPrimary })
          .where(eq(phoneNumbers.id, phone.id))
        existingIds.delete(phone.id)
      } else {
        // Add new phone number
        await db.insert(phoneNumbers).values({
          contactId: id,
          number: phone.number,
          label: phone.label,
          type: phone.type || "mobile",
          isPrimary: phone.isPrimary || false,
        })
      }
    }

    // Delete removed phone numbers
    for (const phoneId of existingIds) {
      await db.delete(phoneNumbers).where(eq(phoneNumbers.id, phoneId))
    }

    revalidatePath("/")

    // Fetch and return the updated contact
    const updatedContact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .then((res) => res[0])
    const updatedPhoneNumbers = await db.select().from(phoneNumbers).where(eq(phoneNumbers.contactId, id))
    return { ...updatedContact, phoneNumbers: updatedPhoneNumbers }
  } catch (error: any) {
    console.error("Error updating contact in database:", error)
    if (error.message && error.message.includes("exceeded the data transfer quota")) {
      throw new Error("Data transfer quota exceeded. Please upgrade your plan.")
    }
    throw new Error("Failed to update contact")
  }
}

export async function deleteContact(id: string) {
  await db.delete(phoneNumbers).where(eq(phoneNumbers.contactId, id))
  await db.delete(contacts).where(eq(contacts.id, id))
  revalidatePath("/")
}

