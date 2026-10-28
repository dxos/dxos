---
'@dxos/echo': minor
---

Replace `MigrationBuilder` with `Migration.Transaction`, started by `db.beginMigration()`: it stages ECHO objects (`add`, `replace`, `migrate`, `delete`, `compact`) and commits them as a new space epoch. Breaking: `@dxos/migrations` no longer exports `MigrationBuilder`, and a migration's `next` now receives `{ space, migration }` instead of `{ space, builder }`.
