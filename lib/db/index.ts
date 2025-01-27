import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// This tells Neon to use the HTTP-only connection
neonConfig.fetchConnectionCache = true

const sql = neon(process.env.POSTGRES_URL!)
export const db = drizzle(sql)

