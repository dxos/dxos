---
'@dxos/async': minor
---

Stop exporting `TestStream` from the package's main entry. The helper extends `node:stream`'s `Duplex`, and re-exporting it from the browser-reachable barrel leaked `node:stream` into every browser bundle — with source-first dev resolution (vite + rolldown build system) this threw `Module "node:stream" has been externalized for browser compatibility` at module scope on dev-server boot, hanging the app on the loading screen.

Breaking: import `TestStream` from `@dxos/async/testing` (new Node-only subpath) instead of `@dxos/async`.
