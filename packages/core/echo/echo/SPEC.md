# @dxos/echo — Module API Spec

Lightweight reference for the modules exported by `@dxos/echo`. This package is
the **public API surface** for ECHO: types, schema, objects/relations, refs,
query/filter, and the Effect `Database` service. Client wiring (`EchoClient`,
`EchoHost`, sync, hypergraph impl) lives in `@dxos/echo-db`; React hooks live in
`@dxos/echo-react`.

Each module is a namespace export. Import the whole surface or a subpath:

```ts
import { Type, Obj, Relation, Ref, Query, Filter } from '@dxos/echo';
// or, for a single module:
import * as Filter from '@dxos/echo/Filter';
```

`DXN`, `EID`, `URI` (from `@dxos/keys`) and `QueryAST` (from `@dxos/echo-protocol`)
are also re-exported at the root.

---

## Core modeling

### `Type` — schema definition & introspection

Defines ECHO types (the runtime schema entity + TypeScript type in one class).

| Export | Purpose |
| --- | --- |
| `Type.makeObject<Self>(dxn, opts?)(schema)` | Declare an object type. |
| `Type.makeRelation<Self>(dxn)({ source, target })(schema)` | Declare a relation type. |
| `Type.makeObjectFromJsonSchema` / `makeRelationFromJsonSchema` | Build a type from JSON Schema. |
| `Type.AnyObj` / `AnyRelation` / `AnyType` / `AnyEntity` | Wildcard schema bounds. |
| `Type.InstanceType<typeof X>` | Instance type of a schema (or use the class name directly). |
| `Type.getURI` / `getTypename` / `getVersion` / `getMeta` | Introspect a schema. |
| `Type.isObject` / `isRelation` / `isType` / `isMutable` | Predicates. |

Prefer the class form for named, reusable types:

```ts
export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}
```

### `Obj` — object instances

The runtime data API for objects (works on objects in or out of a database).

| Export | Purpose |
| --- | --- |
| `Obj.make(Type, props)` | Create an instance. |
| `Obj.Unknown` / `Obj.Any` | Untyped object schema / type. |
| `Obj.MakeProps<typeof T>` | Props type for `make`. |
| `Obj.isObject` / `instanceOf(Type, obj)` / `isDeleted` | Predicates. |
| `Obj.getSchema` / `getDXN` / `getTypename` / `getTypeURI` / `getMeta` | Introspect an instance. |
| `Obj.getSnapshot` / `snapshotOf` / `clone` | Snapshot / copy. |
| `Obj.getValue` / `setValue` / `update` | Path-based read/write & mutation. |
| `Obj.subscribe` | React to changes on a live object. |
| `Obj.toJSON` / `fromJSON` | Serialization. |
| `Obj.Meta` / `Obj.ID` | Symbols / accessors for reserved fields. |

### `Relation` — relation instances

Relations extend `Obj` with typed `source`/`target` endpoints.

| Export | Purpose |
| --- | --- |
| `Relation.make(Type, props)` | Create a relation. |
| `Relation.Source` / `Relation.Target` (symbols) | Reserved endpoint keys. |
| `Relation.getSource` / `getTarget` / `getSourceURI` / `getTargetURI` | Read endpoints. |
| `Relation.isRelation` / `instanceOf` | Predicates. |
| `Relation.Unknown` | Untyped relation. |

### `Ref` — references between entities

| Export | Purpose |
| --- | --- |
| `Ref.Ref(Schema)` | Schema for a typed reference field. |
| `Ref.Array(Schema)` | Schema for an array of refs. |
| `Ref.make(obj)` / `Ref.fromURI(dxn)` | Construct a ref. |
| `Ref.isRef` / `hasEntityId` / `isRefType` | Predicates. |
| `Ref.Target<R>` / `Ref.Resolver` | Target type / resolution interface. |

### `Entity` — shared object/relation base

Kind discrimination (`Entity.Kind.Object` / `Kind.Relation`), `Entity.Unknown`,
`Entity.isEntity`, `Entity.instanceOf` — the common substrate for `Obj` and
`Relation`.

---

## Query

### `Query` — graph-shaped selections

`Query.select(filter)`, `Query.type(Type)`, `Query.from`, `Query.all`,
`Query.without`, `Query.fromAst`, `Query.pretty`. `Query.Any` / `Query.Type<Q>`
are the wildcard / extract types.

### `Filter` — predicates

Building blocks composed into queries: `Filter.type(Type)`, `Filter.props`,
`Filter.id`, `Filter.tag`, `Filter.key`/`foreignKeys`, `Filter.text` (search).
Comparators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `between`,
`childOf`, `not`, `everything`, `nothing`. Time: `created`, `updated`.

### `QueryResult` — result handle

The value returned by `db.query(...)`: `.run()` (one-shot) and `.subscribe(...)`
(reactive). Types for query results and their entries.

### `Order` — result ordering

`Order.natural`, `Order.property(path)`, `Order.rank`, `Order.created`,
`Order.updated`. `Order.Any` is the wildcard.

### `Aggregate` — grouping & reduction

`Aggregate.group`, `Aggregate.count`, `Aggregate.min`, `Aggregate.max`,
`Aggregate.items` with `Aggregate.Spec` / `AggregationResult` helpers.

---

## Database access (Effect)

### `Database` — the DB interface + Effect service

The imperative `Database` interface (`add`, `remove`, `query`, `getObjectById`,
`makeRef`, `flush`, `graph`, `schemaRegistry`) plus the Effect surface:

| Export | Purpose |
| --- | --- |
| `Database.Service` | `Context.Tag` — `yield* Database.Service` → `{ db }`. |
| `Database.layer(db)` / `notAvailable` / `makeService` | Provide or stub the service. |
| `Database.query` / `runQuery` | Query within the service. |
| `Database.schemaQuery` / `runSchemaQuery` | Schema-registry queries. |
| `Database.add` / `remove` / `flush` | Mutations & persistence. |
| `Database.resolve` / `load` | Resolve a `DXN`/`Ref`; `load` doesn't need the service. |
| `Database.spaceId` / `isDatabase` | Introspection / predicate. |

```ts
const program = Effect.gen(function* () {
  return yield* Database.query(SomeFilter).run;
});
await Effect.runPromise(program.pipe(Effect.provide(Database.layer(db))));
```

### `Registry` — schema registry

`Registry.Registry` interface, `Registry.Service` (Effect tag),
`Registry.runQuery`, `Registry.isRegistry`. Registers and resolves schema.

### `Hypergraph` — cross-space object graph

`Hypergraph` interface (extends `Database.Queryable`) plus ref-resolution
context/options — the graph that stitches spaces and resolves refs.

### `Scope` — ambient resolution scopes

`Scope.space`, `Scope.registry`, `Scope.feed` — scope helpers for resolution.

### `Migration` — schema migrations

`Migration.define(...)` with `ObjectMigration` / `ObjectMigrationContext` /
`TransformResult` for object-level migrations.

---

## Values, formats & serialization

### `Text` — collaborative text edits

`Text.update`, `Text.splice`, `Text.apply` over `Text.KeyPath` / `Text.Edit`.

### `Blob` — binary attachments

The `Blob` object type with inline/external storage: `Blob.make`,
`Blob.inlineData`/`externalData`, `Blob.fromBytes`, `Blob.read`, `Blob.exists`,
`Blob.url`, `Blob.MAX_INLINE_SIZE`, storage/scheme enums.

### `Format` — value formats

Format schemas for typed values (string, number, date, object, select).

### `Annotation` — schema annotations

`Annotation.make`/`get`/`set`/`update`/`getFromAst`, `atom`/`atomProperty`, and
dictionary helpers — attach metadata (icons, colors, formats) to schema.

### `Json` / `JsonSchema`

`Json.createRefReplacer` for ref-aware JSON. `JsonSchema.toEffectSchema` /
`toJsonSchema` bridge Effect Schema ↔ JSON Schema.

### `Key`

Identifier types re-exported for convenience: `EntityId`, `SpaceId`, `EID`,
`URI`, `ForeignKey`.

---

## Built-in types

| Module | Type |
| --- | --- |
| `Collection` | `Collection` object (named list of refs); `make`, `isCollection`. |
| `Dataset` | `Dataset` type; `isDataset`. |
| `Feed` | Append-only `Feed` object; `append`, `query`, `sync`, cursors, retention. |
| `Tag` | `Tag` object + list helpers (`findOrCreate`, `sortTags`, …). |
| `View` | `View` / `Projection` over data with field schema helpers. |

---

## Errors

`Err` exports typed domain errors: `EntityNotFoundError`, `SchemaNotFoundError`,
`TextNotSupportedError`, `TextEditNotFoundError`, `BlobTooLargeError`,
`BlobNotAvailableError`, `BlobWriteError`, `GetReactiveError`. Catch by tag in
Effect code (e.g. `Effect.catchTag('EntityNotFoundError', …)`).

---

## Subpaths

- `@dxos/echo` — the modules above.
- `@dxos/echo/internal` — implementation details (not part of the stable API).
- `@dxos/echo/testing` — test builders and fixtures.
- Per-module subpaths (e.g. `@dxos/echo/Filter`, `@dxos/echo/Query`) for
  narrow imports.
