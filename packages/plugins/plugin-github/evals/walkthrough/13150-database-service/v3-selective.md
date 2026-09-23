# Declare Database.Service on RemoveObjects

`SpaceOperation.RemoveObjects` relied on the space being reachable from its input objects, which
holds for a client `Space` but not on every host. This declares the operation's dependency on
`Database.Service` explicitly, which means every caller must now pass `spaceId`.

## Declare the dependency and require spaceId

The operation previously assumed the space could always be recovered from the entities or refs
passed in. That assumption breaks on a host with no client `Space`, such as edge operation-service
behind composer.dxos.network/mcp, where every `removeObjects` call failed its invariant and removed
nothing. Declaring `Database.Service` makes the space a required input the invoker resolves, rather
than something the operation has to dig out of its arguments.

```diff file=packages/plugins/plugin-space/src/types/SpaceOperation.ts lines=212-218

```

## Every call site now passes spaceId

Declaring the service on the operation means a caller that omits `spaceId` fails to resolve it
rather than removing nothing. The fix is the same three lines at each of the dozen call sites: pass
`spaceId` from whatever already holds the database reference, either `db?.spaceId` from a container
prop or `Obj.getDatabase(object)?.spaceId` when only the object is in scope.

```diff file=packages/plugins/plugin-blogger/src/capabilities/app-graph-builder.ts lines=158-165

```

The same substitution appears in `plugin-blogger/PublicationArticle.tsx`, `plugin-commerce`'s two
delete actions, `plugin-connector`'s binding removal and its companion container, `plugin-game` and
`plugin-illustrator`'s cleanup-on-error paths, `plugin-inbox`'s event and message deletes,
`plugin-projects`, `plugin-space`'s collection and schema delete actions, `plugin-studio`, and
`plugin-table`. Where the container held no `db` in scope, it resolves the space from the object via
`Obj.getDatabase` or `Type.getDatabase` instead; either way the hook's dependency array grows to
include it, since it is now an input the callback reads.
