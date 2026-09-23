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
  `AppNodeMatcher.whenDebugGroup` wraps it). Every tool is a global node: there is no per-space
  enumeration in the debug tree. A tool that inspects a space (ECHO inspectors, **Generate objects**)
  resolves the **active workspace's** space at render time, as the devtools containers do today
  through the client's spaces and the deck's active workspace.
- The console and logs become the first two pages under the Debug node (`root/debug/debug/console`,
  `root/debug/debug/logs`), each with a page surface; the title-bar tabs go. A pristine panel
  opens the Debug node with the console selected, as the tabs did.
- Every page under `root/debug` registers its surface on `DebugSurface.Page`
  (`org.dxos.plugin.debug.surface.page`), a role of its own rather than the deck's article role. Its
  data, `DebugSurface.PageData`, carries `onNavigate(nodeId)`, which selects another page:
  `LayoutOperation.Open` cannot reach these nodes, so a page links to another through that callback.
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

### 4. Follow-up: devtools attachment cleanup (phase 2)

Today devtools matches `whenAny(whenRoot, whenNavTreeGroup(system))`, so each page exists twice, and
plugin-debug's generator carries the space in node data. Phase 2 makes `root/debug` the single
attachment: the root-matched duplicate goes, and the space-scoped containers read the active
workspace's space uniformly (one hook, no space in node data). The `Devtools.*` id namespace and
`DevtoolsSurfaces` stay.

### 5. Docking the panel (phase 3)

The floating window is a portal over the whole app. Docked, the panel becomes part of the deck's
layout — a **bottom drawer** across the main content, between the two sidebars, that the planks
shrink to make room for — and it can be floated again.

- **`Main.Drawer`** (`@dxos/react-ui` `Main`): a new part beside `NavigationSidebar` /
  `ComplementarySidebar`. Fixed to the block-end edge of `Main.Content`'s area (inset-inline follows
  the sidebar paddings, inset-block-end `max(0, safe-area)`), height from `--main-drawer-height`,
  a top edge `Splitter`-style resize handle, `data-drawer-state='open'|'closed'`. `Main.Content`
  gains `padding-block-end: var(--main-drawer-height)` (and scroll-padding) when the drawer is
  open, so planks reflow rather than being covered — the same mechanism the sidebars use for
  inline padding.
- **Deck state**: `DeckCapabilities.State` gains `drawerState: 'open' | 'closed'` and the height is
  persisted with the rest of the deck's layout state (not the URL: the drawer is chrome, like the
  sidebars). `LayoutOperation.UpdateDrawer({ state })` mirrors `UpdateSidebar`; fullscreen closes
  it like the sidebars.
- **Surface**: `DeckRole.Drawer` (`org.dxos.plugin.deck.role.drawer`), `limit={1}`; plugin-debug
  contributes `DebugPanel` (Root + Splitter + Sidebar/Main) there. Any plugin can contribute a
  drawer later (assistant trace, a terminal); which one shows is the first match for now.
- **Float ↔ dock**: `debugPanelAspect` gains `mode: 'floating' | 'docked'` (default `docked`).
  The status-bar button toggles the drawer in docked mode and opens the `FloatingPanel` in floating
  mode; the panel's title bar gets a dock/float control that flips the mode and moves the panel —
  the same `DebugPanel.Root` context, so selection and open state carry over.
- **Attention/focus**: the drawer is not a plank — it never takes the deck's attention; keyboard
  escape closes it like the floating window.

Rejected: a floating stage pinned to the bottom edge (content underneath stays covered, no
reflow); a `Splitter` around the deck viewport (the deck's own sizing and the sidebars' padding
already own that axis — a second splitter competes with them).

## Rejected

- Per-space `debug` group (`root/<spaceId>/debug`) or a `spaces/<spaceId>` branch: the panel is
  app-wide and one tree; enumerating spaces duplicates global tools or forces a which-space rule
  into the tree, when the active workspace already answers it.
- plugin-debug depending on plugin-navtree for the model: shares the navtree's persisted open/current
  map (path keys collide) and makes "current" mean the deck's selection.
- Keeping the console/logs tabs beside a "Tools" tab: two navigation systems in one window.
- Docking alternatives — see §5.

## Testing

- `useGraphTreeModel` unit test (plugin-graph): rows for a small graph, hidden filter, group flags.
- plugin-navtree: existing NavTree stories/tests unchanged.
- plugin-debug: `DebugPanel` story with a stub tree (select → article, open persisted); a
  graph-builder test that `root/debug` exists, is hidden, and hosts the console/logs nodes.
- plugin-devtools: graph-builder test rewritten for the `debug` attachment (no URL binding).
- Composer dev server: open the panel, navigate Client → Config, Generate objects; main navtree shows
  no DevTools/Debug section; reload keeps the selection.

## 6. Devtools surfaces: articles and cards (phase 4)

Status: approved 2026-09-16 (chat). Audit: [`AUDIT.md`](./AUDIT.md). Ledger: phase 4 in
[`TASKS.md`](../../../../.agents/projects/plugin-debug/TASKS.md).

### Problem

Three deck companions (`logs`, `spaceObjects`, `devtoolsOverview`) sit beside the debug panel as R0
buttons. `logs` renders the same `LoggerPanel` as the panel's Debug → Logs node. `devtoolsOverview`
renders `@dxos/devtools`' `StatsPanel`: a hand-built accordion (`components/performance/Panel.tsx`) over
thirteen small panels, with open state persisted per panel in localStorage, that only plugin-calls can
extend (through `AppSurface.DevtoolsOverview`). The twenty-six large panels under
`packages/devtools/devtools/src/panels` predate the article container shape and are wrapped one by one
in `plugin-devtools/src/capabilities/react-surface.ts`.

### Design

1. **`deckCompanion.logs` is removed.** The graph extension, the surface, the role in
   `capabilities/index.ts`, its translation key and its `PLUGIN.mdl` mention go. Debug → Logs in the
   panel is the log viewer. `spaceObjects` and `devtoolsOverview` stay.

2. **`@dxos/devtools` layout.** `src/panels/**` moves to `src/containers/panels/**` (subfolders
   `client/echo/halo/mesh/edge` unchanged); `src/components/performance/**` is replaced by
   `src/containers/cards/<Name>Card/` (one folder per card, each with `index.ts`, the component and a
   story) and `src/containers/StatsPanel/`. `components/performance/Panel.tsx` (the accordion item) is
   deleted. The standalone devtools app (`hooks/useRoutes.tsx`, `useSections.tsx`), `devtools-extension`
   and `testbench-app` follow the moved exports; nothing is left behind as a re-export.

3. **Articles (A).** Every large panel is a container in the article shape: `Panel.Root role={role}` →
   optional `Panel.Toolbar` (one `Toolbar.Root` holding the panel's selectors and actions) →
   `Panel.Content asChild` → `ScrollArea.Root/Viewport` (or the table/tree that owns its own scroll).
   Components are renamed `<Name>Article` (`ConfigPanel` → `ConfigArticle`), the suffix the role
   convention prescribes. Space-scoped articles keep `space` as a prop: `@dxos/devtools` stays free of
   the active-workspace hook so the standalone app keeps working, and plugin-devtools' `ActiveSpacePanel`
   adapter resolves the space. `plugin-devtools/src/capabilities/react-surface.ts` registers each one
   under its `Devtools.*` id, threading `role`.

4. **Cards (B).** Each small panel becomes a `<Name>Card`: `Card.Root` → `Card.Header` (icon in the
   leading `Card.Block`, `Card.Title`, an optional control in the trailing block) → `Card.Row`s. A row's
   leading gutter holds a status icon, the centre a label and a value, the trailing gutter a control
   button; rows are compact and never nest a table. A shared `StatCard` composite
   (`src/components/StatCard`: `Root` / `Header` / `Row` / `Content`) renders the header and the
   label/value row so every card reads the same. Cards are
   prop-driven — no card calls a client hook — so each story mounts on fixtures from
   `src/containers/cards/testing/fixtures.ts`. Summary-only panels (Memory, Network) become cards with
   one row per figure; the former `main` row's live toggle moves to the stack's toolbar. The accordion
   and its localStorage state are dropped: the first pass is a plain stack of always-open cards.

5. **The card role.** `AppSurface.DevtoolsOverview` (`org.dxos.role.devtoolsOverview`) is the card
   role. Its data stays `Record<string, unknown>` in app-toolkit; plugin-devtools defines
   `DevtoolsCardData = { stats?: Stats; surfaceProfilerStats?: SurfaceProfilerStats[]; onClearSurfaceProfiler?: () => void }`
   with a type guard, and each card surface filters on the guard and maps its slice in `props`. A
   contributor that ignores the data (plugin-calls) keeps matching. Order is the surface `position`.

6. **The stack.** `StatsPanel` (`@dxos/devtools`, `containers/StatsPanel`) is `Panel.Root` →
   `Panel.Toolbar` (live toggle, refresh) → `Panel.Content asChild` → `ScrollArea` → `Flex column gap`
   of `children`. `DevtoolsOverviewContainer` (plugin-devtools) polls `useStats` once and renders
   `<StatsPanel …><Surface type={AppSurface.DevtoolsOverview} data={cardData} /></StatsPanel>`; the
   standalone app lists the cards as children directly. plugin-debug's compartment `StatsPanel`
   (`AppCapabilities.StatsPanel`) becomes one card per compartment and is contributed to the same role;
   its own `DebugSurface.Stats` role stays for stories-inbox.

7. **Out of scope.** Stories for the article panels (existing ones are kept and renamed); translations
   for the devtools panels; `Devtools.Agent` ids (documented as unimplemented in the audit); a Debug →
   Stats tree node.

### Testing

- `moon run devtools:build`, `plugin-devtools:build`, `plugin-debug:build`, `composer-app:build`, and
  the `app-graph-builder` tests of both plugins (the `logs` companion assertion removed).
- Card stories render on fixtures (`moon run devtools:test-storybook`).
- In Composer: the `devtoolsOverview` companion shows the card stack; the `logs` R0 button is gone; every
  DevTools tree page renders in the panel.
