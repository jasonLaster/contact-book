import { text, timestamp, pgTable, uuid, boolean, integer } from "drizzle-orm/pg-core"
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

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type", { enum: ['system', 'custom'] }).notNull().default('custom'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const contactGroups = pgTable("contact_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id),
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
export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
export type ContactGroup = typeof contactGroups.$inferSelect
export type NewContactGroup = typeof contactGroups.$inferInsert

export const insertContactSchema = createInsertSchema(contacts)
export const selectContactSchema = createSelectSchema(contacts)
export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers)
export const selectPhoneNumberSchema = createSelectSchema(phoneNumbers)
export const insertGroupSchema = createInsertSchema(groups)
export const selectGroupSchema = createSelectSchema(groups)
export const insertContactGroupSchema = createInsertSchema(contactGroups)
export const selectContactGroupSchema = createSelectSchema(contactGroups)

export { db }

