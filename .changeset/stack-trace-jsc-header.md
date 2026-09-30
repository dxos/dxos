---
'@dxos/debug': patch
'@dxos/context': patch
---

`StackTrace` now detects whether the engine prefixes `error.stack` with a header line instead of
assuming V8's format. JavaScriptCore — Safari, and tauri's WKWebView — emits no header, so a
constant offset dropped one real frame too many there and returned nothing at all on a shallow
stack. `Context.onDispose`'s memory-leak warning read frame `[0]` of that empty result, so on those
engines the diagnostic threw out of `onDispose` and broke the caller's teardown instead of
reporting the leak. The call site also tolerates a missing stack, which no engine guarantees.
