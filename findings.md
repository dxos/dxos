# Findings

## Initial discoveries

- Tree drag-and-drop is likely wired in `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx`.
- Individual tree rows likely register as draggable/drop targets in `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx`.
- Shared pragmatic drag-and-drop behavior also exists in `packages/ui/react-ui-list`, which may provide a useful comparison if the navtree code path looks correct.
- The current task is explicitly in debug mode, so no behavioral fix should be made before runtime logs confirm the failing branch.

## Runtime path under investigation

- The tree shown in the nav sidebar uses the shared `Tree` implementation from `packages/ui/react-ui-list/src/components/Tree/TreeItem.tsx`.
- In the actual tree path, drag/drop state is attached to `buttonRef.current` inside `TreeItem`, not to the surrounding panel container.
- The visible tree drop indicator only renders when `TreeItem` sets a non-null `instruction` state.
- The navtree plugin consumes the drop result later in `NavTreeContainer`, but missing hover indicators imply the failure is probably earlier than `onDrop`.
- `data-tauri-drag-region` appears around `L0Menu` and the `L1Panel` header, which is still worth testing because native window drag regions can steal pointer/drag events in Tauri.

## Evidence from first Tauri run

- Drag source registration succeeded for the filesystem tree item and reported `isItemDraggable: true`, `isItemDroppable: true`, with no Tauri drag-region ancestor.
- The drag actually started for that same item.
- No `H3` logs were emitted at all, so no hovered target ever reached instruction computation.
- Only one `H2` log was emitted, and it was the self-target rejection (`sourceId === targetId`) immediately before drag start, so the drag never progressed to real target evaluation.
- This rejects the original "tree item is inside a Tauri drag region" hypothesis and shifts focus to native DOM drag events versus the specific element pragmatic DnD is attached to.

## Evidence from third Tauri run

- Native `dragstart` fires on both the tree button and row, so the drag session exists.
- At native `dragstart`, `dataTransfer.types` is empty, `items` is `0`, and `effectAllowed` is `uninitialized`.
- Native `dragend` still occurs later with `dropEffect: 'copy'`, but no hover/instruction logs occur between start and end.
- The pragmatic adapter source confirms it supports `getInitialDataForExternal`, which writes standard media types into the native drag data store before the adapter starts the drag.
- Root cause hypothesis: Tauri's WKWebView needs a standard native drag payload (for example `text/plain`) for the drag session to continue delivering hover events to internal drop targets; the default pragmatic internal marker alone is insufficient in this environment.

## Research update

- Tauri issue `#2014` documents that HTML5 drag-and-drop can be blocked by Tauri's file-drop handler, and disabling that handler restores DOM `dragover`/drop behavior.
- Tauri issue `#6695` includes multiple later confirmations across macOS/Linux/WebKit-based environments, plus an upstream WebKit bug reference and a workaround that manually sets `dataTransfer.setData('text/plain', ...)` on `dragstart`.
- The app's current `src-tauri/tauri.conf.json` does not set `dragDropEnabled` / `fileDropEnabled` for the main window, so the default Tauri drag-drop handler is likely still active.
- This shifts the strongest hypothesis away from pragmatic-drag-and-drop itself and toward Tauri/wry window-level drag-drop interception, with the `text/plain` payload seeding acting as a secondary workaround rather than the primary fix.
