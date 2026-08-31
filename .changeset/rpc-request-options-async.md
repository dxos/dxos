---
'@dxos/async': minor
---

`RequestOptions` moves to `@dxos/async`. It is the `{ timeout?: number; ctx?: Context }` object threaded through generated RPC service stubs — per-call timeout and trace plumbing, not protobuf encoding options — so it is re-homed rather than retired as part of the protobuf.js to buf migration, following `Stream`, which moved the same way.

**Breaking:** `@dxos/codec-protobuf` no longer exports `RequestOptions`; import it from `@dxos/async` instead. No compatibility re-export is left behind. `@dxos/protobuf-compiler` now emits `import type { RequestOptions, Stream } from '@dxos/async'` into every generated service stub, so regenerated protos pick the new home up automatically. `@dxos/client-protocol` drops its `@dxos/codec-protobuf` dependency, which this change made unused.
