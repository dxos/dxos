# plugin-debug — Tasks

Design: [`packages/plugins/plugin-debug/docs/DESIGN.md`](../../../packages/plugins/plugin-debug/docs/DESIGN.md).

## Phase 1: DebugPanel as a graph application

- [ ] `GraphPath.GroupSegments.debug` / `GroupTypes.debug`; `AppNodeMatcher.whenDebugGroup`.
- [ ] plugin-debug contributes the hidden `root/debug` node plus `console` and `logs` nodes with article surfaces (+ graph-builder test).
- [ ] `useGraphTreeModel` in `@dxos/plugin-graph/hooks` (graph half of `useNavTreeModel`, caller-supplied open/current atoms) + unit test; plugin-navtree's hook becomes a wrapper.
- [ ] `DebugPanel`: view state `{ nodeId, open, position, size }`; `Splitter` with `Sidebar` (Tree over `root/debug`) and `Main` (article surface, console/logs kept mounted); `Tablist` removed; `DebugPanelStatus` recomposed.
- [ ] `DebugPanel` story with a stub debug tree (select → article; open state persisted).
- [ ] Devtools and debug trees move from the `system` group to `root/debug`; URL bindings from #13087 removed; devtools graph-builder test rewritten.
- [ ] Verify in Composer: panel navigation, no DevTools/Debug in the main navtree, selection survives reload.
- [ ] `PLUGIN.mdl` (plugin-debug, plugin-devtools) updated to the as-built shape; PR.

## Phase 2: devtools attachment cleanup

- [ ] Split the devtools tree: global pages directly under `root/debug`; space pages under `root/debug/spaces/<spaceId>` with the space as node data (`AppNodeMatcher.whenDebugSpace`).
- [ ] Remove the root-matched duplicate (`root/devtools/...`) and the `whenAny(whenRoot, …)` match.
- [ ] Space-scoped containers take the space from node data rather than the active workspace.
