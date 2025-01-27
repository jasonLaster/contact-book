import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Disable all debug logging
neonConfig.fetchConnectionCache = true
neonConfig.debug = false

const sql = neon(process.env.POSTGRES_URL!, { debug: false })
export const db = drizzle(sql, { logger: false })

