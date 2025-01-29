"use server"

import { revalidatePath } from "next/cache"
import { db } from "./db"
import { contacts, phoneNumbers, groups, contactGroups, type Contact, type PhoneNumber, type Group } from "./db/schema"
import { eq, or, ilike, and, sql, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { put } from "@vercel/blob"

export async function getGroups() {
  try {
    // Get all groups with contact counts and contact associations
    const results = await db.select({
      id: groups.id,
      name: groups.name,
      type: groups.type,
      position: groups.position,
      createdAt: groups.createdAt,
      contactCount: sql<number>`count(DISTINCT ${contactGroups.id})::int`,
      contacts: sql<{ contactId: string }[]>`json_agg(json_build_object('contactId', ${contactGroups.contactId})) FILTER (WHERE ${contactGroups.contactId} IS NOT NULL)`
    })
      .from(groups)
      .leftJoin(contactGroups, eq(groups.id, contactGroups.groupId))
      .groupBy(groups.id)
      .orderBy(sql`CASE WHEN ${groups.type} = 'system' THEN 0 ELSE 1 END, ${groups.position}`)

    // Clean up the contacts array for groups with no contacts
    return results.map(group => ({
      ...group,
      contacts: group.contacts?.[0]?.contactId === null ? [] : group.contacts
    }))
  } catch (error) {
    console.error("Error fetching groups:", error)
    throw new Error("Failed to fetch groups")
  }
}

export async function getContacts(search?: string, groupId?: string) {
  try {
    // First get all contacts
    const query = db.select({
      contact: contacts,
      phoneNumber: phoneNumbers
    })
      .from(contacts)
      .leftJoin(phoneNumbers, eq(contacts.id, phoneNumbers.contactId))

    const finalQuery = groupId
      ? query
        .innerJoin(contactGroups, eq(contacts.id, contactGroups.contactId))
        .where(eq(contactGroups.groupId, groupId))
      : query

    const results = await finalQuery

    // Create a map of contact IDs to their phone numbers
    const phoneNumbersMap = new Map<string, PhoneNumber[]>()
    results.forEach(({ phoneNumber }) => {
      if (phoneNumber) {
        if (!phoneNumbersMap.has(phoneNumber.contactId)) {
          phoneNumbersMap.set(phoneNumber.contactId, [])
        }
        phoneNumbersMap.get(phoneNumber.contactId)!.push(phoneNumber)
      }
    })

    // Deduplicate contacts and add their phone numbers
    const seenIds = new Set<string>()
    const contactsArray = results
      .filter(({ contact }) => {
        if (!contact || seenIds.has(contact.id)) {
          return false
        }
        seenIds.add(contact.id)
        return true
      })
      .map(({ contact }) => ({
        ...contact,
        phoneNumbers: phoneNumbersMap.get(contact.id) || [],
        urlName: contact.name.toLowerCase().replace(/\s+/g, "-")
      }))

    if (search) {
      return contactsArray.filter(
        contact =>
          contact.name.toLowerCase().includes(search.toLowerCase()) ||
          contact.phoneNumbers.some(phone => phone.number.includes(search)) ||
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
  phones: { number: string; label: string; isPrimary?: boolean }[],
  email?: string,
  notes?: string,
  imageFile?: File,
) {
  const contactId = nanoid()
  let imageUrl: string | undefined

  if (imageFile) {
    try {
      const blob = await put(`avatars/${contactId}/${imageFile.name}`, imageFile, {
        access: "public",
      })
      imageUrl = blob.url
    } catch (error) {
      console.error("Error uploading to Vercel Blob:", error)
      throw new Error("Failed to upload image")
    }
  }

  await db.insert(contacts).values({
    id: contactId,
    name,
    email,
    notes,
    imageUrl,
  })

  if (phones && phones.length > 0) {
    await db.insert(phoneNumbers).values(
      phones.map((phone) => ({
        contactId,
        number: phone.number,
        label: phone.label,
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
    phoneNumbers: { id?: string; number: string; label: string; isPrimary?: boolean }[]
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
          .set({
            number: phone.number,
            label: phone.label,
            isPrimary: phone.isPrimary || false
          })
          .where(eq(phoneNumbers.id, phone.id))
        existingIds.delete(phone.id)
      } else {
        // Add new phone number
        await db.insert(phoneNumbers).values({
          contactId: id,
          number: phone.number,
          label: phone.label,
          isPrimary: phone.isPrimary || false
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

export async function addGroup(name: string) {
  try {
    // Get the highest position
    const result = await db.select({
      maxPosition: sql<number>`COALESCE(MAX(position), -1)`
    })
      .from(groups)
      .where(eq(groups.type, 'custom'))

    const newPosition = (result[0]?.maxPosition ?? -1) + 1

    await db.insert(groups).values({
      name,
      type: 'custom',
      position: newPosition
    })

    revalidatePath("/")
  } catch (error) {
    console.error("Error adding group:", error)
    throw new Error("Failed to add group")
  }
}

export async function updateGroup(id: string, name: string) {
  try {
    await db.update(groups)
      .set({ name })
      .where(eq(groups.id, id))

    revalidatePath("/")
  } catch (error) {
    console.error("Error updating group:", error)
    throw new Error("Failed to update group")
  }
}

export async function deleteGroup(id: string) {
  try {
    // First delete all contact-group associations
    await db.delete(contactGroups)
      .where(eq(contactGroups.groupId, id))

    // Then delete the group
    await db.delete(groups)
      .where(eq(groups.id, id))

    revalidatePath("/")
  } catch (error) {
    console.error("Error deleting group:", error)
    throw new Error("Failed to delete group")
  }
}

export async function addContactToGroup(contactId: string, groupId: string) {
  try {
    await db.insert(contactGroups)
      .values({ contactId, groupId })
      .onConflictDoNothing()

    revalidatePath("/")
  } catch (error) {
    console.error("Error adding contact to group:", error)
    throw new Error("Failed to add contact to group")
  }
}

export async function removeContactFromGroup(contactId: string, groupId: string) {
  try {
    await db.delete(contactGroups)
      .where(and(
        eq(contactGroups.contactId, contactId),
        eq(contactGroups.groupId, groupId)
      ))

    revalidatePath("/")
  } catch (error) {
    console.error("Error removing contact from group:", error)
    throw new Error("Failed to remove contact from group")
  }
}

export const reorderGroups = async (draggedGroupId: string, targetGroupId: string) => {
  try {
    // Get the dragged and target groups
    const [draggedGroup] = await db.select()
      .from(groups)
      .where(eq(groups.id, draggedGroupId))
      .limit(1)

    const [targetGroup] = await db.select()
      .from(groups)
      .where(eq(groups.id, targetGroupId))
      .limit(1)

    if (!draggedGroup || !targetGroup) {
      throw new Error('Groups not found')
    }

    // Get all custom groups ordered by position
    const allGroups = await db.select()
      .from(groups)
      .where(eq(groups.type, 'custom'))
      .orderBy(asc(groups.position))

    // Find the indices
    const draggedIndex = allGroups.findIndex(g => g.id === draggedGroupId)
    const targetIndex = allGroups.findIndex(g => g.id === targetGroupId)

    if (draggedIndex === -1 || targetIndex === -1) {
      throw new Error('Invalid group positions')
    }

    // Reorder the array
    const reorderedGroups = [...allGroups]
    const [removed] = reorderedGroups.splice(draggedIndex, 1)
    reorderedGroups.splice(targetIndex, 0, removed)

    // Update positions in the database
    await Promise.all(
      reorderedGroups.map((group, index) =>
        db.update(groups)
          .set({ position: index })
          .where(eq(groups.id, group.id))
      )
    )

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    throw error
  }
}

