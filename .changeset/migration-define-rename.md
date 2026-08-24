---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

Added `Migration.defineRename({ from, to })` for migrating references to a renamed named entity (e.g. an operation key). Applying it rewrites the `dxn:` references held in the space's object data, preserving each reference's version suffix; a reference that already reads correctly is not written, so a re-run — or a peer that already replicated the result — is a no-op. Queue and feed contents are not indexed for reverse lookup and are not migrated.

Migration definitions now carry `Migration.TypeId` and a `kind` discriminant: `Migration.ObjectMigration` (from `Migration.define`) and `Migration.RenameMigration` (from `Migration.defineRename`) both extend the `Migration.Migration` base, narrowed with `Migration.isObjectMigration` / `Migration.isRenameMigration`; `Migration.isMigration` guards an unknown value. `EchoDatabase.runMigrations` accepts both kinds and rejects an unrecognized one before applying any of the batch.

`Query.select(Filter.key(dxn)).referencedBy()` now finds the objects referencing a named entity. The reverse-reference index covers `dxn:` targets — previously it indexed only `echo:` entity ids — keyed by the unversioned NSID, so one lookup finds every version of a name; existing databases re-index the reverse-reference table once on open to pick up the newly covered references. The planner collapses that construct to a single index lookup, because a named entity is never in the graph and so can never be selected as a traversal anchor. A version-constrained `Filter.key(dxn, { version })` anchor keeps its existing composed meaning, since the index cannot honour a semver range.
