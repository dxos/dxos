# plugin-debug — Tasks

Design: [`packages/plugins/plugin-debug/docs/DESIGN.md`](../../../packages/plugins/plugin-debug/docs/DESIGN.md).

## Phase 1: DebugPanel as a graph application

- [x] `GraphPath.GroupSegments.debug` / `GroupTypes.debug`; `AppNodeMatcher.whenDebugGroup`.
- [x] plugin-debug contributes the hidden `root/debug` node plus `console` and `logs` nodes with article surfaces (+ graph-builder test).
- [x] `useGraphTreeModel` in `@dxos/plugin-graph/hooks` (graph half of `useNavTreeModel`, caller-supplied open/current atoms) + unit test; plugin-navtree's hook becomes a wrapper.
- [x] `DebugPanel`: view state `{ nodeId, open, position, size }`; `Splitter` with `Sidebar` (Tree over `root/debug`) and `Main` (article surface, console/logs kept mounted); `Tablist` removed; `DebugPanelStatus` recomposed.
- [x] `DebugPanel` story with a stub debug tree (select → article; open state persisted).
- [x] Devtools and debug trees move from the `system` group to `root/debug`; URL bindings from #13087 removed; devtools graph-builder test rewritten.
- [x] Space-scoped containers (Generate objects) read the active workspace's space (`useActiveSpace`); no space in node data.
- [x] Verify in Composer: panel navigation, no DevTools/Debug in the main navtree, selection survives reload (2026-09-14, checks 1–6 of the task-6 brief; the floating window's own open/closed state is deliberately not persisted).
- [x] `PLUGIN.mdl` (plugin-debug, plugin-devtools) updated to the as-built shape; PR #13087.

## Phase 2: devtools attachment cleanup

- [x] `root/debug` is the single attachment: remove the root-matched duplicate (`root/devtools/...`) and the `whenAny(whenRoot, …)` match. Landed with phase 1 (commit 67b83e69e4: `createDevtoolsExtension` matches only `AppNodeMatcher.whenDebugGroup`).
- [x] Space-scoped containers (ECHO inspectors, Generate objects) read the active workspace's space through one shared hook; no space in node data. Landed with phase 1 (`useActiveSpace` in `DevtoolsSurfaces.tsx` and `DebugSurfaces.tsx`).

## Phase 3: dock the panel as a deck bottom drawer (design §5)

- [x] `Main.Drawer` in `@dxos/react-ui` (`Main.tsx` + `layout/main.css`): fixed block-end, inline insets
      follow the sidebar states, `--main-drawer-height`, resize handle; `Main.Content` pads block-end
      when open. Story in `Main.stories.tsx`. (`DRAWER_DEFAULT_HEIGHT` 24rem, `MIN` 8, `MAX` 64.)
- [x] Deck state `drawerState` + persisted height; `LayoutOperation.UpdateDrawer`; `DeckContent` renders
      `Main.Drawer` hosting `Surface type={AppSurface.Drawer} limit={1}` (`org.dxos.role.drawer`);
      fullscreen closes it.
- [x] plugin-debug: `debugPanelAspect.mode: 'floating' | 'docked'` (default docked); `DebugPanelStatus`
      toggles the drawer or opens the floating window by mode; dock/float control in both title bars
      (`DebugPanelHeader`); `DebugPanelDrawer` surface for `AppSurface.Drawer`.
- [x] Verify in Composer: toggle from the status bar, resize, planks reflow, float ↔ dock keeps selection,
      fullscreen hides it, reload restores state; stories for `Main.Drawer` and the docked panel
      (2026-09-14 on 5180: opens at 24rem with `main` padding-block-end 384px and the plank's bottom edge
      on the drawer's top; drag to 32rem persists across reload; float/dock keep Console selected;
      fullscreen hides and restores it; sidebar collapse moves inset-inline-start 350px → 72px).
- [x] Escape closes the drawer like the floating window (design §5; final fix wave: `Main.Drawer` closes on an
      unclaimed Escape on its region, `DrawerEscape` story).
- [x] `PLUGIN.mdl` (plugin-debug, plugin-deck) describe the docked panel; PR #13095 body carries the
      "Docked drawer" section.

## Follow-ups

- [ ] `plugin-devtools` `SpaceListSurface`/`SpaceInfoSurface` (`DevtoolsSurfaces.tsx` ~40, ~51) still call `LayoutOperation.Open` with a dotted id (`Devtools.Echo.Space`) that was never a graph path — should `select` in the debug panel instead.
- [ ] Cross-tab: a `mode` change synced through the `storage` event opens/closes the floating window in other tabs (`DebugPanelStatus` mode-edge effect); deck drawer state is per tab.
- [ ] `update-drawer.test.ts` activates `DeckPlugin` headlessly; `UrlHandler` logs `window is not defined` — move to the browser project or contribute only the state module.

## Devtools panels (observed 2026-09-14)

- [x] JSON panels did not scroll — `JsonView` now renders `Syntax.Root/Filter/Viewport/Code`
      (JSONPath filter, `filter={false}` for embedded sections); Storage tree full width with the
      feed detail beneath; SpaceInfo scrolls; Client → Logging renamed Logs; Debug listed before
      DevTools; react-ui-table translations registered so column menus resolve.
- [ ] The `@dxos/devtools` panels hard-code every string (no `useTranslation` anywhere under
      `packages/devtools/devtools/src/panels`): add a `@dxos/devtools` translations resource,
      register it from plugin-devtools, and route the ~30 panels' labels through `t()`.
- [ ] Decide the overlap between DevTools → Client → Logs (client-services log stream via
      `LoggingService.queryLogs`, level/filter, download) and Debug → Logs (react-ui-debug
      `Logger` over the in-page log buffer with per-file levels, recording, persistence).

## Phase 4: devtools surfaces — audit, articles, cards (design §6)

- [x] `packages/plugins/plugin-debug/docs/AUDIT.md`: the three deck companions, the twenty-six large
      panels and the thirteen small panels, by section, with the superset module list (§5).
- [x] Remove `deckCompanion.logs` (graph extension, surface, role list, translation).
- [x] `@dxos/devtools`: `src/panels` → `src/containers/panels`; standalone app, extension and
      testbench imports follow; the `echo` barrel no longer star-exports `SpaceInfoArticle/` and the
      `edge` barrel's `InvocationTraceContainer` resolves to the container.
- [x] Articles: every panel `Panel.Root role` + toolbar + content, renamed `*Article` (`ArticleProps`);
      `KeyringArticle` and `ToolsExplorerContainer` gained the Panel shell; plugin-devtools threads
      `role` through `ActiveSpacePanel` and every surface.
- [x] `StatCard` composite (`components/StatCard`: Root / Header / Row / Content) + story;
      `containers/cards/<Name>Card` for the thirteen small panels with fixtures
      (`cards/testing/fixtures.ts`) and a story each; `components/performance` deleted.
- [x] `StatsPanel` (`containers/StatsPanel`) as the card stack (toolbar: refresh, live toggle);
      `DevtoolsOverviewContainer` renders `AppSurface.DevtoolsOverview` inside it with
      `DevtoolsCardData`; hooks `useEdgeStatus` / `useSwarmTrace` / `useSyncRows` feed the three
      cards that need a client.
- [x] plugin-devtools `react-surface.ts`: articles + one surface per card with `position` 0–12.
- [x] plugin-debug compartment `StatsPanel` as cards, contributed to `AppSurface.DevtoolsOverview` (20).
- [x] plugin-calls `CallDebugPanel` onto `StatCard`; testbench lists the stats cards directly.
- [x] Builds (devtools, plugin-devtools, plugin-debug, plugin-calls, testbench-app, storybook-testing),
      lint, plugin-debug tests (24), plugin-devtools tests, devtools type tests; `PLUGIN.mdl` (debug,
      devtools) updated; changeset `.changeset/devtools-articles-and-cards.md`.
- [x] Verify in Composer (2026-09-16, dev server from this worktree, Debug + Devtools enabled from the
      Labs registry): the companion tabs are help / search / trace / samplePanel / devtoolsOverview /
      spaceObjects (no `logs`); the Stats companion renders the stack and its Surfaces card lists all
      fourteen card surfaces; DevTools → Client → Config renders as a `role=article` with its toolbar
      in the drawer; console clean apart from an unrelated 401.

### Phase 4 follow-ups (from the audit, §6)

- [ ] `Stats.queries` is never assigned (`useStats`), so the Queries and Query types cards are always
      empty; wire the query stats or drop both cards.
- [ ] `QueuesArticle` has no data source; `InvocationTraceContainer`'s Logs / Raw / Graph tabs read a
      hard-coded empty array.
- [ ] `SwarmArticle` calls `useMembers` in a loop; `useStats` mutates state during render and carries
      two non-null service assertions; `LoggingArticle`, `StorageArticle`, `SignalStatusTable` return
      before hooks.
- [ ] `ConfigArticle` in the plugin keeps the config-mutating Edge selector.
- [ ] Duplication: `ObjectsArticle` / `SchemaArticle` layout; feed-key gathering; JSON download;
      the `props.space ?? state.space` fallback in nine articles; two space selectors.
- [ ] `GithubPanel` (plugin-devtools) is built and exported but never registered; `Devtools.Agent.*`
      ids and the standalone `AGENT` / `/client/tracing` sidebar rows have no page.
- [ ] Stories for the article panels (five of twenty-six have one).
- [ ] Dev-mode icon sprite lags lazily loaded modules: `@dxos/vite-plugin-icons` adds symbols as the dev
      server serves each source file, but the page ingests `/icons.svg` once, so a card module first
      served after boot (opening the Stats companion) shows blank header icons until a reload. Have
      the plugin push a reload (or the registry re-fetch) when new symbols land after the first flush.
- [ ] Group matching surfaces from the caller: `Surface.Surface` renders a role's candidates as a flat
      fragment (`SurfaceComponent.tsx` ~290), so the stats stack cannot section its cards. Add a render
      callback, `children?: (surfaces: Array<{ id; position; node }>) => ReactNode`, that receives the
      matched, position-sorted candidates (each `node` the existing `SurfaceContextProvider`, keyed by
      id) in place of the fragment — Suspense, error boundaries, dev wrappers and metrics unchanged.
      Then group the `DevtoolsOverview` cards in `StatsPanel` by `STAT_CARD_HUES` category. Rejected:
      a `group` field on definitions (puts layout into contributions) and a `useCandidates` hook plus
      per-definition surfaces (duplicates matching in the container).
