---
'@dxos/react-ui-trace': patch
'@dxos/react-ui-syntax-highlighter': patch
'@dxos/react-ui-editor': patch
'@dxos/ui-editor': patch
'@dxos/react-ui': patch
---

Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `useWindow` from `@dxos/react-ui-virtual`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. The trace panel opens at the top rather than pinned to its tail, behind a fade of one row: `ScrollContainer.Fade` takes `classNames` to size its gradient, and `Accordion.Root` takes `border` (on by default) so a host can drop the frame around its items.
