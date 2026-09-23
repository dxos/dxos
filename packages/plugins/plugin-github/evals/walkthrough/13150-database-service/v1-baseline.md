# Declare Database.Service on RemoveObjects

`SpaceOperation.RemoveObjects` now declares `Database.Service` as a required service, so every
invocation must pass `spaceId` in its invoke options. This fixes removal on hosts that have no
client `Space` — such as edge operation-service behind composer.dxos.network/mcp — where every
`removeObjects` call previously failed its invariant and silently removed nothing.

## The operation needed a database service it wasn't declaring

The operation's services list previously assumed the space could always be derived from the input
itself — the live entities or the space-qualified refs passed in. That assumption breaks on a host
that never held a client `Space` in the first place, such as an edge worker operating purely over
refs. Declaring `Database.Service` on the operation makes the space an explicit dependency the
caller must supply, rather than one the operation tries to infer.

```diff file=packages/plugins/plugin-space/src/types/SpaceOperation.ts lines=203-224

```

## Every call site now passes spaceId explicitly

Because the operation's input schema didn't change — only its service requirements did — every
existing call site continues to compile but now fails to resolve the service unless it also passes
`spaceId` in the invoke options. Call sites source the space id the same way they already derive
other space-scoped values: from the object's own database reference where a live object is in hand,
or from a `db` already available in the surrounding component or capability.

```diff file=packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx lines=71-80

```

```diff file=packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts lines=394-224

```

Where a component derives `spaceId` from a value that can change, the hook's dependency array picks
up the new source so the callback stays correct across re-renders.

```diff file=packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx lines=67-82

```
