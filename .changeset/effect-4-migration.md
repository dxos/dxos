---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Migrate the entire monorepo from Effect 3 to Effect 4 (`effect@4.0.0-rc.108`). **This is a breaking change**, carried as a minor because the fixed publish group is pre-1.0.

Every `@dxos` package now builds against the consolidated `effect` package — `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql-*`, `@effect/ai` and `@effect/printer` usages moved to their `effect/unstable/*` counterparts (or were vendored where v4 ships no counterpart). Consumers embedding `@dxos` packages must be on the Effect 4 line: v3 and v4 cannot coexist in one bundle.

Consumer-visible API consequences include: schemas are values rather than extensible classes (statics such as `SpaceId.random` are merged onto the schema value), `Schema`-derived types follow v4 shapes (`Codec`, checks instead of refinement nodes, string annotation keys), and `Either`-based results became `Result`.

The AI tool surface changed with it. An `Operation` now projects to a **dynamic** tool carrying the JSON Schema shown to the model, because v4 describes an Effect-schema tool through the provider's structured-output codec while validating the model's arguments against the untransformed schema — a record was advertised as an array of `[key, value]` pairs but validated as an object, and an optional key was advertised nullable-and-required but validated as absent-or-`T`, so a compliant model was always rejected. Tool arguments are decoded at the execution boundary instead, which is also where a ref supplied as a URI string becomes a `Ref`. Alongside it, an open record (`Schema.Record(String, Any)`) now serializes with an explicit `additionalProperties: true`: v4 omits the keyword when the value type is unconstrained, which made a persisted schema round-trip back as a closed struct that accepted no keys.
