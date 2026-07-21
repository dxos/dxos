# ECHO React consumer migration

Companion to the HALO migration (`packages/core/halo/halo/MIGRATION_PLAN.md`).
Where the HALO track moved Composer/plugins off direct `@dxos/client` identity
and space access, this track moves ECHO **data-access hooks** off the
`@dxos/react-client/echo` barrel onto `@dxos/echo-react` directly.

## Why this is a clean move

`@dxos/echo-react` is client-independent by construction: it depends only on
`@dxos/echo` (the object/schema/query core) and `@effect-atom/atom*` — never
`@dxos/client` or `@dxos/react-client`. Its hooks take the ECHO resource
explicitly (`useQuery(space?.db, filter)`, `useObject(objOrRef)`) rather than
resolving a client from React context.

`@dxos/react-client/echo` already re-exports `@dxos/echo-react`, so consumers
that wrote `import { useQuery } from '@dxos/react-client/echo'` were already
running the `@dxos/echo-react` implementation. Importing it directly changes
nothing at runtime — the signatures are identical — but removes the coupling to
`@dxos/react-client` for pure ECHO data access.

## What moved

The following symbols now import from `@dxos/echo-react` across
`packages/plugins/*` and `packages/ui/*`:

`useQuery`, `useObject`, `useObjectValue`, `useObjects`, `useResolveRef`,
`useType`, `usePagination`, `PaginationResult`, `UsePaginationOptions`,
`ObjectUpdateCallback`, `ObjectPropUpdateCallback`.

Result: every plugin/ui file that used the `@dxos/react-client/echo` barrel
_only_ for these hooks (106 files) dropped the `@dxos/react-client/echo` import
entirely; files that also use space-bound symbols kept those and split the hooks
out. `@dxos/echo-react` was added as a `workspace:*` dependency to every package
that needed it.

## What is intentionally NOT part of this track

These symbols are genuinely space/client/config-bound and remain on
`@dxos/react-client/echo`, `@dxos/client/echo`, `@dxos/react-client`, or
`@dxos/client`. They belong to the HALO/space/client-config surface, not ECHO
data access:

- **Space handle & lookup**: `Space`, `isSpace`, `getSpace`, `useSpaces`,
  `useSpace`, `SpaceState`, `SpaceSchema`, `SpaceProperties`, `SpaceMember`,
  `useMembers`, `useSpaceInvitations`, `useSpaceProperties`, `useSyncState`,
  `SpaceSyncStateMap`, `getSyncSummary`, `useRegistry`.
- **Client & config**: `Client`, `ClientService`, `useClient`, `ClientProvider`,
  `Config`, `useConfig`, `ConfigService`, `ClientOptions`, `PublicKey`,
  `useMulticastObservable`.
- **Imperative object/migration helpers**: `createObject`, `ObjectMigration`,
  `IndexKind`.

`useSpaces`/`useSpace` sites that exist only to reach `space.db` are left as-is:
the space handle still comes from the client/space surface; only the ECHO query
over `space.db` now runs through `@dxos/echo-react`.

## Object-anchored space access (`getSpace` decomposition)

`getSpace(obj)` returns the full client `Space` proxy just to reach the object's
database or space id. When only those are needed, the object already carries
both — no client required:

- `getSpace(obj).db` → `Obj.getDatabase(obj)` — returns `Database.Database | undefined`
  (which `extends Queryable`, so it drops straight into `useQuery`).
- `getSpace(obj).id` → `Obj.getDatabase(obj)?.spaceId` — `Database` exposes `spaceId`.
- Space metadata (name/state/members) by id → `useSpace(db.spaceId)` /
  `useMembers(db.spaceId)` (`@dxos/halo-react`), or `Space.get(spaceId)` (Effect).

A `getSpace(obj)` site is migrated only when the space value is used **solely**
for `.db` and/or `.id`. Sites that need the full `Space` — `.properties`,
`.members`, `.state`, `.membershipPolicy`, identity comparison, or passing the
`Space` to a component/function/hook — stay on the client surface until those
paths gain client-independent equivalents.
