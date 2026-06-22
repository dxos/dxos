# @dxos/echo-doc

Opinionated Automerge document wrapper for ECHO.

Provides the `Doc.Accessor` abstraction — a value binding into an Automerge document at a key path —
and the higher-level patterns built on top of it (text edits via the `Edit` schema and `applyEdits`,
and `AbstractStoreAdapter` for syncing an id-keyed record map). The accessor is resolved via
`Doc.createAccessor`, which works identically for in-memory and database-attached objects.
