---
name: dxos-echo
description: >-
  Guide for ECHO (DXOS object graph / local-first DB). Use when adding or
  changing queries, filters, schema types, Ref/DXN handling, Database service
  layers, EchoClient/space DB access, or React ECHO hooks.
---

# ECHO (DXOS)

ECHO is the typed object graph backed by Automerge: spaces expose a **`Database`** you mutate with reactive proxies and query with **Filter** / **Query** ASTs. Core types and both imperative and Effect-style DB access live in **`@dxos`**. Client wiring (sync, hypergraph, `EchoClient`) is in **`@dxos/echo-db`**.

For **Effect** patterns (Layer, `Effect.gen`, services), read [.cursor/skills/effect/SKILL.md](../effect/SKILL.md).

## Packages (where code lives)

| Package | Role |
| ------- | ---- |
| [`@dxos/echo`](../../../packages/core/echo/echo/) | Types, `Database` interface, Effect `Database.Service`, Query/Filter/Ref/Type/Obj, schema registry surface |
| [`@dxos/echo-db`](../../../packages/core/echo/echo-db/) | `EchoClient`, `EchoHost`, `EchoDatabaseImpl`, hypergraph, migrations, sync helpers |
| [`@dxos/echo-react`](../../../packages/core/echo/echo-react/) | `useQuery`, `useObject`, `useSchema` |
| [`@dxos/echo-pipeline`](../../../packages/core/echo/echo-pipeline/) | Host-side pipeline (`EchoHost`, indexes, services) |

## Obtaining a `Database`

- **App / client**: `EchoClient.constructDatabase(...)` returns an implementation of [`Database`](../../../packages/core/echo/echo/src/Database.ts) (see [`EchoDatabaseImpl`](../../../packages/core/echo/echo-db/src/proxy-db/database.ts)).
- **Plugins / runtime**: often `space.db` (or equivalent) after space is open—same interface.
- **Tests**: [`EchoTestPeer`](../../../packages/core/echo/echo-db/src/testing/echo-test-builder.ts) builds a client + DB for isolated runs.

## API reference (short)

### Imperative / non-Effect (`Database` instance)

Use the object from `echo-db` / space. Primary entry: [`Database` interface](../../../packages/core/echo/echo/src/Database.ts) (`add`, `remove`, `query`, `getObjectById`, `makeRef`, `flush`, `graph`, `schemaRegistry`).

| Area | Notes |
| ---- | ----- |
| **Mutations** | `db.add(obj)`, `db.remove(obj)`; mutate proxies in place for field updates. |
| **Query** | `db.query(filterOrQuery)` → `QueryResult` with `.subscribe` / `.run()`. |
| **Lookup** | `db.getObjectById(id)`, `db.makeRef(dxn)`. |
| **Schema** | `db.schemaRegistry.query(...)`, registration via graph/registry APIs used in your stack. |
| **Refs** | [`Ref`](../../../packages/core/echo/echo/src/Ref.ts), [`DXN`](../../../packages/core/echo/echo/src/index.ts) export from `@dxos/echo`. |

[`EchoDatabase`](../../../packages/core/echo/echo-db/src/proxy-db/database.ts) extends this with sync/migrations (`getSyncState`, `runMigrations`, events).

### Effect (`@dxos/echo/Database` module)

The same logical operations are exposed as **Effects** that require **`Database.Service`** in context.

| Export | Purpose |
| ------ | ------- |
| [`Service`](../../../packages/core/echo/echo/src/Database.ts) | `Context.Tag` — `yield* Database.Service` → `{ db }`. |
| [`layer(db)`](../../../packages/core/echo/echo/src/Database.ts) / [`notAvailable`](../../../packages/core/echo/echo/src/Database.ts) | `Layer` for providing or stubbing DB. |
| [`query`](../../../packages/core/echo/echo/src/Database.ts) / [`runQuery`](../../../packages/core/echo/echo/src/Database.ts) | Query with service. |
| [`schemaQuery`](../../../packages/core/echo/echo/src/Database.ts) / [`runSchemaQuery`](../../../packages/core/echo/echo/src/Database.ts) | Schema registry queries. |
| [`add`](../../../packages/core/echo/echo/src/Database.ts) / [`remove`](../../../packages/core/echo/echo/src/Database.ts) / [`flush`](../../../packages/core/echo/echo/src/Database.ts) | Mutations / persistence. |
| [`resolve`](../../../packages/core/echo/echo/src/Database.ts) | Resolve `DXN` or `Ref` via graph. |
| [`load`](../../../packages/core/echo/echo/src/Database.ts) / [`loadOption`](../../../packages/core/echo/echo/src/Database.ts) | Load `Ref`; `load` / `loadOption` do not require `Database.Service` (see signatures in source). |

**Wire-up pattern** (operations, agents, composable code):

```ts
import * as Database from '@dxos/echo/Database';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  const objects = yield* Database.runQuery(SomeFilter);
  return objects;
});

await Effect.runPromise(program.pipe(Effect.provide(Database.layer(db))));
```

[`Database.layer`](../../../packages/core/echo/echo/src/Database.ts) is the usual bridge from an imperative `db` to Effect code; see plugin operation resolvers for real merges with other layers.

### React (non-Effect, subscription-based)

From **`@dxos/echo-react`**: **`useQuery`**, **`useObject`**, **`useSchema`** — subscribe to query results / single object / schema state in components.

### Query & filter builders

- [`Query`](../../../packages/core/echo/echo/src/Query.ts) — graph-shaped selections (`select`, `reference`, etc.).
- [`Filter`](../../../packages/core/echo/echo/src/Filter.ts) — predicates / props shorthand; types under `Filter.Any`, `Query.Any`.

Prefer importing subpaths when you need one module only, e.g. `@dxos/echo/Filter`, `@dxos/echo/Query` (see [`package.json` exports](../../../packages/core/echo/echo/package.json)).

## When to use which style

- **Imperative `db`**: UI event handlers, existing callback code, small scripts, anything that already holds `db`.
- **Effect `Database.*`**: operation handlers, assistant/toolkit flows, any `Effect` program that should declare `Database.Service` and compose with other layers (see [Effect skill](../effect/SKILL.md)).
- **React hooks**: read-mostly UI and local subscriptions.

## Related docs in-repo

- Effect runtime patterns: [.cursor/skills/effect/SKILL.md](../effect/SKILL.md).
- DXOS SDK notes: [.agents/sdk/](../../../.agents/sdk/) (follow project conventions there).
