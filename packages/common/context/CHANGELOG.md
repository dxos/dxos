# @dxos/context

## 0.12.0

### Patch Changes

- 56276cd: `StackTrace` now detects whether the engine prefixes `error.stack` with a header line instead of
  assuming V8's format. JavaScriptCore — Safari, and tauri's WKWebView — emits no header, so a
  constant offset dropped one real frame too many there and returned nothing at all on a shallow
  stack. `Context.onDispose`'s memory-leak warning read frame `[0]` of that empty result, so on those
  engines the diagnostic threw out of `onDispose` and broke the caller's teardown instead of
  reporting the leak. The call site also tolerates a missing stack, which no engine guarantees.
- Updated dependencies [967b130]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/node-std@0.11.0
