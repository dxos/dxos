---
'@dxos/sql-sqlite': minor
---

Add `SqlMigrations` for executing multi-statement SQL scripts, and `SqlTransaction.clientLayer` for running `@effect/sql`'s migrator on platforms whose SQL client cannot emit `BEGIN`/`COMMIT`, such as Cloudflare Durable Objects. The feed store's schema now ships as numbered migration files recorded in a history table rather than as inline DDL.
