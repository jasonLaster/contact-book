import { text, timestamp, pgTable, uuid, boolean } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { db } from "./index"

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const phoneNumbers = pgTable("phone_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  number: text("number").notNull(),
  label: text("label").notNull(),
  isPrimary: boolean("is_primary").default(false),
})

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type PhoneNumber = typeof phoneNumbers.$inferSelect
export type NewPhoneNumber = typeof phoneNumbers.$inferInsert

export const insertContactSchema = createInsertSchema(contacts)
export const selectContactSchema = createSelectSchema(contacts)
export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers)
export const selectPhoneNumberSchema = createSelectSchema(phoneNumbers)

export { db }

