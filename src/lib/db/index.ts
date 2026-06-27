import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // eslint-disable-next-line no-var
  var __db_client: postgres.Sql | undefined
}

const client =
  globalThis.__db_client ??
  postgres(process.env.DATABASE_URL!, { max: 10 })

if (process.env.NODE_ENV !== "production") {
  globalThis.__db_client = client
}

export const db = drizzle(client, { schema })
export { schema }
export type DB = typeof db
