# Debug surfaces audit

Audited 2026-09-16 against `main` at `8608f03c26` (before phase 4). Design: [`DESIGN.md` §6](./DESIGN.md).
Paths are repo-relative; `devtools/` abbreviates `packages/devtools/devtools/src`.

## 1. The surfaces

Composer exposes developer tooling through four surfaces. One is the debug panel; three are deck
companions reached from the complementary sidebar's R0 buttons.

| Surface                                        | Owner           | Renders                                                                                                                                                                                          | Verdict                                                                      |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Debug panel (drawer / floating window)         | plugin-debug    | `DebugPanel`: a `Tree` over the hidden `root/debug` graph category beside an `article` surface for the selected node (§2).                                                                       | Keep. The one navigation for every tool.                                     |
| `org.dxos.role.deckCompanion.logs`             | plugin-debug    | `LoggerPanel` — the `@dxos/react-ui-debug` `Logger` over the in-page log buffer. No props, no data.                                                                                              | **Remove.** Byte-identical to the panel's Debug → Logs page (`logsArticle`). |
| `org.dxos.role.deckCompanion.spaceObjects`     | plugin-debug    | `DebugSpaceObjectsPanel`: `ObjectsTree` over the active space with a JSON detail pane; `mount: 'open'`. Label reads "Database".                                                                  | Keep. Its search field is permanently `disabled` (dead UI).                  |
| `org.dxos.role.deckCompanion.devtoolsOverview` | plugin-devtools | `DevtoolsOverviewContainer` → `@dxos/devtools` `StatsPanel`: an accordion of thirteen small panels plus an `AppSurface.DevtoolsOverview` slot that only plugin-calls fills. Label reads "Stats". | Keep; rewrite as a card stack (§5).                                          |

The `logs` companion is declared in three places: the graph extension `logs`
(`plugin-debug/src/capabilities/app-graph-builder.ts`), the surface `logs` (`react-surface.ts`), and
the role list in `capabilities/index.ts`. Its translation `logs.label` duplicates `logs.tab.label`.
None of the three companion graph extensions is exported, so none is covered by the graph-builder
tests (only `createDebugRootExtension`, `createDebugExtension`, `createDevtoolsExtension` are).

## 2. The debug panel tree

`root/debug` (hidden, `data: null`) holds two children, ordered by `position`:

- **Debug** (plugin-debug, position 0): Console, Logs, Generate objects.
- **DevTools** (plugin-devtools, position 10): App graph, Tools explorer, CLI, then the five subsystem
  groups Client / HALO / ECHO / MESH / EDGE listed in §4. Every leaf's `data` is a `Devtools.*` id
  string and its page is the `article` surface registered for that literal.

The standalone `@dxos/devtools` app (`/devtools` in composer-app, `devtools-extension`,
`testbench-app`) renders the same panels through `hooks/useRoutes.tsx` / `useSections.tsx` with a
router sidebar. Differences between the two hosts:

- Plugin-only: App graph, Tools explorer, CLI, Registry, `echo.schema`, `echo.queues`, the stats
  companion.
- Standalone-only sidebar rows with **no route and no panel**: `/client/tracing`, `/agent/dashboard`,
  `/agent/search`. `Devtools.Agent.{id,Dashboard,Search}` exist in `plugin-devtools/src/types/Devtools.ts`
  and are referenced nowhere else.
- Same panel, different wiring: Traces (standalone `InvocationTracePanel` from `DevtoolsContext`,
  `detailAxis='inline'`; plugin `EdgeTracesSurface` → `InvocationTraceContainer` from `useActiveSpace`,
  `detailAxis='block'`), Testing (standalone passes no `onScriptPluginOpen`, so its button is inert),
  Spaces / Space (router navigation vs `LayoutOperation.Open` with a dotted id that is not a graph path —
  a known dead link).

## 3. A — large panels (`devtools/panels/**`)

Conventions: _Panel_ = `Panel.Root` / `Panel.Toolbar` / `Panel.Content` from `@dxos/react-ui`; every
panel fills its host (`Panel.Root` is `dx-expand`); _space_ = takes `{ space?: Space }` and falls back
to `useDevtoolsState().space`, rendering a `DataSpaceSelector` only when the prop is absent. No panel
in the package calls `useTranslation`; every label is English. Stories exist only where noted.

### Client

| Panel            | Props                             | Data                                                                          | Layout                                                                                                             | Surface / route                              | Notes                                                                                                   |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ConfigPanel      | `vaultSelector?`, `edgeSelector?` | `useConfig()`                                                                 | Panel + `Toolbar.Root` (Vault, Edge selectors) + `JsonView`                                                        | `client.config` / `/client/config`           | Plugin disables the vault selector but leaves the config-mutating Edge selector on.                     |
| StoragePanel     | —                                 | `useDevtools()` storage info, snapshots, feed stream; `SystemService.reset()` | Panel + toolbar + hand-rolled `role=tree` + `ScrollArea` + `Bitbar` + `JsonView`; two rows when a feed is selected | `client.storage` / `/client/storage`         | TODO "rewrite as a table"; returns `null` before a `useState`.                                          |
| SqlitePanel      | —                                 | `useDevtools()` raw SQL; `useFileDownload`                                    | Panel + toolbar; `Panel.Content` as a `[240px_1fr]` grid of two `ScrollArea`s; raw `<table>`                       | `client.sqlite` / `/client/sqlite`           | 648 lines, largest panel.                                                                               |
| LoggingPanel     | —                                 | `LoggingService.queryLogs` via `useStream`; `@dxos/log` filter parsing        | Panel + toolbar (`Select` presets, `Searchbar`, download, clear) + `MasterDetailTable`                             | `client.logs` / `/client/logs`               | Distinct from Debug → Logs: this is the client-services log stream. Conditional-hook hazard at the top. |
| DiagnosticsPanel | —                                 | `client.diagnostics()`, `LoggingService.controlMetrics`, `useFileDownload`    | Panel + toolbar + `JsonView` + `Panel.Statusbar`                                                                   | `client.diagnostics` / `/client/diagnostics` | JSON download boilerplate duplicated with LoggingPanel.                                                 |

### HALO

| Panel            | Props   | Data                                                  | Layout                                            | Surface / route                                                   | Notes                                                                          |
| ---------------- | ------- | ----------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| IdentityPanel    | —       | `useIdentity()`, `useDevices()`                       | Panel + toolbar (`VaultSelector`) + `JsonView`    | `halo.identity` / `/halo/identity`                                |                                                                                |
| DeviceListPanel  | —       | `useDevices()`                                        | Panel + `MasterDetailTable`                       | `halo.devices` / `/halo/devices`                                  |                                                                                |
| KeyringPanel     | —       | `useDevtools().subscribeToKeyringKeys`                | **bare `MasterDetailTable`, no `Panel.Root`**     | `halo.keyring` / `/halo/keyring`                                  | The only panel without the Panel shell.                                        |
| CredentialsPanel | _space_ | `useCredentials({ spaceKey: haloSpaceKey ?? space })` | Panel + conditional toolbar + `MasterDetailTable` | `halo.credentials` (via `ActiveSpacePanel`) / `/halo/credentials` | The one user of the PublicKey-keyed `SpaceSelector` (includes the HALO space). |

### ECHO

| Panel          | Props                                         | Data                                                                             | Layout                                                                                                                  | Surface / route                                     | Notes                                                                                                                                  |
| -------------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| SpaceListPanel | `onSelect?`                                   | `useSpaces({ all })`, export/import, `DialogRestoreSpace`                        | Panel + `DynamicTable` with row actions                                                                                 | `echo.spaces` (`SpaceListSurface`) / `/echo/spaces` | Plugin `onSelect` opens a dotted id — dead link (TASKS follow-up).                                                                     |
| SpaceInfoPanel | _space_, `onSelectFeed?`, `onSelectPipeline?` | `useSpacesInfo`, pipeline observable, edge replication toggle                    | Panel + toolbar + `ScrollArea` of `SpaceProperties`, `PipelineTable`, `FeedTable`, `SyncStateInfo`, `DatabaseStatsInfo` | `echo.space` (`SpaceInfoSurface`) / `/echo/space`   | `SyncStateInfo`/`DatabaseStatsInfo` are named exports; the barrel star-exports the folder **and** lazy-imports it, defeating the lazy. |
| FeedsPanel     | _space_                                       | feed stream, `useFeedMessages`, `useContacts`                                    | Panel + toolbar (`DataSpaceSelector`, `PublicKeySelector`) + `Bitbar` + `MasterDetailTable`                             | `echo.feeds` / `/echo/feeds`                        | Feed-key gathering duplicated with `FeedTable`.                                                                                        |
| ObjectsPanel   | _space_                                       | `useQuery(everything, deleted included)`, edit history / checkout                | Panel + toolbar; `[4fr_3fr]` grid: `DynamicTable` + hand-rolled statusbar / `ObjectViewer` + history                    | `echo.objects` / `/echo/objects`                    | Has a story. ~80 lines structurally identical to SchemaPanel.                                                                          |
| SchemaPanel    | _space_                                       | `space.db.graph.registry` query                                                  | As ObjectsPanel                                                                                                         | `echo.schema` / **no route**                        |                                                                                                                                        |
| AutomergePanel | _space_                                       | `db.getLoadedDocumentHandles()`                                                  | Panel + toolbar + `MasterDetailTable`                                                                                   | `echo.automerge` / `/echo/automerge`                |                                                                                                                                        |
| QueuesPanel    | —                                             | **none** — `const objects: any[] = []`; selector and state imports commented out | Panel + toolbar (orphan `Searchbar`) + `DynamicTable` + JSON pane                                                       | `echo.queues` / **no route**                        | Dead UI: renders an empty table forever.                                                                                               |
| MembersPanel   | _space_                                       | `useMembers`                                                                     | Panel + conditional toolbar + `MasterDetailTable`                                                                       | `echo.members` / `/echo/members`                    |                                                                                                                                        |
| MetadataPanel  | —                                             | `useMetadata()`                                                                  | Panel + `JsonView`                                                                                                      | `echo.metadata` / `/echo/metadata`                  |                                                                                                                                        |
| RegistryPanel  | — (plugin-devtools)                           | `client.graph.registry`                                                          | Panel + toolbar (`Searchbar`); `[2fr_1fr]` grid: `DynamicTable` + `JsonView`                                            | `registry` / plugin only                            |                                                                                                                                        |

### MESH

| Panel        | Props   | Data                                                             | Layout                                                                                     | Surface / route                  | Notes                                                                                        |
| ------------ | ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------- |
| SignalPanel  | —       | composition                                                      | Panel; `Panel.Content` as a `[2fr_5fr]` grid of `SignalStatusTable` + `SignalMessageTable` | `mesh.signal` / `/mesh/signal`   | `SignalMessageTable` (290 lines) has its own `Toolbar.Root` in a raw flex div; story exists. |
| SwarmPanel   | —       | `subscribeToSwarmInfo`, `useSpaces`, `useMembers`                | Panel + `DynamicTable`                                                                     | `mesh.swarm` / `/mesh/swarm`     | **`useMembers` called inside a `for` loop over spaces** — a hook in a loop.                  |
| NetworkPanel | _space_ | `useIdentity`, `useMembers`, `@dxos/react-ui-graph` force layout | Panel + conditional toolbar + `SVG.Root`                                                   | `mesh.network` / `/mesh/network` | Dead `_classes` and a commented `attributes` block.                                          |

### EDGE

| Panel                    | Props                                                                                 | Data                                                                                                  | Layout                                                                                                                  | Surface / route                                         | Notes                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EdgeDashboardPanel       | —                                                                                     | `client.halo.credentials` filtered to `ServiceAccess`                                                 | Panel + `JsonHighlighter`                                                                                               | `edge.dashboard` / `/edge/dashboard`                    |                                                                                                                                                                                             |
| WorkflowPanel            | _space_                                                                               | `useQuery(ComputeGraph)`, `WorkflowLoader`; `WorkflowDebugPanel` builds an Effect layer stack per run | Panel + toolbar (two `ControlledSelector`s); `[4fr_3fr]` grid of `MasterDetailTable` + `WorkflowDebugPanel`             | `edge.workflows` / `/edge/workflows`                    |                                                                                                                                                                                             |
| InvocationTracePanel     | `db?`, `feedDXN?`, `target?`, `detailAxis?`                                           | `useDevtoolsState().space.db` → `InvocationTraceContainer`                                            | delegates                                                                                                               | — / `/edge/traces`                                      | The `edge` barrel exports **`InvocationTraceContainer` as an alias of this panel**; plugin-script, plugin-assistant and storybook-testing import that name and get the context-bound panel. |
| InvocationTraceContainer | `db?`, `feedDXN?`, `showSpaceSelector?`, `target?`, `detailAxis?`, `invocationSpans?` | `useFunctionNameResolver`, `useInvocationSpans`                                                       | `composable` outer div → Panel + conditional toolbar; `Tabs` detail (Input / Logs / Error logs / Raw / Failure / Graph) | `edge.traces` (`EdgeTracesSurface`)                     | Per-invocation trace-event feeds are deprecated: `objects` is hard-coded `[]`, so Logs / Raw / Graph tabs are empty. Story exists.                                                          |
| TestingPanel             | `onScriptPluginOpen?`                                                                 | `useDevtoolsState()`; imports `SyncStateInfo` from the ECHO barrel                                    | Panel + toolbar (`DataSpaceSelector`) + padded flex column                                                              | `edge.testing` (`EdgeTestingSurface`) / `/edge/testing` |                                                                                                                                                                                             |

### Other plugin-devtools containers

| Container              | Surface         | Notes                                                                                                    |
| ---------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| DebugGraph             | `appGraph`      | Filter is a data-shape guard (`isGraphDebug`), not a literal id. Panel + `ScrollArea orientation='all'`. |
| ToolsExplorerContainer | `toolsExplorer` | Returns `ToolsExplorer` bare — no `Panel.Root`.                                                          |
| CliPanel               | `cli`           | Panel + `Terminal`; story exists.                                                                        |
| GithubPanel            | **none**        | Built, exported from `containers/index.ts`, never registered or mounted.                                 |

## 4. B — small panels (`devtools/components/performance/panels/**`)

`StatsPanel.tsx` assembles them inside one `Accordion.Root` whose open ids are persisted per panel
under `org.dxos.plugin.debug.panels/<key>` (a plugin-debug key living in the devtools package). The
`Panel.tsx` item renders a summary-only flex row when it has no children, otherwise an
`Accordion.Item` whose body is clamped to `maxHeight` (default 240px; `0` = unclamped). Data comes
from `hooks/useStats.ts` (`Stats`), refreshed on demand or every 5s when the header's live toggle is on.

| Panel (order)           | Data                                                                | Body                                                                                   | Notes                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| main ("Stats")          | —                                                                   | none; header hosts the live toggle                                                     | Becomes the stack's toolbar.                                                                                                |
| MemoryPanel             | `stats.memory` (`MemoryInfo`)                                       | none — three figures in the header (used, allocated, %; red above 40%)                 |                                                                                                                             |
| NetworkPanel            | `stats.network` (`NetworkStatus`)                                   | none — connection and swarm counts in the header                                       |                                                                                                                             |
| EdgePanel               | `stats.edge`; **own** `useClient` + `client.edge.http.getStatus`    | health table via local `Table` + issues list; refresh and copy buttons inside the body | Emoji ✅/❌ as data; unclamped.                                                                                             |
| PerformancePanel        | `stats.performanceEntries`                                          | hand-rolled `<table>` of every `PerformanceEntry` with `Duration`                      | Returns `null` when empty; unbounded rows, 240px clamp.                                                                     |
| SwarmTracePanel         | **own** `RemoteTraceMonitor` capability + `useSpaces`               | nested `Accordion` of trace messages with `JsonHighlighter`; clear button in the body  | Reads no `Stats`. Capped at 200 messages.                                                                                   |
| SurfaceProfilerPanel    | `surfaceProfilerStats` (from `Surface.useProfilerStats`)            | `<table>` with header; `Select` filter and reset in the body                           | Redeclares `SurfaceProfilerStats` (app-framework has one); its own `Duration` with a 16ms threshold; dead `cursor-pointer`. |
| DatabasePanel           | `stats.database` (`DatabaseInfo`)                                   | local `Table`, 13 fixed rows                                                           |                                                                                                                             |
| ReplicatorPanel         | `stats.database.dataStats.replicator`                               | local `Table`, 6 fixed rows                                                            | Interval suffix duplicated with DatabasePanel.                                                                              |
| ReplicatorMessagesPanel | `…replicator.countByMessage / avgSizeByMessage`                     | local `Table`, two rows per message type                                               | Raw `text-green-500` / `text-orange-500`.                                                                                   |
| QueriesPanel            | `stats.queries` (`QueryInfo[]`)                                     | hand-rolled `<table>`; one cell's JSX is commented out                                 | **`Stats.queries` is never assigned** — permanently empty.                                                                  |
| RawQueriesPanel         | derived from `stats.queries` in `StatsPanel`                        | hand-rolled `<table>` of filter JSON × count                                           | Same dead source; non-null `get(key)!`.                                                                                     |
| SyncStatusPanel         | **own** (`useSyncState`, `useFeedSyncState` called in `StatsPanel`) | `SyncStatus`: copy button + one `SpaceRow` per space (`useSpace` per row)              | `summary` and `debug` props are forwarded and ignored. Only story in the tree (needs a live client).                        |
| TimeSeries              | own `requestAnimationFrame` FPS sampler                             | chart.js streaming line chart                                                          | **Never rendered anywhere.** Carries chart.js + luxon + streaming plugin (~250KB) for an unmounted component.               |
| `{children}`            | —                                                                   | `AppSurface.DevtoolsOverview` slot                                                     | Only plugin-calls contributes (`CallDebugPanel`, which imports the performance `Panel` from `@dxos/devtools`).              |

Third stats store: plugin-debug's `StatsPanel` container renders `AppCapabilities.StatsPanel` (one
compartment per plugin, persisted under `org.dxos.plugin.debug.statsPanel`) through its own role
`org.dxos.plugin.debug.surface.stats`, used by stories-inbox. **No plugin writes a compartment today**
(the one call site, plugin-inbox mail sync, is commented out pending #12225), so it always shows
"No stats yet."

## 5. Superset module list

The union of A and B, by section, as phase 4 lays it out. _Article_ = `Panel.Root role` container under
`devtools/containers/panels/<section>/`; _Card_ = `Card.Root` container under
`devtools/containers/cards/`, contributed to `AppSurface.DevtoolsOverview`.

### App (plugin-devtools only)

| Module         | Kind    | Id                       |
| -------------- | ------- | ------------------------ |
| App graph      | Article | `Devtools.AppGraph`      |
| Tools explorer | Article | `Devtools.ToolsExplorer` |
| CLI            | Article | `Devtools.Cli`           |

### Client

| Module      | Kind    | Id                            |
| ----------- | ------- | ----------------------------- |
| Config      | Article | `Devtools.Client.Config`      |
| Storage     | Article | `Devtools.Client.Storage`     |
| SQLite      | Article | `Devtools.Client.Sqlite`      |
| Logs        | Article | `Devtools.Client.Logs`        |
| Diagnostics | Article | `Devtools.Client.Diagnostics` |

### HALO

| Module      | Kind    | Id                          |
| ----------- | ------- | --------------------------- |
| Identity    | Article | `Devtools.Halo.Identity`    |
| Devices     | Article | `Devtools.Halo.Devices`     |
| Keyring     | Article | `Devtools.Halo.Keyring`     |
| Credentials | Article | `Devtools.Halo.Credentials` |

### ECHO

| Module              | Kind    | Id                        | Notes                                                                         |
| ------------------- | ------- | ------------------------- | ----------------------------------------------------------------------------- |
| Spaces              | Article | `Devtools.Echo.Spaces`    |                                                                               |
| Space               | Article | `Devtools.Echo.Space`     |                                                                               |
| Feeds               | Article | `Devtools.Echo.Feeds`     |                                                                               |
| Objects             | Article | `Devtools.Echo.Objects`   |                                                                               |
| Schema              | Article | `Devtools.Echo.Schema`    |                                                                               |
| Registry            | Article | `Devtools.Echo.Registry`  | plugin-devtools container.                                                    |
| Automerge           | Article | `Devtools.Echo.Automerge` |                                                                               |
| Queues              | Article | `Devtools.Echo.Queues`    | Stub — no data source.                                                        |
| Members             | Article | `Devtools.Echo.Members`   |                                                                               |
| Metadata            | Article | `Devtools.Echo.Metadata`  |                                                                               |
| Database            | Card    | `database`                | storage census + read/write rates                                             |
| Replicator          | Card    | `replicator`              |                                                                               |
| Replicator messages | Card    | `replicatorMessages`      |                                                                               |
| Queries             | Card    | `queries`                 | one row per filter shape, disclosing its queries; source never populated (§4) |
| Sync                | Card    | `sync`                    |                                                                               |

### MESH

| Module      | Kind    | Id                      |
| ----------- | ------- | ----------------------- |
| Signal      | Article | `Devtools.Mesh.Signal`  |
| Swarm       | Article | `Devtools.Mesh.Swarm`   |
| Network     | Article | `Devtools.Mesh.Network` |
| Network     | Card    | `network`               |
| Swarm trace | Card    | `swarm`                 |

### EDGE

| Module    | Kind    | Id                        |
| --------- | ------- | ------------------------- |
| Dashboard | Article | `Devtools.Edge.Dashboard` |
| Workflows | Article | `Devtools.Edge.Workflows` |
| Traces    | Article | `Devtools.Edge.Traces`    |
| Testing   | Article | `Devtools.Edge.Testing`   |
| Edge      | Card    | `edge`                    |

### Runtime (cards only)

| Module           | Kind | Id                | Notes                                         |
| ---------------- | ---- | ----------------- | --------------------------------------------- |
| Memory           | Card | `memory`          |                                               |
| Performance      | Card | `performance`     |                                               |
| Surface profiler | Card | `surfaceProfiler` |                                               |
| Frame rate       | Card | `timeSeries`      | previously unmounted; chart.js loads lazily   |
| Plugin stats     | Card | `debug.stats`     | plugin-debug compartment store, one card each |
| Call             | Card | plugin-calls      | existing contributor; rewritten from `Panel`  |

### Agent

`Devtools.Agent.{Dashboard,Search}` and the standalone `AGENT` sidebar section have no panel, no
surface, no route. Left as documented dead ids; not part of the superset.

## 6. Findings

Dead or unreachable:

1. `deckCompanion.logs` duplicates Debug → Logs (§1). Removed in phase 4.
2. `TimeSeries` never mounted; `Stats.queries` never assigned (Queries, Query types cards render empty);
   `QueuesPanel` has no data source; `InvocationTraceContainer`'s Logs / Raw / Graph tabs read a
   hard-coded empty array; `GithubPanel` is never registered; `Devtools.Agent.*`; standalone rows
   `/client/tracing`, `/agent/*`; `SyncStatusPanel`'s `summary`/`debug` props; `SurfaceProfilerPanel`'s
   click-less `cursor-pointer`; `DebugSpaceObjectsPanel`'s disabled search field; plugin-debug's
   compartment store has no writer.
3. The `edge` barrel exports `InvocationTraceContainer` as an alias of `InvocationTracePanel`. Fixed
   in phase 4 (the name now resolves to the container).
4. The `echo` barrel star-exports `SpaceInfoPanel/` and lazy-imports it, so the chunk is never lazy.
   Fixed in phase 4 (`SyncStateInfo` / `DatabaseStatsInfo` re-exported from their own files).

Defects:

5. `SwarmPanel` calls `useMembers` inside a loop over spaces.
6. `useStats` mutates the state object during render (`stats.database.documents = …`) and carries two
   non-null service assertions; `LoggingPanel`, `StoragePanel`, `SignalStatusTable` return early before
   hooks.
7. `ConfigPanel` in the plugin keeps the Edge selector, which writes config.

Duplication:

8. `ObjectsPanel` / `SchemaPanel` master-detail layout; feed-key gathering (`FeedsPanel`, `FeedTable`);
   JSON download (`DiagnosticsPanel`, `LoggingPanel`); the `props.space ?? state.space` fallback in
   nine panels; two space selectors (`SpaceSelector` used once, `DataSpaceSelector` nine times); two
   `Duration` components with different thresholds; `SurfaceProfilerStats` declared in both devtools
   and app-framework; `getSpaceDisplayName` copied from plugin-space; the interval suffix in
   `DatabasePanel` / `ReplicatorPanel`.

Conventions:

9. No translations anywhere under `devtools/` (open follow-up in `TASKS.md`).
10. Small panels mix four body renderers (local `Table`, hand-rolled `<table>`, nested `Accordion`,
    bespoke list) and two clamp policies; raw palette classes in `ReplicatorMessagesPanel`.
11. `KeyringPanel` and `ToolsExplorerContainer` skip the `Panel.Root` shell; `SignalMessageTable`
    mounts a `Toolbar.Root` outside any panel.
12. Only five of the twenty-six large panels have a story; one of thirteen small panels does, and it
    needs a live client.

## 7. What phase 4 does with this

- Removes the `logs` companion (finding 1).
- Moves `panels/` under `containers/`, fixes the two barrel defects (3, 4), gives `KeyringPanel` and
  `ToolsExplorerContainer` the `Panel.Root` shell (11), and renames the large panels `*Article` with a
  `role` prop.
- Replaces `components/performance/**` with one prop-driven card per small panel, a shared `StatRow`,
  fixtures and a story per card (10, 12); the accordion and its localStorage state go. `CallDebugPanel`
  (plugin-calls) is rewritten onto `Card`.
- Registers every card on `AppSurface.DevtoolsOverview` and every article on its `Devtools.*` id from
  plugin-devtools; plugin-debug contributes its compartment cards to the same role.
- Leaves findings 2 (other than the barrel fixes), 5–9 as recorded follow-ups in `TASKS.md`; the
  dead ids in §5 "Agent" stay documented, not deleted.
