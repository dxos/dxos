# @dxos/log-store-idb

## 0.12.0

### Minor Changes

- 617b125: `IdbLogStore` fixes: flushes drain through a single loop so a stalled IDB write can no longer wedge later flush triggers while the queue grows unboundedly; the in-memory queue is capped (`maxQueueLines`, oldest lines dropped); eviction failures no longer surface as unhandled rejections; a `versionchange` close drops the cached connection so storage resets aren't blocked. Adds `append()` for enqueuing pre-serialized JSONL lines (used by worker-based log processors).

### Patch Changes

- @dxos/log@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f6a01e3]
  - @dxos/log@0.11.0
