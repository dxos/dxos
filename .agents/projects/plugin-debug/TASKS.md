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

## Follow-ups

- [ ] `plugin-devtools` `SpaceListSurface`/`SpaceInfoSurface` (`DevtoolsSurfaces.tsx` ~40, ~51) still call `LayoutOperation.Open` with a dotted id (`Devtools.Echo.Space`) that was never a graph path — should `select` in the debug panel instead.

## Devtools panels (observed 2026-09-14)

- [x] JSON panels did not scroll — `JsonView` now renders `Syntax.Root/Filter/Viewport/Code`
      (JSONPath filter, `filter={false}` for embedded sections); Storage tree full width with the
      feed detail beneath; SpaceInfo scrolls; Client → Logging renamed Logs; Debug listed before
      DevTools; react-ui-table translations registered so column menus resolve.
- [ ] The `@dxos/devtools` panels hard-code every string (no `useTranslation` anywhere under
      `packages/devtools/devtools/src/panels`): add a `@dxos/devtools` translations resource,
      register it from plugin-devtools, and route the ~30 panels' labels through `t()`.
- [ ] Decide the overlap between DevTools → Client → Logging (client-services log stream via
      `LoggingService.queryLogs`, level/filter, download) and Debug → Logs (react-ui-debug
      `Logger` over the in-page log buffer with per-file levels, recording, persistence).
