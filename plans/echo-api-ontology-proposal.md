# ECHO API Ontology Proposal

Moved from `packages/core/echo/echo/API.md` on 2026-03-09.

## Principles

- Separation of APIs to work with data (Entity, Obj, Relation, Feed) and APIs to introspect schema (Type). **DONE**
- Symetry of names used to define schema, and names used to specify TypeScript types. **DONE**

```ts
const Mailbox = Schema.Struct({
  messages: Ref.Ref(Feed.Feed)
}).pipe(Type.object({ typename: 'example.com/type/Mailbox', version: '0.1.0' }));
interface Mailbox extends Schema.Schema.Type<typeof Mailbox> {}

typeof mailbox.messages === Feed.Feed;

const Collection = Schema.Struct({
  objects: Schema.Array(Ref.Ref(Obj.Unknown))
}).pipe(Type.relation({ typename: 'example.com/type/Collection', version: '0.1.0' }));
interface Collection extends Schema.Schema.Type<typeof Collection> {}

typeof collection.objects === Obj.Unknown[];

const feed = Feed.make({});
typeof feed === Feed.Feed;
```

- Entity module defines APIs useful for both objects and relations, but Obj and Relation can specialize and alias those APIs. **DONE**
- Snaphots are deined as a higher-order type so that a snapshot type can be derived any type. **DONE**

```ts
Entity.Snapshot<Person>;
Entity.Snapshot<Relation.AnchoredTo>;
Entity.Snapshot<Obj.Unknown>;
Entity.Snapshot<Entity.Unknown>;
```

- Snapshots cannot be mutated or used with `db.add` or `db.remove`. **DONE** (snapshots are branded with `SnapshotKindId` and are structurally incompatible with mutable APIs)

## `Type` module

Used when working with the schema definitions

Two use-cases:

- Definiting new schema.
- Iterating and introspecting schema.

The types are used when dealing with schema as values.

Types:

- type `Type.Entity<T extends Entity.Unknown>` - instance of a schema for an object or relation of instance type `T`. **NOT DONE** (no `Type.Entity<T>` exists; `Type.AnyEntity` is the union of `AnyObj | AnyRelation`)
- type `Type.UnknownEntity` - instance of a schema for object or relation, but instance type is not known. **NOT DONE** (no `Type.UnknownEntity`; closest is `Type.AnyEntity` which is a union type, not a schema instance)
- type `Type.Obj<T extends Obj.Unknown>` - instance of a schema for an object of instance type `T`. **DONE** (`Type.Obj<T>` exists as an interface)
- type `Type.UnknownObj` - instance of a schema for object, but instance type is not known. **NOT DONE** (named `Type.AnyObj` instead of `Type.UnknownObj`)
- type `Type.Relation<T extends Relation.Unknown>` - instance of a schema for a relation of instance type `T`. **DONE** (`Type.Relation<T, Source, Target>` exists as an interface)
- type `Type.UnknownRelation` - instance of a schema for a relation, but instance type is not known. **NOT DONE** (named `Type.AnyRelation` instead of `Type.UnknownRelation`)
- type `Type.Ref<T>` - instance of a schema for a reference to an object of instance type `T`. **NOT DONE** (lives in `Ref.RefSchema<T>` instead of `Type.Ref<T>`; `Type.AnyRef` exists but is not generic)

Functions:

- function `Type.object(...)` - defines a new object schema; returns `Type.Obj<T>`. **DONE**
- function `Type.relation(...)` - defines a new relation schema; returns `Type.Relation<T>`. **DONE**
- function `Type.get*(schema: Type.UnknownEntity)` - getters for schema metadata. **DONE** (`Type.getTypename`, `Type.getVersion`, `Type.getDXN`, `Type.getMeta`)
- function `Ref.Ref(...)` define a schema for a reference to an object of instance type `T`. **DONE**

Worth mentioning:

- `Type.Obj<Feed.Feed>` - instance of a schema for a Feed object. **DONE** (Feed.Feed schema is created via `Type.object()`)

## `Entity` module

Used when working with instances of objects and relations.

Types:

- type `Entity.Base` - common base type for all entity instances. **NOT DONE** (no `Entity.Base`; `Entity.OfKind<Kind>` serves as the base brand, but is not named `Base`)
- type `Entity.Unknown` - instance of an entity, but properties are not known. **DONE** (`Entity.Unknown` exists as interface extending `OfKind<Kind>`)
- type `Entity.Any` - instance of an entity, but exposes arbitrary properties (on the way to deprecation). **DONE** (`Entity.Any` exists with `[key: string]: unknown`)
- type `Entity.Properties<T extends Entity.Base>` - properties of an entity of instance type `T`. **DONE** (`Entity.Properties<T>` exists, omitting `id`, `KindId`, `Source`, `Target`)
- type `Entity.Snapshot<T extends Entity.Base>` - snapshot of an entity of instance type `T`. Readonly; cannot be mutated with `Obj.change` **PARTIAL** (`Entity.Snapshot` exists as a non-generic interface; generic `Snapshot<T>` is on `Obj.Snapshot<T>` and `Relation.Snapshot<T>` separately, not `Entity.Snapshot<T>`)

## `Obj` module

Used when working with instances of objects.

Types:

- type `Obj.Base` - common base type for all object instances. **NOT DONE** (no `Obj.Base`; the internal `BaseObj` is not exported; closest is `Obj.Unknown`)
- type `Obj.Unknown` - instance of an object, but properties are not known. **DONE**
- type `Obj.Any` - instance of an object, but exposes arbitrary properties (on the way to deprecation). **DONE**
- type `Obj.Properties<T extends Obj.Base>` - properties of an object of instance type `T`. **NOT DONE** (`Obj.Properties` is not exported; `Entity.Properties<T>` exists at the Entity level)
- type `Obj.Snapshot<T extends Obj.Base>` - snapshot of an object of instance type `T`. Readonly; cannot be mutated with `Obj.change` **DONE** (`Obj.Snapshot<T>` exists as a generic type)

Constants:

- constant `Obj.Unknown` - schema that represents an object with unknown properties. **Deliberatly same name as the type.** Used in schema definitions. **NOT DONE** (`Obj.Unknown` is only a type; the runtime schema constant lives at `Type.Obj`)
- constnat `Obj.Meta` - Used in `Obj.make` call to define metadata for the object. **DONE** (`Obj.Meta` is a symbol for passing metadata in `make`)

Functions:

- function `Obj.make(schema: Type.Obj<T>, props: Obj.Properties<T>)` - create a new object of instance type `T`. **DONE**
- function `Obj.snapshot(obj: Obj.Obj<T>)` - get a snapshot of an object of instance type `T`. **DONE** (named `Obj.getSnapshot`)
- function `Obj.change(obj: Obj.Obj<T>, callback: (obj: Obj.Mutable<T>) => void)` - mutate an object of instance type `T`. **DONE**

## `Relation` module

Used when working with instances of relations.

Types:

- type `Relation.Base` - common base type for all relation instances. **NOT DONE** (no `Relation.Base`; the internal `BaseRelation` is not exported)
- type `Relation.Unknown` - instance of a relation, but properties are not known. **DONE**
- type `Relation.Any` - instance of a relation, but exposes arbitrary properties (on the way to deprecation). **NOT DONE** (no `Relation.Any` type exists)
- type `Relation.Source<T extends Relation.Base>` - get source of the relation. **DONE** (named `Relation.SourceOf<T>`)
- type `Relation.Target<T extends Relation.Base>` - get target of the relation. **DONE** (named `Relation.TargetOf<T>`)
- type `Relation.Properties<T extends Relation.Base>` - properties of a relation of instance type `T`. **NOT DONE** (`Relation.Properties` is not exported; `Entity.Properties<T>` exists at the Entity level)
- type `Relation.Snapshot<T extends Relation.Base>` - snapshot of a relation of instance type `T`. Readonly; cannot be mutated with `Relation.change` **DONE** (`Relation.Snapshot<T>` exists as a generic type)

Constants:

- constant `Relation.Unknown` - schema that represents a relation with unknown properties. **Deliberatly same name as the type.** Used in schema definitions. **NOT DONE** (`Relation.Unknown` is only a type; the runtime schema constant lives at `Type.Relation`)
- constant `Relation.Meta` - Used in `Relation.make` call to define metadata for the relation. **DONE** (symbol imported from `internal.MetaId`)
- cosntant `Relation.Source` - Used in `Relation.make` call to define source ofthe relation **DONE** (symbol exported)
- constant `Relation.Target` - Used in `Relation.make` call to define target of the relation. **DONE** (symbol exported)

Functions:

- function `Relation.make(schema: Type.Relation<T>, props: Relation.Properties<T>)` - create a new relation of instance type `T`. **DONE**
- function `Relation.snapshot(relation: Relation.Relation<T>)` - get a snapshot of a relation of instance type `T`. **DONE** (named `Relation.getSnapshot`)
- function `Relation.change(relation: Relation.Relation<T>, callback: (relation: Relation.Mutable<T>) => void)` - mutate a relation of instance type `T`. **DONE**

## `Ref` module

- type `Ref.Ref<T>` - instance of a reference to an object of instance type `T`. **DONE**
- function `Ref.make(object: Obj.Obj<T>)` - create a new reference to an object of instance type `T`. **DONE**

## `Feed` module

Used when working with instances of feeds.

Types:

- type `Feed.Feed` - instance of a feed. **Deliberatly can't type items the feed stores.**. **DONE** (interface extracted from `Schema.Schema.Type<typeof Feed>`)

Constants:

- constant `Feed.Feed` - schema that represents a feed. **Deliberatly same name as the type.** Used in schema definictions and queries. **DONE** (schema created via `Type.object()`)

Functions:

- function `Feed.make(props: Obj.MakeProps<typeof Feed.Feed>)` - create a new feed. **DONE**
- function `Feed.query(query: Query.Any)` - query a feed. **DONE** (effectful: returns `Effect.Effect<QueryResult>`)
- function `Feed.append(feed: Feed.Feed, items: Entity.Unknown[])` - append items to a feed. **DONE** (effectful: returns `Effect.Effect<void, never, Feed.Service>`)

```ts
const Foo = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
}).pipe(Type.object({ typename: 'example.com/type/Foo', version: '0.1.0' }));

Query.select(Filter.type(Feed.Feed));
```

## Query APIs

```ts
// Query scopes:
Database.query(Query.type(Contact)); // Query a database + feeds. BREAKING CHANGE: Currently it only queries feeds.
Database.query(Query.type(Contact).options({ queryFeeds: false })); // Query a database only (no feeds).
Feed.query(Query.type(Contact)); // Query a specific feed.
Database.schemaQuery({ ... }); // Query schema (static and/or stored)

graph.query(Query.type(Contact)); // Query all spaces and feeds.
client.edge.query(Query.type(Contact)); // Query all spaces and feeds from EDGE.

// Query execution:

const result = yield* Database.query(Query.type(Contact)); // QueryResult
result.subscribe(...)
const objects = yield* Database.query(Query.type(Contact)).run;
const object = yield* Database.query(Query.type(Contact)).first;

const result = yield* Database.schemaQuery({ ... }); // SchemaQueryResult
result.subscribe(...)
const schemas = yield* Database.schemaQuery({ ... }).run;
const schema = yield* Database.schemaQuery({ ... }).first;
```

Query API status:

- `Database.query(Query)` - **PARTIAL** (Database.query exists but uses legacy filter-based API; does not accept `Query` objects yet)
- `Feed.query(feed, query)` - **DONE** (effectful)
- `Database.schemaQuery(...)` - **NOT DONE** (no `schemaQuery` API exists)
- `graph.query(Query)` - **NOT DONE** (no cross-space graph query API)
- `client.edge.query(Query)` - **NOT DONE** (no EDGE query API)
- Query execution: `result.subscribe(...)`, `.run`, `.first` - **NOT DONE** (these fluent execution patterns are not yet implemented on Query; QueryResult has `.run()` as a method)
