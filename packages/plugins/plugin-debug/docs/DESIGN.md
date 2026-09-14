# DebugPanel as a graph application

Status: approved design, 2026-09-14. Ledger: [`.agents/projects/plugin-debug/TASKS.md`](../../../../.agents/projects/plugin-debug/TASKS.md).

## Problem

The floating debug panel is two fixed tabs (console, logs). Every other developer tool — devtools'
client/halo/echo/mesh/edge inspectors, the app-graph browser, the CLI, plugin-debug's object
generator — hangs off the main navtree under each space's **System** group, so it opens as a deck
plank, needs a URL binding, and mixes into the user's workspace. Devtools also attaches the same tree
to the graph root, so each page exists twice (`root/devtools/...` and `root/<spaceId>/system/devtools/...`).

## Design

### 1. A hidden `debug` category on the graph root

- `GraphPath.GroupSegments.debug = 'debug'`, `GraphPath.GroupTypes.debug = 'org.dxos.navtree.group.debug'`.
- plugin-debug contributes one node `root/debug` (type `GroupTypes.debug`, `data: null`,
  `disposition: 'hidden'`, not draggable/droppable). `hidden` is what the main navtree already
  filters, so nothing else has to learn about the category. It is a root child, not a per-space
  group: the debug tree has one root and no "which space" question.
- Tool plugins attach with `GraphNodeMatcher.whenNodeType(GraphPath.GroupTypes.debug)` (a new
  `AppNodeMatcher.whenDebugGroup` wraps it). Global tools (client, HALO, mesh, edge, app graph, CLI,
  tools explorer) are direct children. Per-space tools live under `root/debug/spaces/<spaceId>`:
  a `spaces` branch whose children are one node per space (label = space name, data = the space),
  and space-scoped tools (ECHO inspectors, **Generate objects**) attach to those via
  `AppNodeMatcher.whenDebugSpace`. This is the structure the follow-up cleanup (§4) completes; the
  first PR moves the existing trees wholesale.
- The console and logs become the first two nodes of the tree (`root/debug/console`,
  `root/debug/logs`), each with an `article` surface; the title-bar tabs go.
- Nothing under `root/debug` declares a URL binding. The devtools bindings added in #13087 and the
  `system`-group attachment are removed with the move; devtools pages are reachable only through
  the panel. (The `home` boot-time "no URL binding" log is a deck race and out of scope.)

### 2. A shared graph-backed tree model

`Tree` (react-ui-list) renders any `TreeModel` — five atom families. plugin-navtree's
`useNavTreeModel` is the only mapping of the app graph onto it and is private. Split it:

- `@dxos/plugin-graph/hooks` gains `useGraphTreeModel(rootId, { itemOpen, itemCurrent, isVisible? })`:
  the graph half (`item`, `childIds`, `itemProps` — node → row props, hidden-node filter, group
  handling) with the two state families supplied by the caller. `isVisible` lets plugin-navtree keep
  its plank-companion filter without plugin-graph depending on plugin-deck.
- plugin-navtree's `useNavTreeModel` becomes a thin wrapper passing its persisted
  `NavTreeCapabilities.State` atoms. Behaviour unchanged; navtree stories are the regression check.
- plugin-debug passes atoms derived from its own view state (below).

### 3. The panel

```
FloatingPanel
└─ DebugPanel.Root (view state: selected nodeId, open paths, position, size)
   └─ Splitter.Root (horizontal, anchor start, resizable, ~16rem default)
      ├─ DebugPanel.Sidebar  — Tree over root/debug (useGraphTreeModel)
      └─ DebugPanel.Main     — Surface role='article' for the selected node's data
```

- `DebugPanelViewState` replaces `tab` with `nodeId?: string` and `open: string[]` (path keys).
  Selection and expansion never touch the deck, attention, or the URL: selecting a row sets
  `nodeId` and `AppGraph.expandSync`s it; a row with `data: null` (a branch) toggles instead.
- Main pane: `Surface type=AppSurface.Article data={{ subject: node.data }}`; the console and log
  viewer stay mounted via a `keepMounted` map so neither loses state when another node is shown.
  Existing devtools/debug article surfaces render as they do in a plank. Empty selection → `Empty`.
- Actions on a node (e.g. the generator's toolbar) keep working: they are part of the article.
- `DebugPanel.Tablist` is deleted; `DebugPanelStatus` composes `Root` + `Splitter` under the
  existing title bar. The story renders the same composition without the floating window, with a
  `StubDevtoolsPlugin`-style extension contributing a few debug nodes so the tree is populated.

### 4. Follow-up: root-vs-space attachment cleanup (phase 2)

Today devtools matches `whenAny(whenRoot, whenNavTreeGroup(system))` and every page carries
`space`-agnostic data even when it inspects a space. Phase 2 splits the tree as §1 describes:
global pages under `root/debug`, space pages under `root/debug/spaces/<spaceId>` with the space as
node data, and the duplicate root-matched copy removed. The `Devtools.*` id namespace and
`DevtoolsSurfaces` stay; only the graph extension and the space-scoped containers' props change.

## Rejected

- Per-space `debug` group (`root/<spaceId>/debug`): the panel is app-wide; it would need an
  active-space rule and global tools would be duplicated per space.
- plugin-debug depending on plugin-navtree for the model: shares the navtree's persisted open/current
  map (path keys collide) and makes "current" mean the deck's selection.
- Keeping the console/logs tabs beside a "Tools" tab: two navigation systems in one window.

## Testing

- `useGraphTreeModel` unit test (plugin-graph): rows for a small graph, hidden filter, group flags.
- plugin-navtree: existing NavTree stories/tests unchanged.
- plugin-debug: `DebugPanel` story with a stub tree (select → article, open persisted); a
  graph-builder test that `root/debug` exists, is hidden, and hosts the console/logs nodes.
- plugin-devtools: graph-builder test rewritten for the `debug` attachment (no URL binding).
- Composer dev server: open the panel, navigate Client → Config, Generate objects; main navtree shows
  no DevTools/Debug section; reload keeps the selection.
