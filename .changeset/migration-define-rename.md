---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

Added `Migration.defineRename({ from, to })` for migrating references to a renamed named entity (e.g. an operation key). Applying it rewrites the `dxn:` references held in the space's object data, preserving each reference's version suffix; a reference that already reads correctly is not written, so a re-run — or a peer that already replicated the result — is a no-op. Queue and feed contents are not indexed for reverse lookup and are not migrated.

Migration definitions now carry `Migration.TypeId` and a `kind` discriminant: `Migration.ObjectMigration` (from `Migration.define`) and `Migration.RenameMigration` (from `Migration.defineRename`) both extend the `Migration.Migration` base, narrowed with `Migration.isObjectMigration` / `Migration.isRenameMigration`; `Migration.isMigration` guards an unknown value. `EchoDatabase.runMigrations` accepts both kinds and rejects an unrecognized one before applying any of the batch.

The reverse-reference index now covers references to named entities. Previously it indexed only `echo:` entity ids and dropped every other scheme; a `dxn:` reference is now indexed under its unversioned NSID, so one lookup finds every version of a name. Existing databases re-index the reverse-reference table once on open to pick up the newly covered references. `QueryService.queryReverseRef` exposes the lookup, which is how a rename migration finds the objects to rewrite instead of scanning the space.
