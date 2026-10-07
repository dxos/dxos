# Declare Database.Service on RemoveObjects

`SpaceOperation.RemoveObjects` resolved the space implicitly, from the entities passed in. That
assumption holds on a client with a live `Space`, but on edge operation-service behind
composer.dxos.network/mcp there is no such client, so the invariant failed and nothing was removed.
The operation now declares `Database.Service` explicitly, and every in-repo caller passes `spaceId`.

## Declare the service the operation needs

The operation no longer trusts the input to carry a resolvable space. Adding `Database.Service`
to its `services` list means an invoke without a `spaceId` fails to resolve the service instead of
silently operating on the wrong space, or none.

```diff file=packages/plugins/plugin-space/src/types/SpaceOperation.ts lines=212-224

```

## Every call site names its space

Each caller already held a database or a database-bearing object, so each one passes that object's
`spaceId` through the invoke options. Where the caller already had a `db` in scope, that db is the
source.

```diff file=packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts lines=394-406

```

```diff file=packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts lines=450-461

```

Where no db was in scope, the caller resolves it from the entity being removed, via
`Obj.getDatabase` or `Type.getDatabase`.

```diff file=packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx lines=71-79

```

```diff file=packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx lines=106-114

```

```diff file=packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx lines=245-255

```

A callback that reads `db` now depends on it, so its `useCallback` dependency list grows to match.

```diff file=packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx lines=188-197

```

```diff file=packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx lines=204-206

```

```diff file=packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx lines=67-75

```

An Effect-based caller passes the same `db?.spaceId` through its generator instead of a hook
dependency array.

```diff file=packages/plugins/plugin-connector/src/capabilities/app-graph-builder.ts lines=133-144

```

```diff file=packages/plugins/plugin-connector/src/containers/ConnectorCompanion/ConnectorCompanion.tsx lines=71-78

```

A cleanup path that removes an object it just failed to fully create already has the space that
created it, from the same options it used to create the object.

```diff file=packages/plugins/plugin-game/src/capabilities/create-object.ts lines=63-73

```

```diff file=packages/plugins/plugin-illustrator/src/capabilities/create-object.ts lines=65-75

```

The commerce plugin has two independent delete actions, each resolving its own object's database.

```diff file=packages/plugins/plugin-commerce/src/capabilities/app-graph-builder.ts lines=84-130

```
