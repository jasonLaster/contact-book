import { varchar, text, timestamp, pgTable, serial, boolean } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { db } from "./index"

export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 256 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  contactId: varchar("contact_id", { length: 256 })
    .notNull()
    .references(() => contacts.id),
  number: varchar("number", { length: 256 }).notNull(),
  label: varchar("label", { length: 50 }),
  type: varchar("type", { length: 20 }).notNull().default("mobile"),
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

