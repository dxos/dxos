---
'@dxos/echo': major
'@dxos/plugin-markdown': major
---

Migrate the entire monorepo from Effect 3 to Effect 4 (`effect@4.0.0-beta.105`).

Every `@dxos` package now builds against the consolidated `effect` package — `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql-*`, `@effect/ai` and `@effect/printer` usages moved to their `effect/unstable/*` counterparts (or were vendored where v4 ships no counterpart). Consumers embedding `@dxos` packages must be on the Effect 4 line: v3 and v4 cannot coexist in one bundle.

Consumer-visible API consequences include: schemas are values rather than extensible classes (statics such as `SpaceId.random` are merged onto the schema value), `Schema`-derived types follow v4 shapes (`Codec`, checks instead of refinement nodes, string annotation keys), and `Either`-based results became `Result`.
