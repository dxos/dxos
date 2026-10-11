---
'@dxos/react-ui-debug': minor
---

`Logger.Root` takes an optional `buffer` prop, so a panel can show its own log source: create a `LogBuffer`, feed it with `append(entry)`, and it is filtered, capped and paused like the process-wide `@dxos/log` buffer without registering a log processor.
