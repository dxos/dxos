# @dxos/sql-sqlite

## 0.17.0

### Patch Changes

- ad3d5e0: OPFS SQLite connections raise the page cache from SQLite's 2 MB default to 32 MiB (`PRAGMA cache_size`), so repeat queries on a large database read cached pages instead of re-reading them from OPFS. The cache grows only as pages are read, so a smaller database costs only its own size.
- @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/errors@0.17.0
  - @dxos/node-std@0.17.0

## 0.16.0

### Patch Changes

- @dxos/effect@0.16.0
  - @dxos/errors@0.16.0
  - @dxos/log@0.16.0
  - @dxos/node-std@0.16.0

## 0.15.0

### Patch Changes

- cd70a43: Move Effect from 4.0.0 to 4.0.4. In 4.0.0, `PartitionedSemaphore` lost its only permit once about a thousand waiters were queued, because each release resumed the next waiter on the same stack until it overflowed. The OPFS SQLite client guards its connection with that semaphore, so a statement backlog behind one index transaction left every later statement and query waiting forever.

  Effect 4.0.4 follows the current OpenTelemetry GenAI conventions, so model-call spans carry the serving product as `gen_ai.provider.name` instead of `gen_ai.system`. `ChatCompletionsAdapter` reports it under the new key, and `AiObservability` reads it from there, so `$ai_provider` on PostHog events keeps its value. `ChatCompletionsClientConfig.provider` is now required: it no longer falls back to the API format, which named an OpenAI-compatible server `openai`.

  The `effect` patch is dropped: 4.0.4 ships the `DecisionModel` image support it added.

- 1e9c017: `IndexEngine` writes each batch over transactions of at most 250 objects or 50 ms, set with the new `transactionLimits` option, and calls an optional `yieldBetweenTransactions` hook between them; a document's cursor advances only with its last object. The OPFS SQLite client now hands its connection to the longest waiter when a transaction ends, so a statement queued behind a transaction runs before the same writer's next one. `EchoHost` pauses between index transactions and full-text batches with the new `yieldBehindQueuedTasks`, which lets messages already queued in the worker run first, unlike `scheduler.yield`. A query issued during a large index pass now waits behind one bounded transaction instead of the whole pass.
- 6d8c4ee: `@dxos/sql-sqlite/SqlStorage` gains a `workerd` variant, so a Cloudflare Worker bundle no longer carries wa-sqlite (about 190 KB of a bundle that imports `@dxos/pipeline-rdf`). wa-sqlite could not run there anyway, because a Worker bundle has no way to ship its wasm. In workerd, `makeMemory` and `makeFile` fail with a `SqlError` that names a Durable Object's `ctx.storage.sql` as the database to pass instead.
- @dxos/effect@0.15.0
  - @dxos/errors@0.15.0
  - @dxos/log@0.15.0
  - @dxos/node-std@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [1819960]
  - @dxos/effect@0.14.0
  - @dxos/errors@0.14.0
  - @dxos/log@0.14.0
  - @dxos/node-std@0.14.0

## 0.13.0

### Patch Changes

- @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/errors@0.13.0
  - @dxos/node-std@0.13.0

## 0.12.0

### Minor Changes

- df93cc2: Add `SqlMigrations` for executing multi-statement SQL scripts.

  Every SQLite schema in the repo now ships as numbered `.sql` migration files recorded in a per-store history table rather than as inline DDL — 18 stores across `@dxos/feed`, `@dxos/index-core`, `@dxos/echo-host`, `@dxos/client-services`, `@dxos/keyring`, `@dxos/teleport-extension-object-sync`, `@dxos/crawler`, `@dxos/pipeline-rdf` and `@dxos/pipeline-discord`. Existing databases are unaffected: the initial migration of each store is idempotent, so it applies to a database created by an earlier release as a recorded no-op with rows preserved.

- 74acdc6: Remove the `SqlTransaction` service, on effect `4.0.0-rc.115`.

  **Breaking (`@dxos/sql-sqlite`):** `SqlTransaction` is gone, along with its `layer` and
  `clientLayer`. It existed because `@effect/sql-sqlite-do`'s client could not transact inside a
  Durable Object — its `withTransaction` emitted literal `BEGIN` / `COMMIT`, which workerd forbids —
  so each platform supplied its own implementation and stores carried `SqlTransaction` alongside
  `SqlClient` in their requirements. rc.115 fixes this upstream: a DO client built with
  `storage: ctx.storage` (rather than `db: ctx.storage.sql`) backs `SqlClient.withTransaction` with
  `ctx.storage.transaction()`. Use `sql.withTransaction` in place of the service and drop
  `SqlTransaction.layer` / `SqlTransaction.clientLayer` from layer stacks — a store's `migrate` and
  every transactional method now require only `SqlClient`. A Durable Object must build its client
  with `storage`; built with `db` alone, the client rejects transactions up front.

  **Breaking (`@dxos/rpc`):** `RpcSerialization.msgPack` was removed upstream, so the `RpcPort`
  protocols no longer hard-code msgpack. `layerProtocolRpcPortClient` / `layerProtocolRpcPortServer`
  are unchanged for callers — they now supply `RpcSerialization.layerSchemaBinary()` themselves —
  while `makeProtocolRpcPortClient` / `makeProtocolRpcPortServer` take the format from the ambient
  `RpcSerialization` and require it, so a caller composing them directly must provide a binary one.
  The wire format changes with it; both ends of a port are built from the same version, so this only
  matters to a peer pinned to an older build.

  **`@dxos/echo`:** the JSON Schema a type serializes to states a struct closed
  (`additionalProperties: false`) and keeps a number's `multipleOf`, `minimum` and other checks,
  both of which the new upstream serializer would otherwise have dropped.

  **`@dxos/mcp-server`:** a tool that takes no input declares `NoParameters` rather than an empty
  struct — effect's MCP server now rejects a tool schema that states no `type` — and a row omits an
  unresolved optional field instead of carrying it as `undefined`, which MCP's structured content
  rejects.

### Patch Changes

- 7575cb6: Make a crashed process diagnosable from a user-submitted debug bundle.

  A failed process logged `lifecycle: failed` at `debug` with only `Cause.pretty` text, and the deferred `ctx.fail` path logged nothing about the cause at all — so a crashed agent turn left no error-level line to find. Both paths now report at `error` and carry the failing `Error`/defect itself, so the record keeps the message, stack, and nested causes that `Cause.pretty` flattens away.

  `sqlite query` moves from `debug` to `trace` unless the query took at least 20 ms. The persistent log store drops `trace`, and this one line was 80% of a 50 MB feedback upload — enough to cut the retained window to under nine minutes and evict the failure being reported. Slow queries, the ones worth diagnosing after the fact, still log at `debug`. Use `DX_LOG=trace` or a per-file filter to see every query locally; the DevTools `performance.measure` track is unchanged.

- 4aa6a33: MCP servers speak protocol revision 2026-07-28, which carries the client's identity and requested
  revision in each request rather than in a session opened by `initialize`. Effect moves to
  4.0.0-rc.117 for it. 2025-06-18 is still served, and everything it needs sits in `legacy-*` modules
  or under a marker naming the surface that must drop it, so removing that support later is deletion.

  `McpServer.normalizeResponse` takes the request, so a reply Effect framed as an event stream
  collapses back to its single JSON message, and a notification-only reply answers 202.
  `$mcp_initialize` is recorded once per successful handshake on either revision, and every MCP event
  carries a client name. `@dxos/log` gains a `noop` processor, which a server whose stdout carries a
  protocol selects so it logs only through the processors observability installs.

- b1bb838: DevTools track entries are now off in production builds. `Performance.addTrackEntry` and the new imperative `Performance.trackEntry` put an entry on the performance timeline only under the dev server, or in a build made with `VITE_PERF_TRACK_ENTRIES=true`; the bundler folds the gate, so a gated site disappears from a build that has it off. Both bound what goes into `detail` with `Performance.summarizeDetail`, since `performance.measure` clones it in full and keeps every entry for the life of the realm.

  `@dxos/sql-sqlite` records its per-statement entry through that helper, with bound parameters reduced the same way its log line already reduces them, from both the in-process client and the MessagePort worker. Measured on a loaded Composer profile, the per-query entries were the largest allocating mechanism left in the tab.

- a24c7fb: The OPFS SQLite client now counts the bytes and operations it performs against storage, exposed as `getSqliteIoStats()` and published on `globalThis.__dxosSqliteIo` for out-of-realm readers such as a measurement harness. Counting is unconditional and costs two integer increments per VFS call.
- 09fedd7: Fix SQLite reads failing with `RangeError: Bad value` in long-running Safari 18 (WebKit) workers. The wa-sqlite module now decodes strings through a `TextDecoder` it replaces before WebKit's per-instance 2 GiB running total is reached, and a row that still fails to decode logs the column name, storage class and byte length that raised it.
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [fd23a8b]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [882ac2a]
- Updated dependencies [4aa6a33]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [4da1052]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/log@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f6a01e3]
  - @dxos/log@0.11.0
  - @dxos/node-std@0.11.0
