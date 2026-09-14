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

- [ ] `root/debug` is the single attachment: remove the root-matched duplicate (`root/devtools/...`) and the `whenAny(whenRoot, …)` match; the ECHO inspectors read the active workspace's space through the same shared hook the generator uses.
