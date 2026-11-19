---
'@dxos/app-framework': patch
---

Shrink what EDGE loads for every plugin bundle: plugin builds no longer import React into chunks with no CommonJS code or merge shared helpers into browser-only module chunks, `@dxos/echo-client` no longer loads the automerge subduction WASM bindings, and the EDGE plugin host no longer loads every AI provider through the `@dxos/compute-runtime` barrel.
