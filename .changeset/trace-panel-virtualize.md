---
'@dxos/react-ui-trace': patch
'@dxos/react-ui-syntax-highlighter': patch
'@dxos/react-ui-editor': patch
'@dxos/ui-editor': patch
---

Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `Mosaic.VirtualStack`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. `@dxos/react-ui-trace/headless` is a new UI-free entrypoint for the graph, span tree and ASCII printer.
