import { sql } from "@vercel/postgres"

async function updateSchema() {
  console.log("Updating schema...")

  try {
    // Drop existing tables if they exist
    await sql`DROP TABLE IF EXISTS phone_numbers`
    await sql`DROP TABLE IF EXISTS contacts`

    // Create contacts table
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        notes TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `

    // Create phone_numbers table
    await sql`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id TEXT NOT NULL,
        number TEXT NOT NULL,
        label TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `

    console.log("✅ Schema updated successfully")

    // Verify the changes
    const contactsResult = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contacts'
    `
    console.log("Contacts table structure:", contactsResult)

    const phoneNumbersResult = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'phone_numbers'
    `
    console.log("Phone numbers table structure:", phoneNumbersResult)
  } catch (error) {
    console.error("❌ Error updating schema:", error)
    throw error
  }
}

updateSchema().catch(console.error)

