import { sql } from "@vercel/postgres"

async function updateSchema() {
  console.log("Updating schema...")

  try {
    // Drop existing tables if they exist
    await sql`DROP TABLE IF EXISTS phone_numbers`
    await sql`DROP TABLE IF EXISTS contacts`

    // Create contacts table
    await sql`
      CREATE TABLE contacts (
        id VARCHAR(256) PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        email VARCHAR(256),
        notes TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `

    // Create phone_numbers table
    await sql`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id SERIAL PRIMARY KEY,
        contact_id VARCHAR(256) NOT NULL,
        number VARCHAR(256) NOT NULL,
        label VARCHAR(50),
        type VARCHAR(20) NOT NULL DEFAULT 'mobile',
        is_primary BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
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

