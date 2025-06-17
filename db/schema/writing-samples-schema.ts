/*
<ai_context>
Defines the database schema for writing samples.
</ai_context>
*/

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const writingSamplesTable = pgTable("writing_samples", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  wordCount: text("word_count").notNull(),
  storagePath: text("storage_path"), // Path in Supabase Storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertWritingSample = typeof writingSamplesTable.$inferInsert
export type SelectWritingSample = typeof writingSamplesTable.$inferSelect 