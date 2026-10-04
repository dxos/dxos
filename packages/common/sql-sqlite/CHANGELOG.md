# @dxos/sql-sqlite

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
