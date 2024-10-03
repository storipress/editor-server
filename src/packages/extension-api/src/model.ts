import { text, sqliteTable, blob } from 'drizzle-orm/sqlite-core'

export const documents = sqliteTable('documents', {
  name: text('name').notNull(),
  data: blob('data').notNull(),
})
