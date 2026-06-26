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

| Package                                                       | Role                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`@dxos/echo`](../../../packages/core/echo/echo/)             | Types, `Database` interface, Effect `Database.Service`, Query/Filter/Ref/Type/Obj, schema registry surface |
| [`@dxos/echo-db`](../../../packages/core/echo/echo-db/)       | `EchoClient`, `EchoHost`, `EchoDatabaseImpl`, hypergraph, migrations, sync helpers                         |
| [`@dxos/echo-react`](../../../packages/core/echo/echo-react/) | `useQuery`, `useObject`, `useSchema`                                                                       |
| [`@dxos/echo-host`](../../../packages/core/echo/echo-host/)   | Host-side pipeline (`EchoHost`, indexes, services)                                                         |

## Obtaining a `Database`

- **App / client**: `EchoClient.constructDatabase(...)` returns an implementation of [`Database`](../../../packages/core/echo/echo/src/Database.ts) (see [`EchoDatabaseImpl`](../../../packages/core/echo/echo-db/src/proxy-db/database.ts)).
- **Plugins / runtime**: often `space.db` (or equivalent) after space is open—same interface.
- **Tests**: [`EchoTestPeer`](../../../packages/core/echo/echo-db/src/testing/echo-test-builder.ts) builds a client + DB for isolated runs.

## API reference (short)

### Imperative / non-Effect (`Database` instance)

Use the object from `echo-db` / space. Primary entry: [`Database` interface](../../../packages/core/echo/echo/src/Database.ts) (`add`, `remove`, `query`, `getObjectById`, `makeRef`, `flush`, `graph`, `schemaRegistry`).

| Area          | Notes                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Mutations** | `db.add(obj)`, `db.remove(obj)`; mutate proxies in place for field updates.                                                            |
| **Query**     | `db.query(filterOrQuery)` → `QueryResult` with `.subscribe` / `.run()`.                                                                |
| **Lookup**    | `db.getObjectById(id)`, `db.makeRef(dxn)`.                                                                                             |
| **Schema**    | `db.schemaRegistry.query(...)`, registration via graph/registry APIs used in your stack.                                               |
| **Refs**      | [`Ref`](../../../packages/core/echo/echo/src/Ref.ts), [`DXN`](../../../packages/core/echo/echo/src/index.ts) export from `@dxos/echo`. |

[`EchoDatabase`](../../../packages/core/echo/echo-db/src/proxy-db/database.ts) extends this with sync/migrations (`getSyncState`, `runMigrations`, events).

### Effect (`@dxos/echo/Database` module)

The same logical operations are exposed as **Effects** that require **`Database.Service`** in context.

| Export                                                                                                                                                                                 | Purpose                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`Service`](../../../packages/core/echo/echo/src/Database.ts)                                                                                                                          | `Context.Tag` — `yield* Database.Service` → `{ db }`.                                                                                 |
| [`layer(db)`](../../../packages/core/echo/echo/src/Database.ts) / [`notAvailable`](../../../packages/core/echo/echo/src/Database.ts)                                                   | `Layer` for providing or stubbing DB.                                                                                                 |
| [`query`](../../../packages/core/echo/echo/src/Database.ts) / [`runQuery`](../../../packages/core/echo/echo/src/Database.ts)                                                           | Query with service.                                                                                                                   |
| [`schemaQuery`](../../../packages/core/echo/echo/src/Database.ts) / [`runSchemaQuery`](../../../packages/core/echo/echo/src/Database.ts)                                               | Schema registry queries.                                                                                                              |
| [`add`](../../../packages/core/echo/echo/src/Database.ts) / [`remove`](../../../packages/core/echo/echo/src/Database.ts) / [`flush`](../../../packages/core/echo/echo/src/Database.ts) | Mutations / persistence.                                                                                                              |
| [`resolve`](../../../packages/core/echo/echo/src/Database.ts)                                                                                                                          | Resolve `DXN` or `Ref` via graph.                                                                                                     |
| [`load`](../../../packages/core/echo/echo/src/Database.ts)                                                                                                                             | Load `Ref`; use `Effect.catchTag('EntityNotFoundError', …)` when a missing target is acceptable. Does not require `Database.Service`. |

**Wire-up pattern** (operations, agents, composable code):

```ts
import * as Database from '@dxos/echo/Database';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  const objects = yield* Database.query(SomeFilter).run;
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

## Defining ECHO types — class-based syntax

ECHO type declarations use a **class-based syntax** that unifies the runtime schema entity and the TypeScript type into a single declaration. There are two styles.

### Class style (module-level, reusable types)

Use this for every named, exported type declaration. The class simultaneously serves as the schema entity (accessible via static members) and the TypeScript instance type.

```ts
// Object type
export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
) {}

// With additional pipe annotations
export class Collection extends Type.makeObject<Collection>(DXN.make('org.dxos.type.collection', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    objects: Schema.Array(Ref.Ref(Obj.Unknown)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--folder--regular', hue: 'indigo' })),
) {}

// Relation type
export class HasManager extends Type.makeRelation<HasManager>(DXN.make('com.example.type.hasManager', '0.1.0'))({
  source: Person,
  target: Person,
})(Schema.Struct({})) {}
```

**No separate `type X = ...` or `interface X extends ...` is needed.** The class name itself is the TypeScript type for instances.

**`makeObject` signature**: `Type.makeObject<Self>(dxn, options?)(schema)` — the DXN comes first, the schema is the argument to the returned function. The `<Self>` type parameter is the class being declared (forward reference).

**`makeRelation` signature**: `Type.makeRelation<Self>(dxn)({ source, target, id? })(schema)` — three curried calls.

### Pipe style (local / inline, no reuse)

For anonymous, local-only types where you will not refer to the type by name:

```ts
const schema = Type.makeObject(DXN.make('com.example.type.taggedperson', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(ColorAnnotation.set('schema-teal')),
);
```

Note the argument order: the schema is wrapped *inside* `makeObject(dxn)(schema)`, not piped into it. The old `.pipe(Type.makeObject(dxn))` form is **deprecated**.

### Migration guide — old to new

| Old pattern | New pattern |
|-------------|-------------|
| `const X = Schema.Struct({…}).pipe(Type.makeObject(dxn));` | `Type.makeObject(dxn)(Schema.Struct({…}))` (inline) |
| `export const X = …; export type X = Type.InstanceType<typeof X>;` | `export class X extends Type.makeObject<X>(dxn)(schema) {}` |
| `export const X = …; export interface X extends Type.InstanceType<typeof X> {}` | same class pattern |
| `class X extends Type.declareObj<X>()(schema.pipe(Type.makeObject(dxn)))` | `class X extends Type.makeObject<X>(dxn)(schema)` |
| `export const X = …; export type X = Type.InstanceType<typeof X>;` (relation) | `export class X extends Type.makeRelation<X>(dxn)({ source, target })(schema) {}` |

### `Type.InstanceType` — when to use it

After migrating to class syntax, `X` (the class name) IS the TypeScript instance type. You can use `X` directly in function signatures and generic bounds. `Type.InstanceType<typeof X>` is equivalent and acceptable, but the class name alone is preferred for brevity.

```ts
// preferred
export const make = (props: Obj.MakeProps<typeof Person>): Person => Obj.make(Person, props);

// also acceptable
export const make = (props: Obj.MakeProps<typeof Person>): Type.InstanceType<typeof Person> => Obj.make(Person, props);
```

## Related docs in-repo

- Effect runtime patterns: [.cursor/skills/effect/SKILL.md](../effect/SKILL.md).
- DXOS SDK notes: [.agents/sdk/](../../../.agents/sdk/) (follow project conventions there).
