# @dxos/doc

Opinionated Automerge document wrapper for ECHO.

Provides the `DocAccessor` abstraction — a value binding into an Automerge document at a key path —
and the higher-level patterns built on top of it (text edits, splicing, change subscriptions, and
heads/diff helpers for record synchronization). The accessor is resolved via `createDocAccessor`,
which works identically for in-memory and database-attached objects; `@dxos/echo-client` registers
the concrete provider.
