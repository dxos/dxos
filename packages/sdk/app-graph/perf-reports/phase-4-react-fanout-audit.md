# Phase 4 — React Fanout Audit

## Core Mechanism: Reference Equality Everywhere

The atom system (`@effect-atom/atom`) uses `Equal.equals` from Effect to decide whether to notify subscribers.
Without structural regions enabled (which the atom library does not enable), `Equal.equals` falls back to
**reference equality** (`===`) for plain arrays and objects.

On the React side, `useAtomValue` uses `React.useSyncExternalStore`, which uses `Object.is`
(also reference equality) to decide whether to re-render.

**Every derived atom that produces a new array/object reference notifies subscribers, even when values are identical.**

## Ranked Fanout Map

### Rank 1 — `_connections` atom (`graph.ts:208-217`)

**Trigger**: ANY change to a connected node's properties triggers recomputation.

The `_connections` atom reads `_edges(id)` + `_node(childId)` for each child.
It produces a new `Node[]` array every time.
This is the root amplifier — one node property change fans out to every consumer of the parent's connections.

**Downstream impact**: Every `useConnections`, `useFilteredItems`, `useActions`,
`createItemPropsFamily`, and `createChildIdsFamily` that reads this connection.

### Rank 2 — `NavTree` component (`NavTree.tsx:19-56`)

**Trigger**: Any root connection change.

Calls `useFilteredItems` **4 times** on the same root node (dispositions: `menu`, `workspace`, `pin-end`, `user-account`).
Each call subscribes to `graph.connections(root.id)` independently.
When ANY root connection changes, all 4 subscriptions fire, all 4 `useMemo`s recompute (producing new arrays),
and NavTree re-renders.

**Downstream impact**: Re-renders L0Menu with new `topLevelItems`, `pinnedItems`, `menuActions`.
Re-renders L1Tabs with new `topLevelItems`. Every L0Item receives potentially new `item` prop.

### Rank 3 — `createChildIdsFamily` (`useNavTreeModel.ts:55-64`)

**Trigger**: Any child node property change (not just topology).

Reads `graph.edges(parentId)` AND `graph.node(childId)` for each child to sort by position.
Even when the sort order and IDs are identical, the atom produces a new `string[]` reference.
This triggers `Tree` and `TreeItem` components to re-render.
`Tree` then re-maps ALL children, causing React to diff the entire child list.

**Over-broad dependency**: Depends on every child's node atom (for position sorting),
so any sibling property change triggers full recomputation.

### Rank 4 — `createItemPropsFamily` (`useNavTreeModel.ts:25-52`)

**Trigger**: Node change OR any outbound connection change.

Reads `graph.node(id)` AND `graph.connections(node.id, 'outbound')`.
The connections subscription means: if any grandchild changes, this atom recomputes
and produces a new `{id, parentOf, label, icon, ...}` object.
`useAtomValue` returns the new reference, triggering a TreeItem re-render.

**Over-broad dependency**: Reading connections just to compute `parentOf`
(list of child IDs that are branches) creates a dependency on ALL children and their properties.

### Rank 5 — `TreeItem` / `TreeItemById` (`TreeItem.tsx`)

**Trigger**: 4-5 independent atom subscriptions per tree item.

Each `TreeItem` subscribes to `itemPropsAtom(path)`, `childIdsAtom(item.id)`,
`itemOpenAtom(path)`, `itemCurrentAtom(path)`.
`TreeItemById` additionally subscribes to `itemAtom(id)`.
Any upstream atom change produces a new reference → component re-renders.
While `memo` wraps both components, `TreeItemById`'s `item` prop changes
whenever the node reference changes, bypassing memo.

**Multiplier**: With ~27 visible nodes, that's ~108-135 live atom subscriptions just for the nav tree.

### Rank 6 — `useDeckCompanions` (`plugin-deck`)

**Trigger**: Any root connection change.

`useConnections(graph, Node.RootId)` → `filter().toSorted()` → new array reference.
Any change to root connections triggers a re-render of the deck companion panel.

### Rank 7 — `L1PanelContent` + `useL1MenuActions` (`L1Panel.tsx`)

**Trigger**: Active panel's connection changes.

Both call `useFilteredItems(item, ...)` which subscribes to `graph.connections(item.id)`.
The panel also renders a `Tree` component that subscribes to the space's children via `model.childIds(item.id)`.

## Concrete Trigger Signatures

| Event | Trigger Chain | Re-renders |
|---|---|---|
| New space added | `_edges(root)` → `_connections(root$outbound)` → NavTree (4× useFilteredItems) + Tree (childIds) + useDeckCompanions | NavTree, L0Menu, all L0Items, Tree, new TreeItemById |
| Node label changes | `_node(id)` → `_connections(parent$outbound)` → itemPropsFamily(id) + childIdsFamily(parent) + itemFamily(id) | TreeItem(id), parent Tree (all children diffed), TreeItemById(id) |
| Node position changes | Same as label change, plus sorting may change childIds order | Same, plus potential full child list reorder |
| Action node property change | `_node(id)` → `_connections(parent$outbound)` → `_actions(parent)` | All `useActions` subscribers on the parent |

## Improvement Opportunities

### 1. `_connections` atom — root amplifier

Currently produces a new `Node[]` on every dependency change.
Could be split into `_connectionIds` (topology only, stable strings) and `_connectionNodes` (full objects).
Consumers that only need IDs (like `createChildIdsFamily`) subscribe to the stable ID list,
avoiding cascading re-renders from property changes.

### 2. NavTree — 4× redundant root subscriptions

`useFilteredItems` is called 4 times with the same root but different disposition filters.
Could consolidate into a single `graph.connections(root.id)` subscription
and derive all 4 lists in one `useMemo`.

### 3. `createChildIdsFamily` — over-broad dependencies

Reads `graph.node(childId)` for every child just to sort by position.
Could read `graph.edges(id)` only and maintain a separate position-sorted cache,
or use a position-specific atom to avoid depending on full node state.

### 4. `createItemPropsFamily` — over-broad connections dependency

Reads `graph.connections(node.id, 'outbound')` to compute `parentOf`.
Could read `graph.edges(node.id).outbound` instead (topology only),
then check each child for the branch filter without subscribing to full node state.

### 5. `_actions` — reads full connections

Filters `_connections(id$outbound)` which includes ALL outbound nodes.
A non-action sibling changing triggers recomputation.
Could filter from `_edges` + selective `_node` reads for action-typed nodes only.
