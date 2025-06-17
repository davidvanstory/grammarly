/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import { documentsTable, profilesTable, todosTable, writingSamplesTable } from "@/db/schema"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const schema = {
  profiles: profilesTable,
  todos: todosTable,
  documents: documentsTable,
  writingSamples: writingSamplesTable
}

// Enhanced database connection logging
console.log("=== DATABASE CONNECTION INITIALIZATION ===")
console.log("Environment:", process.env.NODE_ENV)
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!")
  throw new Error("DATABASE_URL is required")
}

// Log partial URL for debugging (hide password)
const dbUrl = process.env.DATABASE_URL
const urlForLogging = dbUrl.replace(/:([^:@]+)@/, ':***@')
console.log("Database URL (masked):", urlForLogging)

// Enhanced postgres client configuration for serverless
const client = postgres(dbUrl, {
  // Essential for serverless - prevent connection pool buildup
  max: 1,
  // Aggressive timeouts for serverless
  idle_timeout: 20,
  connect_timeout: 30,
  // Prevent long-lived connections
  max_lifetime: 60 * 30,
  // Important for serverless - prepare statements can cause issues
  prepare: false,
  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',
  // Transform mode to prevent naming conflicts
  transform: {
    undefined: null
  },
  // Connection retry configuration
  connection: {
    application_name: 'grammarly-app'
  }
})

console.log("✅ Database client configured successfully")

// Test connection immediately
client`SELECT 1 as test`.then(() => {
  console.log("✅ Database connection test successful")
}).catch((error) => {
  console.error("❌ Database connection test failed:", error)
  console.error("Error details:", {
    message: error.message,
    code: error.code,
    severity: error.severity,
    detail: error.detail
  })
})

export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

console.log("✅ Drizzle ORM initialized with schema")
console.log("Available tables:", Object.keys(schema))
