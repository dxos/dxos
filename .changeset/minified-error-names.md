---
'@dxos/protocols': patch
---

Errors are now matched by their declared name rather than the class name, so `ProtocolError` and `UnknownProtocolError` decode correctly, stale trigger references park, and the inbox AI gate recognizes a missing model in minified builds. `@dxos/eslint-plugin-rules` adds `no-error-class-name` to flag `SomeError.name` and `constructor.name === '…Error'` checks.
