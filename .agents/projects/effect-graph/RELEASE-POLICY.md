# Graph release policy

Follow-up to #12594, which landed the release _mechanism_ with no production caller. This proposes
the port that turns it on and the deck-plugin implementation behind it.

Status: **implemented**, 2026-08-26. This is the design as built; the sketches below match the
shipped code closely enough to read as documentation, and §7 records what is still open.

## 1. Where things stand

The mechanism is in and tested:

| Layer                      | Entry point             | What it reclaims                                                          |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| `@dxos/graph/GraphModel`   | `release(ids)`          | node slots, id and adjacency indexes, atom pins                           |
| `@dxos/graph/GraphBuilder` | `release(builder, ids)` | expansion subscriptions, connector diff state, provenance, then the store |
| `@dxos/app-graph/AppGraph` | `release(graph, ids)`   | `_pins`, `_relations`, `_expanded` / `_pendingExpands`                    |

`GraphBuilder.release` also tears down any connector whose previous output intersects the released
set, not only connectors rooted at a released node. That is what makes a release an unload rather
than a deletion: the retained parent forgets it ever expanded, so the next read rebuilds the
subgraph from its connectors. `retention.test.ts` covers the round trip.

The shape below is the one already sketched at `GraphBuilder.ts:222`:

```
// TODO(wittjosiah): Add api for setting subscription set and/or radius.
//   Should unsubscribe from nodes that are not in the set/radius.
//   Should track LRU nodes that are not in the set/radius and remove them beyond a certain threshold.
```

Three things are missing.

**Collecting the set.** Every existing caller reaches through the internals:

```ts
Graph.getInternal(graph)._model.descendants(root, Graph.relationKey('child'));
```

That is not a public surface, it follows one relation, and following only `child` orphans the
`action` nodes hanging off every released node. `AppGraphBuilder._onExpand` expands `action`
alongside every `child`, so those nodes exist under essentially everything.

**Deciding what is releasable.** Neither graph package knows what a workspace is, and
`GraphBuilder.release`'s own doc comment says so.

**Deciding when.** There is no trigger.

## 2. What actually grows

From `retention.test.ts`, per workspace visited and then navigated away from:

- every node stays in the model, with its slot, id-index entry and adjacency entries
- every node keeps a mounted atom (`_pin`), so the registry never reclaims it
- every node keeps its provenance entry in `builder._nodeExtensions`
- the workspace root keeps its expansion subscription

None of it is reachable from anything on screen. A session that visits ten workspaces holds all ten.

## 3. The port

Retention is a second port on `GraphBuilder`, sibling to `Store`. The builder owns the mechanism and
the cadence; the implementor owns the policy and the state behind it. **The builder stores nothing:
no roots, no recency, no protection set.** An implementor answers from whatever state it already
keeps.

### `@dxos/graph/GraphBuilder`

```ts
/**
 * Which subgraphs the builder may unload.
 *
 * The builder owns the mechanism (collect the subgraph, tear down the expansion state that would
 * otherwise keep it from re-expanding, hand the ids to the store) and has no view of what a
 * releasable unit is. The implementor owns that, and answers from state it already keeps: nothing
 * here is stored on the builder, so there is one copy of the answer and it lives with whatever
 * knows it.
 *
 * Without a port installed the builder releases nothing, which is the behaviour before it existed.
 */
export interface Retention {
  /**
   * Roots whose subgraphs should be unloaded, if any. The roots themselves are kept, so the node
   * the user navigates back to is still there to expand.
   *
   * A query, not a command: the builder does the releasing. Asked once per settled flush, so
   * answering "nothing" must be cheap.
   */
  evictable(): Iterable<string>;
}

/** Install the retention port. `undefined` turns releasing back off. */
export const setRetention = (builder: Any, retention: Retention | undefined): void;

/**
 * Unloads what the port nominates. Runs at the end of each settled flush; exported so a caller can
 * force a pass, which is mostly what tests want.
 */
export const collect = (builder: Any): string[];
```

A setter rather than a constructor prop because the builder is constructed by `plugin-graph` before
any plugin that could implement the port has loaded.

Collection is another optional `Store` method, paired with the `release` that is already there:

```ts
export interface Store<Node, Arg, G> {
  // ...
  /**
   * Ids reachable from `root` that nothing outside the set holds, if the store can answer. Paired
   * with {@link Store.release}: a store that cannot enumerate a subgraph cannot be asked to unload
   * one, and {@link collect} does nothing without both.
   */
  subgraph?(root: string, relation?: string | readonly string[]): readonly string[];
}
```

Cadence: at the end of the flush task in `_scheduleDirtyFlush`, once `_dirtyConnectors` has drained.
The graph has just settled, which is the only moment at which the answer is worth asking for.

```ts
_scheduleDirtyFlush(): void {
  if (!this._flushScheduled) {
    this._flushScheduled = true;
    this._flushPromise = this._schedule(() => {
      this._flushScheduled = false;
      while (this._dirtyConnectors.size > 0) {
        // ... unchanged
      }
      this._collect();
    });
  }
}
```

### `@dxos/graph/GraphModel`

The traversal, as a sibling of `descendants`:

```ts
/**
 * Ids reachable from `id` that nothing outside the set holds, excluding `id` itself.
 *
 * {@link AbstractGraphModel.descendants} answers what is reachable; this answers what can be
 * released, which is a smaller set. A node an outside parent also points at stays, along with
 * everything reachable only through it: releasing it would tear down that parent's connector too,
 * and a view rendering the node blanks until the re-expand lands.
 *
 * Every relation by default, so a node's actions are collected with the node rather than orphaned
 * beside it.
 */
subgraph(id: string, type?: string | readonly string[]): string[] {
  const types = type === undefined ? undefined : new Set(typeof type === 'string' ? [type] : type);
  const collected = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    for (const edge of this.outgoing(queue.shift()!)) {
      if ((types && !types.has(edge.type)) || edge.target === id || collected.has(edge.target)) {
        continue;
      }
      collected.add(edge.target);
      queue.push(edge.target);
    }
  }

  // Dropping a node puts its own descendants back within reach of something retained, so this runs
  // to a fixpoint rather than once. Converges in one pass unless subgraphs interleave.
  for (let changed = true; changed; ) {
    changed = false;
    for (const candidate of collected) {
      if (this.incoming(candidate).some(({ source }) => source !== id && !collected.has(source))) {
        collected.delete(candidate);
        changed = true;
      }
    }
  }

  return [...collected];
}
```

Every edge is stored in outbound form (`storedEdge`), so an inbound-declared relation is the same
edge read backwards and filtering on the outbound key is correct.

### `@dxos/app-graph`

Two lines in `makeStore`, next to the `release` adapter already there:

```ts
subgraph: (root, relation) => Graph.getInternal(graph)._model.subgraph(root, relation),
```

Plus a `Capability.makeSingleton<GraphBuilder.Retention>()` in `AppCapabilities` so a plugin can
contribute one, and a subscription in `plugin-graph/src/graph.ts` next to the extensions one:

```ts
const unsubscribeRetention = registry.subscribe(
  yield * Capability.atom(AppCapabilities.AppGraphRetention),
  ([retention]) => AppGraphBuilder.setRetention(builder, retention),
  { immediate: true },
);
```

## 4. The deck's implementation

LRU over workspace roots. The deck is the only layer that knows what a workspace is and already
holds the visit order, the exemptions and the setting.

**The deck never triggers a release.** It answers `evictable()` and nothing else. `SwitchWorkspace`
gains one line, in the ephemeral update it already performs:

```ts
yield *
  Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
    ...state,
    fullscreen: undefined,
    recentWorkspaces: [input.subject, ...(state.recentWorkspaces ?? []).filter((id) => id !== input.subject)],
  }));
```

Ephemeral, not persisted: it orders unloading within a session, and a reload has nothing loaded to
unload.

Selection is a pure function, so it tests without a graph:

```ts
// packages/plugins/plugin-deck/src/util/workspace-retention.ts

/** Below this the workspace being left is still mounted when collection runs. See §5. */
const MINIMUM_LOADED = 2;

/**
 * Workspaces to unload: everything past `limit` in visit order.
 *
 * Pinned workspaces (settings, the plugin registry) are exempt. They are small and fixed, and they
 * are the ones a session bounces in and out of, so unloading one is rebuild cost with no saving.
 */
export const evictableWorkspaces = (recent: readonly string[], limit: number): string[] =>
  recent
    .filter((id) => id !== DeckSchema.DEFAULT_DECK_ID && !GraphPath.isPinnedWorkspace(id))
    .slice(Math.max(limit, MINIMUM_LOADED));
```

`DEFAULT_DECK_ID` is the "no workspace resolved yet" sentinel and is not a graph node id.

The port implementation reads the deck's own atoms and holds nothing:

```ts
// packages/plugins/plugin-deck/src/capabilities/graph-retention.ts

const retention: GraphBuilder.Retention = {
  evictable: () => {
    const { recentWorkspaces = [] } = registry.get(ephemeralAtom);
    const { loadedWorkspaces = DEFAULT_LOADED_WORKSPACES } = registry.get(settingsAtom);
    return evictableWorkspaces(recentWorkspaces, loadedWorkspaces);
  },
};

return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
```

Setting, defaulting to 3:

```ts
// DeckSchema.Settings
loadedWorkspaces: Schema.optional(
  Schema.Number.annotate({
    title: 'Workspaces kept loaded',
    description:
      'How many recently visited workspaces keep their navigation tree in memory. Older ones are unloaded and rebuilt when you return to them.',
  }),
),
```

## 5. Correctness constraints

**The workspace root is never released.** It is a child of `root`, rendered in the L0 workspace
list, and releasing it would tear down the root connector's diff state and force the whole workspace
list to re-expand. `GraphModel.subgraph` excludes `id` for this reason.

**The workspace being left is never released on the switch that leaves it.** Its planks are still
mounted, and a node released under a mounted plank renders as not-found until the re-expand lands.
The MRU shape handles this structurally rather than with a timer: position 0 is the workspace being
entered and position 1 the one being left, so a limit of 2 or more can never select either. Hence
`MINIMUM_LOADED`. This is why the policy is an MRU list and not "unload the workspace you just
left", and it is what makes the builder-driven cadence safe: the deck does not have to know when
collection runs.

**Actions come with their node.** `subgraph` follows every relation by default.

**A released relation re-expands.** `GraphBuilder.release` tears down any connector whose previous
output intersects the released set, so the retained workspace root forgets it ever expanded.
Verified by the existing `a released subgraph re-expands from its connectors on the next read` test,
which releases descendants only.

**URL restore rehydrates.** `path-resolution.ts` expands each ancestor segment before resolving a
candidate id, so a plank restored from the URL into a released workspace expands it on the way in.

**Cross-parent nodes stay.** `qualifyId` makes a connector's output structurally scoped to its
parent, so a single id shared across workspaces should not occur. The prune pass covers an extension
that adds an edge directly rather than through a connector, and costs one adjacency read per
collected node.

## 6. Tests

- `packages/common/graph/src/GraphModel.test.ts`: `subgraph` collects every relation; excludes the
  root; excludes a node an outside parent also holds; excludes that node's own descendants.
- `packages/common/graph/src/GraphBuilder.test.ts`: `collect` releases what the port nominates and
  nothing without a port; a store missing `subgraph` or `release` is a no-op; collection runs at the
  end of a settled flush.
- `packages/plugins/plugin-deck/src/util/workspace-retention.test.ts`: pure selection. Pinned and
  sentinel workspaces exempt; the clamp; a revisit moving a workspace back to the front.
- `packages/sdk/app-graph/src/retention.test.ts`: end to end, a retention port nominating workspace
  roots reclaims them and a revisit rebuilds the same subtree.

## 7. Open questions

1. **Where recency lives.** An ephemeral `recentWorkspaces` list is the explicit option. The
   zero-new-state alternative is to make the persisted `decks` record MRU-ordered, which
   `SwitchWorkspace` can do for free since it already rewrites the record:
   `{ [input.subject]: state.decks[input.subject] ?? { ...defaultDeck }, ...state.decks }`. Then
   `Object.keys(state.decks)` is the order. It survives reload, but it makes the key order of a
   persisted field load-bearing, which the next person to rewrite that record will not know.
   Recommendation: the explicit field.
2. **Default limit.** 3 is a guess. Worth measuring against a real profile before shipping a number.
3. **Setting or constant.** A user-visible setting invites tuning nobody should have to do. The
   alternative is a constant and a `VITE_` override for profiling.
