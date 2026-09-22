# Declare Database.Service on RemoveObjects

`SpaceOperation.RemoveObjects` now declares `Database.Service` as a required service, so every
caller must pass `spaceId` in the invoke options. This fixes removal on hosts that have no client
`Space`, such as edge operation-service behind composer.dxos.network/mcp, where every call failed
its invariant and nothing was removed.

## The operation now requires a database

The operation previously assumed the space could always be recovered from the input objects
themselves.

```diff file=packages/plugins/plugin-space/src/types/SpaceOperation.ts lines=205-222

```

The removed comment claimed the space comes from live entities or space-qualified refs, but a host
running behind the edge operation-service has no client `Space` to resolve against, so that
invariant failed and nothing was removed. Declaring `Database.Service` makes the operation resolve
the space explicitly from `spaceId` instead of inferring it from the input.

## Every call site now passes spaceId

Because the operation resolves its database from the invoke options rather than the input, every
call site across the plugins needs to supply `spaceId`, sourced from whatever already holds the
object's database reference.

```diff file=packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts lines=392-405

```

Most call sites read `spaceId` off `Obj.getDatabase(object)?.spaceId`, since they only have the
object, not a database in scope.

```diff file=packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx lines=104-114

```

A call site that already holds a `db` in its component scope passes `db?.spaceId` directly and
adds `db` to its callback's dependency array, since the hook must now depend on it.

```diff file=packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx lines=67-70

```

This same shape repeats across roughly a dozen call sites in plugin-blogger, plugin-commerce,
plugin-connector, plugin-game, plugin-illustrator, plugin-projects, and plugin-studio. Each one
adds a third `{ spaceId }` argument sourced from the nearest database reference already in scope,
and each one that closes over that value in a `useCallback` adds it to the dependency array.
