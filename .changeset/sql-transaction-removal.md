---
'@dxos/sql-sqlite': major
---

Remove the `SqlTransaction` service. It existed because `@effect/sql-sqlite-do`'s client could not
transact inside a Durable Object — its `withTransaction` emitted literal `BEGIN` / `COMMIT`, which
workerd forbids — so each platform supplied its own implementation and stores carried
`SqlTransaction` alongside `SqlClient` in their requirements.

effect `4.0.0-rc.115` fixes this upstream: a DO client built with `storage: ctx.storage` (rather
than `db: ctx.storage.sql`) backs `SqlClient.withTransaction` with `ctx.storage.transaction()`.

Migration: use `sql.withTransaction` in place of the service, and drop `SqlTransaction.layer` and
`SqlTransaction.clientLayer` from layer stacks — a store's `migrate` and every transactional method
now require only `SqlClient`. A Durable Object must build its client with `storage`; built with
`db` alone, the client rejects transactions up front.
