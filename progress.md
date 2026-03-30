# Progress

## Session log

- Loaded workspace instructions from `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/dxos.mdc`.
- Recorded the debug logging configuration for session `4cdd86` with log file `.cursor/debug-4cdd86.log`.
- Attempted the planning skill session-catchup helper; the referenced script path was not available in this environment.
- Searched for pragmatic drag-and-drop usage and identified navtree and shared list/tree components as the main suspects for the missing indicators in Tauri.
- Read the navtree container, nav sidebar components, and shared tree/list implementations.
- Confirmed that tree drop indicators are driven by `instruction` state inside `react-ui-list` `TreeItem`, so instrumentation should target source registration, target hover, instruction computation, and indicator render state.
- Added debug instrumentation in `packages/ui/react-ui-list/src/components/Tree/TreeItem.tsx` for hypotheses H1-H5.
- Verified the edited file has no IDE lints and compiled `react-ui-list` successfully with `moon run react-ui-list:compile`.
- Attempted to clear `.cursor/debug-4cdd86.log`; it did not exist yet, which is acceptable because the first runtime log write will create it.
- Read the first Tauri reproduction log and confirmed: drag starts, the source item is not within a Tauri drag-region ancestor, but no target ever reaches `canDrop`/instruction computation.
- Added second-round instrumentation for native DOM drag events on tree rows/buttons (`H6`) and a document-level dragover probe (`H7`).
- Recompiled `react-ui-list`, rechecked lints, and cleared `.cursor/debug-4cdd86.log` for the next run.
- Read the next reproduction logs and confirmed that native `dragstart` occurs with an empty `dataTransfer` payload (`types: []`, `items: 0`) before the drag ends, still without any hover/instruction events.
- Inspected the installed pragmatic DnD adapter source and found the supported `getInitialDataForExternal` hook for seeding the native drag store.
- Implemented a native-runtime-only fix in `TreeItem` that seeds `text/plain` via `getInitialDataForExternal`, kept verification instrumentation in place, recompiled successfully, and cleared `.cursor/debug-4cdd86.log` again.
- Researched Tauri + WebKit drag-and-drop behavior and found matching upstream reports that Tauri's file-drop handler can block HTML5 drag-and-drop unless disabled for the window.
- Verified the current `src-tauri/tauri.conf.json` does not disable the Tauri drag-drop handler on the main window.
- Current best next step is a Tauri window/config experiment (`dragDropEnabled: false` / disable drag-drop handler), not more changes inside pragmatic-drag-and-drop integration code.
