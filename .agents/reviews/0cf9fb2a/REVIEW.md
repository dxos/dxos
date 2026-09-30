---
branch: dm/zealous-johnson-9387pu
commit: 0cf9fb2a719729af26f2155d35fd2b20bdf9c385
base: 04892b42c941de35f1581c2802dba5b4b47b7ac0
mode: pr-only
createdAt: 2026-09-30T04:47:13.619Z
isFinalized: true
groups: 61
rules: [dont-leak-internal-api-through-public-surface, prefer-branded-types-over-raw-primitives]
reviewId: 0cf9fb2a
---

_0 error(s), 2 warning(s)._

# WARN 0cf9fb2a-1 prefer-branded-types-over-raw-primitives `packages/devtools/devtools/src/hooks/useIndexerRows.ts:21:3`

`IndexerRow.spaceId` is typed `string` although the value is always `space.id` (a `SpaceId`), which widens the branded type back to a raw string. Type it as `SpaceId` (from `@dxos/keys`), per `prefer-branded-types-over-raw-primitives`, and give the fixtures real `SpaceId` values.

# WARN 0cf9fb2a-2 dont-leak-internal-api-through-public-surface `packages/devtools/devtools/src/hooks/useSyncRows.ts:26:14`

`getSpaceDisplayName` is newly exported only so `useIndexerRows.ts` in the same package can import it, but `hooks/index.ts` does `export *` from `useSyncRows.ts`, so it now leaks through the `@dxos/devtools` root entry point with no outside caller. Move it to an internal, non-barrelled module (or import it in a way that keeps it off the public surface) per `dont-leak-internal-api-through-public-surface`.
