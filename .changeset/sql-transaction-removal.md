---
'@dxos/sql-sqlite': minor
---

Remove the `SqlTransaction` service, on effect `4.0.0-rc.115`.

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
