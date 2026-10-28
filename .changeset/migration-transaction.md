---
'@dxos/echo': minor
---

Replace `MigrationBuilder` with `Migration.Transaction`: `db.beginMigration()` stages ECHO objects (`add`, `replace`, `migrate`, `delete`, `compact`) and commits them either as a new space epoch (`root: 'replace'`, the default) or as one atomic write to the current root (`root: 'update'`). `Migration.defineTransaction` runs a transaction through `db.runMigrations`. Breaking: `@dxos/migrations` no longer exports `MigrationBuilder`, a migration's `next` now receives `{ space, migration }` instead of `{ space, builder }`, and `Database` implementations must provide `beginMigration`.
