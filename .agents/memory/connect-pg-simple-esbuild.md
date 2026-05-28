---
name: connect-pg-simple esbuild bundle issue
description: connect-pg-simple createTableIfMissing fails when bundled with esbuild because table.sql cannot be found at runtime path.
---

## Rule
Do NOT use `createTableIfMissing: true` with connect-pg-simple when the server is bundled with esbuild.

## Why
connect-pg-simple reads `table.sql` from a relative path inside its package directory. When esbuild bundles the server into a single `.mjs` file, the file is not included and `readFile` throws `ENOENT: no such file or directory`. Sessions appear to be created (login returns 200) but the session table does not exist, so subsequent session lookups always return 401.

## How to apply
Instead, create the session table manually at server startup using raw SQL via Drizzle:

```ts
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL,
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
  )
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
`);
```

Call this before `seedAdminIfEmpty()` in the server startup sequence. Remove `createTableIfMissing` from PgSession config.
