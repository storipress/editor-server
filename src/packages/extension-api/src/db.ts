import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import Sqlite3 from 'better-sqlite3'

export type Database = BetterSQLite3Database<Record<string, never>>

export function connect(path: string) {
  return drizzle(new Sqlite3(path))
}
