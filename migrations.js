import { sql } from "@vercel/postgres"

async function updateSchema() {
  console.log("Updating schema...")

  try {
    // Create contacts table if it doesn't exist
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

    // Create groups table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `

    // Create contact_groups table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS contact_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id TEXT NOT NULL,
        group_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `

    // Create phone_numbers table if it doesn't exist
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

    // Check if Favorites group exists, create it if it doesn't
    const favoritesGroup = await sql`
      SELECT id FROM groups WHERE name = 'Favorites' AND type = 'system'
    `
    
    if (favoritesGroup.rowCount === 0) {
      await sql`
        INSERT INTO groups (name, type)
        VALUES ('Favorites', 'system')
      `
    }

    console.log("✅ Schema updated successfully")

    // Verify the changes
    const tables = ['contacts', 'groups', 'contact_groups', 'phone_numbers']
    for (const table of tables) {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `
      console.log(`${table} table structure:`, result)
    }
  } catch (error) {
    console.error("❌ Error updating schema:", error)
    throw error
  }
}

updateSchema().catch(console.error)

