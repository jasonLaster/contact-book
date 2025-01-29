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
    console.log("✅ Contacts table ready")

    // Create groups table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `
    console.log("✅ Groups table ready")

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
    console.log("✅ Contact groups table ready")

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
    console.log("✅ Phone numbers table ready")

    // Check if position column exists in groups table
    const positionColumnExists = await sql<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'groups' AND column_name = 'position'
    `

    if (positionColumnExists.rows.length === 0) {
      // Add position column
      await sql`ALTER TABLE groups ADD COLUMN position INTEGER NOT NULL DEFAULT 0`
      console.log("✅ Added position column to groups table")

      // Get all custom groups
      const customGroups = await sql<{ id: string }[]>`
        SELECT id
        FROM groups
        WHERE type = 'custom'
        ORDER BY created_at
      `

      // Update positions one by one
      for (let i = 0; i < customGroups.rows.length; i++) {
        await sql`
          UPDATE groups 
          SET position = ${i}
          WHERE id = ${customGroups.rows[i].id}
        `
      }
      console.log("✅ Updated positions for existing groups")
    }

    // Check if Favorites group exists, create it if it doesn't
    const favoritesGroup = await sql<{ id: string }[]>`
      SELECT id FROM groups WHERE name = 'Favorites' AND type = 'system'
    `

    if (favoritesGroup.rows.length === 0) {
      await sql`
        INSERT INTO groups (name, type)
        VALUES ('Favorites', 'system')
      `
      console.log("✅ Created Favorites group")
    }

    console.log("✅ Schema updated successfully")

    // Verify the changes
    const tables = ['contacts', 'groups', 'contact_groups', 'phone_numbers']
    for (const table of tables) {
      const result = await sql<{ column_name: string; data_type: string }[]>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `
      console.log(`\n${table} table structure:`, result.rows)
    }
  } catch (error) {
    console.error("❌ Error updating schema:", error)
    throw error
  }
}

updateSchema().catch(console.error) 
