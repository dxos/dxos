---
'@dxos/sql-sqlite': minor
---

Add `SqlMigrations` and `SqlMigrator` for applying versioned SQL migrations recorded in a per-store history table, including baselining for databases created before migration tracking existed. The feed store's schema is now authored as a Prisma schema and applied as numbered migrations rather than inline DDL.
