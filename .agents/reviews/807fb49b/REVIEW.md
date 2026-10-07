---
branch: dm/zealous-johnson-9387pu
commit: 807fb49b59bdaf8899b49f9682d879e9a17e6efe
base: 0cf9fb2a719729af26f2155d35fd2b20bdf9c385
mode: pr-only
createdAt: 2026-09-30T06:16:30.805Z
isFinalized: true
groups: 41
rules: [consistent-file-naming-within-folder, delete-dead-code-after-migration, prefer-branded-types-over-raw-primitives]
reviewId: 807fb49b
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 807fb49b-1 - resolved - consistent-file-naming-within-folder - packages/devtools/devtools/src/hooks/space-display-name.ts:1
- 807fb49b-2 - resolved - delete-dead-code-after-migration - packages/devtools/devtools/src/hooks/useIndexerRows.ts:22:3
- 807fb49b-3 - ignored - prefer-branded-types-over-raw-primitives - packages/devtools/devtools/src/hooks/useSyncRows.ts:19:3

## Issues

# WARN 807fb49b-1 consistent-file-naming-within-folder `packages/devtools/devtools/src/hooks/space-display-name.ts:1`

Every sibling file in `hooks/` is camelCase (`useIndexerRows.ts`, `useSyncRows.ts`, ...) but this new file is kebab-case. Rename it to match the folder's convention (e.g. `getSpaceDisplayName.ts`), per `consistent-file-naming-within-folder`.

# WARN 807fb49b-2 delete-dead-code-after-migration `packages/devtools/devtools/src/hooks/useIndexerRows.ts:22:3`

`IndexerRow.indexingInProgress` is left behind by this change: `rowIcon` in `IndexerCard.tsx` stopped reading it, and nothing else in devtools consumes it, yet `compareHeads`, the error row and every fixture row still populate it. Delete the field (and its assignments in `useIndexerRows.ts` and `fixtures.ts`) in the same change, per `delete-dead-code-after-migration`.

# WARN 807fb49b-3 prefer-branded-types-over-raw-primitives `packages/devtools/devtools/src/hooks/useSyncRows.ts:19:3`

`SyncRow.spaceId` is typed `string` although it holds a `SpaceId` (the sibling `IndexerRow.spaceId` and the `feedState[spaceId as SpaceId]` cast at line 38 show it). Type the field `SpaceId`, narrow the `Object.entries` key once at the source, and update the `syncRows` fixtures to use `SpaceId.make(...)`, per `prefer-branded-types-over-raw-primitives`.
