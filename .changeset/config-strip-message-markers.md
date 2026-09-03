---
'@dxos/config': patch
---

`Config` now strips the protobuf-es message markers (`$typeName`, `$unknown`) from every source before merging, so passing an existing message — such as `configPreset(...).values` — no longer produces a `Config.values` that `toBinary` cannot encode.

`lodash.defaultsdeep` copied `$typeName` onto plain objects that came from another source; protobuf-es then treated those objects as already-constructed messages and skipped normalising their plain descendants. The malformed tree failed to serialise across the worker RPC boundary, which is how `SystemService.getConfig()` terminated the renderer under `DEDICATED_WORKER`.
