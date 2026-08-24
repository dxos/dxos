---
'@dxos/echo': minor
'@dxos/echo-client': minor
---

Added `Migration.defineRename({ from, to })` for migrating references to a renamed named entity (e.g. an operation key). Applying it rewrites every `dxn:` reference pointing at the old name to point at the new one, preserving any version suffix; it is idempotent, so re-running it or running it on a peer that already replicated the result is a no-op.

Migration definitions now carry `Migration.TypeId` and a `kind` discriminant: `Migration.ObjectMigration` (from `Migration.define`) and `Migration.RenameMigration` (from `Migration.defineRename`) both extend the `Migration.Migration` base, narrowed with `Migration.isObjectMigration` / `Migration.isRenameMigration`; `Migration.isMigration` guards an unknown value. `EchoDatabase.runMigrations` accepts both kinds.
