---
'@dxos/graph': minor
'@dxos/app-graph': minor
---

Split the generic expansion engine out of the app graph builder.

`@dxos/graph/GraphBuilder` now owns the extension registry, connector subscriptions, id
qualification, ordering and dirty-flush, driven over a `Store` port. `@dxos/app-graph`'s
`AppGraphBuilder` specializes it with app nodes, relations, actions and URL bindings; its public API
is unchanged apart from `BuilderExtension.url`, which is now the generic `meta` field.

Node-id path helpers (`qualifyId`, `parentId`, `segmentId`, `validateSegmentId`, `PathSeparator`)
move to `@dxos/graph/GraphNode`; `@dxos/app-graph` no longer exports `qualifyId`, `getParentId` or
`getSegmentId`. `GraphNodeMatcher`'s basic matchers preserve the node type they were given.
