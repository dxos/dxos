---
'@dxos/echo': minor
---

Replace `MigrationBuilder` with `Migration.Transaction`: `db.beginMigration()` (or `Database.beginMigration` as an Effect) stages ECHO objects (`add`, `replace`, `migrate`, `delete`, `compact`) and its Effect `commit()` writes them either as a new space epoch (`root: 'replace'`, the default) or as one atomic write to the current root (`root: 'update'`). `Migration.defineTransaction` runs a transaction through `db.runMigrations`. Breaking: `@dxos/migrations` no longer exports `MigrationBuilder` or `MigrationContext`, a version step now lists ECHO migrations (`{ version, migrations }`) instead of a `next` callback, and `Database` implementations must provide `beginMigration`.
