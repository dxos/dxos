# DXOS ECHO API

## Imports

```ts
import { Schema } from 'effect';
import {
  Annotation, // Schema annotations (labels, descriptions, etc.)
  Database, // Database interface for persistence
  Entity, // Generic entity types & functions (works for both Obj and Relation)
  Feed, // Feed (queue) types & functions
  Filter, // Filter construction for queries
  Obj, // Object types & functions
  Order, // Sort-order construction for queries
  Query, // Query construction
  QueryResult, // Query result types
  Ref, // Reference types & functions
  Relation, // Relation types & functions
  Type, // Schema types and factories
} from '@dxos/echo';
```

---

## Defining Schemas

### Object schemas

```ts
const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
}).pipe(
  Type.object({ typename: 'example.com/type/Person', version: '0.1.0' }),
  Annotation.LabelAnnotation.set(['name']),
);

interface Person extends Schema.Schema.Type<typeof Person> {}
```

### Relation schemas

```ts
const AnchoredTo = Schema.Struct({
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Type.Obj,
    target: Document,
  }),
);

interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}
```

### Reference fields

```ts
const Task = Schema.Struct({
  assignee: Ref.Ref(Person),
  watchers: Ref.Array(Ref.Ref(Person)),
}).pipe(Type.object({ typename: 'example.com/type/Task', version: '0.1.0' }));

interface Task extends Schema.Schema.Type<typeof Task> {}
```

---

## Working with Objects

```ts
// Create
const alice = Obj.make(Person, { name: 'Alice', email: 'alice@example.com' });
const task = Obj.make(Task, {
  [Obj.Meta]: { keys: [{ source: 'external', id: '123' }] },
  title: 'Review PR',
  assignee: Ref.make(alice),
});

// Mutate (batched, single notification)
Obj.change(task, (t) => {
  t.title = 'Updated';
  Obj.setValue(t, ['nested', 0, 'field'], 'value');
});

// Snapshot (frozen point-in-time copy)
const snapshot = Obj.getSnapshot(task);

// Subscribe
const unsub = Obj.subscribe(task, () => console.log('changed'));
```

## Working with Relations

```ts
// Create
const rel = Relation.make(AnchoredTo, {
  [Relation.Source]: sourceObj,
  [Relation.Target]: targetObj,
  anchor: 'section-1',
});

// Mutate
Relation.change(rel, (r) => {
  r.anchor = 'section-2';
});

// Access endpoints
Relation.getSource(rel);
Relation.getTarget(rel);
```

## Querying

```ts
// Build queries
const query = Query.select(Filter.type(Task));
const query2 = Query.type(Task, { completed: false });

// Chaining
query
  .select(Filter.props({ status: 'active' }))
  .reference('assignee')
  .referencedBy(Comment, 'target')
  .sourceOf(AnchoredTo)
  .targetOf(AnchoredTo)
  .source()
  .target()
  .orderBy(Order.property('name', 'asc'))
  .limit(10);

// Combine
Query.all(query1, query2);
Query.without(source, exclude);

// Execute against a database
const result = db.query(Query.type(Task));
const items = await result.run();
result.subscribe((r) => console.log(r.results));
```

## Database Operations

```ts
const db: Database.Database = space.db;

db.add(obj);
db.remove(obj);
db.getObjectById(id);
db.query(Query.type(Task));
db.query(Filter.type(Task));
db.makeRef<Task>(dxn);
await db.flush();
await db.flush({ indexes: true, updates: true });
```

## Feed Operations

```ts
const feed = Feed.make({ name: 'notifications', kind: 'plugin/v1' });

// Effectful operations (require Feed.Service)
yield * Feed.append(feed, [item]);
yield * Feed.remove(feed, [item]);
const result = yield * Feed.query(feed, Filter.type(Person));
const items = yield * Feed.runQuery(feed, Filter.type(Person));
```

## Live Objects vs Snapshots

ECHO has two representations for every object and relation: **live** and **snapshot**.

**Live object** -- A reactive proxy backed by the ECHO database. Reading a property always returns the latest value, including changes made locally, by other parts of the app, or replicated from a remote peer. Live objects can be mutated inside `Obj.change` (or `Relation.change`). Subscribing to a live object (`Obj.subscribe`) fires callbacks whenever any property changes.

**Snapshot** -- An immutable, point-in-time copy of a live object's state. Property values are frozen at the moment the snapshot was created and will never change, regardless of subsequent mutations or remote replication. Snapshots are useful when you need a stable reference to an object's state, for example when rendering a list or computing a diff.

### Type-level distinction

A schema like `Person` is always the _live_ type. Wrap it in `Obj.Snapshot<Person>` (or `Relation.Snapshot<T>` for relations) to get the snapshot type. The two are not assignable to each other -- TypeScript will prevent accidentally mixing them.

```ts
const alice: Person; // live object
const frozen: Obj.Snapshot<Person>; // snapshot -- values never change

alice satisfies Person; // OK
frozen satisfies Obj.Snapshot<Person>; // OK
// frozen satisfies Person;              // TS error -- snapshot is not assignable to live
// alice satisfies Obj.Snapshot<Person>; // TS error -- live is not assignable to snapshot
```

### Creating snapshots

```ts
const snapshot = Obj.getSnapshot(alice); // Obj.Snapshot<Person>
snapshot.name; // string -- frozen value

const relSnap = Relation.getSnapshot(rel); // Relation.Snapshot<AnchoredTo>
```

### What works on snapshots

Read-only operations work identically on both live objects and snapshots:

```ts
Obj.getTypename(snapshot); // 'example.com/type/Person'
Obj.getDXN(snapshot);
Obj.getMeta(snapshot); // returns ReadonlyMeta
Obj.getLabel(snapshot);
Obj.getDescription(snapshot);
Obj.isDeleted(snapshot);
Obj.getValue(snapshot, ['nested', 'path']);
Obj.toJSON(snapshot);
Obj.instanceOf(Person, snapshot); // false -- use snapshotOf for snapshots
Obj.snapshotOf(Person, snapshot); // true

Relation.getSource(relSnap);
Relation.getTarget(relSnap);
Relation.getSourceDXN(relSnap);
Relation.getTargetDXN(relSnap);
```

### What does NOT work on snapshots

Mutation APIs reject snapshots:

```ts
// All of these are type errors and/or throw at runtime:
Obj.change(snapshot, (s) => {
  s.name = 'Bob';
}); // Error
Obj.subscribe(snapshot, () => {}); // Error
Relation.change(relSnap, (r) => {
  r.anchor = 'x';
}); // Error
```

### Getting a live object from a snapshot

Use the snapshot's `id` to query the live object back from the database:

```ts
const live = await db.query(Query.select(Filter.ids(snap.id)).select(Filter.type(Person))).first();
```

---

## API Reference

### `Type` module

Schema definition and introspection.

| Export                                     | Kind       | Description                                                              |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------------ |
| `Type.Obj`                                 | const      | Runtime Effect schema for any ECHO object.                               |
| `Type.Obj<T, Fields>`                      | type       | TypeScript type for an object schema producing instance type `T`.        |
| `Type.AnyObj`                              | type       | Any object schema (structural base, accepts static and mutable schemas). |
| `Type.object(opts)`                        | fn         | Factory: pipes an Effect schema into an ECHO object schema.              |
| `Type.Relation`                            | const      | Runtime Effect schema for any ECHO relation.                             |
| `Type.Relation<T, Source, Target, Fields>` | type       | TypeScript type for a relation schema.                                   |
| `Type.AnyRelation`                         | type       | Any relation schema (structural base).                                   |
| `Type.relation(opts)`                      | fn         | Factory: pipes an Effect schema into an ECHO relation schema.            |
| `Type.AnyEntity`                           | const      | Runtime Effect schema for any entity (union of Obj and Relation).        |
| `Type.AnyEntity`                           | type       | Union type `AnyObj \| AnyRelation`.                                      |
| `Type.AnyRef`                              | type       | Any Ref schema (unknown target type).                                    |
| `Type.RuntimeType`                         | type/const | Dynamic type stored in the ECHO database (`EchoSchema`).                 |
| `Type.PersistentType`                      | const      | Object schema for persistent schemas stored in the database.             |
| `Type.Meta`                                | type       | Schema metadata annotation type.                                         |
| `Type.isObjectSchema(schema)`              | fn         | Type guard: checks if a schema is an object schema.                      |
| `Type.isRelationSchema(schema)`            | fn         | Type guard: checks if a schema is a relation schema.                     |
| `Type.getDXN(schema)`                      | fn         | Returns the full DXN of the schema (including version).                  |
| `Type.getTypename(schema)`                 | fn         | Returns the typename string.                                             |
| `Type.getVersion(schema)`                  | fn         | Returns the version string.                                              |
| `Type.getMeta(schema)`                     | fn         | Returns the schema metadata annotation.                                  |
| `Type.isMutable(schema)`                   | fn         | Returns true if the schema is a mutable (stored) schema.                 |

### `Entity` module

Generic operations on objects and relations.

| Export                           | Kind       | Description                                                                  |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `Entity.Unknown`                 | type       | Entity with no known properties (object or relation).                        |
| `Entity.Any`                     | type       | Entity with arbitrary `[key: string]: unknown` properties.                   |
| `Entity.Snapshot`                | type       | Non-generic snapshot of an entity.                                           |
| `Entity.Entity<Props>`           | type       | Entity with a specific set of properties.                                    |
| `Entity.OfKind<K>`               | type       | Brand interface assigning a `Kind` to an entity.                             |
| `Entity.SnapshotOfKind<K>`       | type       | Brand interface for entity snapshots.                                        |
| `Entity.Properties<T>`           | type       | Extracts user-defined properties (omits `id`, `KindId`, `Source`, `Target`). |
| `Entity.Mutable<T>`              | type       | Mutable view of an entity within a `change` callback.                        |
| `Entity.JSON`                    | type       | JSON representation of an entity.                                            |
| `Entity.Kind`                    | const/type | Enum of entity kinds (`Object`, `Relation`).                                 |
| `Entity.KindId`                  | const/type | Symbol brand for reactive entities.                                          |
| `Entity.SnapshotKindId`          | const/type | Symbol brand for entity snapshots.                                           |
| `Entity.Meta`                    | const/type | Symbol to access entity metadata.                                            |
| `Entity.isEntity(value)`         | fn         | Type guard for reactive entities.                                            |
| `Entity.isSnapshot(value)`       | fn         | Type guard for entity snapshots.                                             |
| `Entity.getKind(entity)`         | fn         | Returns the entity kind (Object or Relation).                                |
| `Entity.getDXN(entity)`          | fn         | Returns the DXN of an entity.                                                |
| `Entity.getTypeDXN(entity)`      | fn         | Returns the DXN of the entity's type.                                        |
| `Entity.getTypename(entity)`     | fn         | Returns the typename string.                                                 |
| `Entity.getDatabase(entity)`     | fn         | Returns the database the entity belongs to.                                  |
| `Entity.getMeta(entity)`         | fn         | Returns metadata (mutable inside change, readonly otherwise).                |
| `Entity.getKeys(entity, source)` | fn         | Returns foreign keys from the specified source.                              |
| `Entity.getLabel(entity)`        | fn         | Returns the label annotation value.                                          |
| `Entity.getDescription(entity)`  | fn         | Returns the description annotation value.                                    |
| `Entity.isDeleted(entity)`       | fn         | Returns true if the entity is deleted.                                       |
| `Entity.toJSON(entity)`          | fn         | Converts to JSON representation.                                             |
| `Entity.subscribe(entity, cb)`   | fn         | Subscribes to changes; returns unsubscribe function.                         |
| `Entity.change(entity, cb)`      | fn         | Batched mutations within a callback.                                         |
| `Entity.addTag(entity, tag)`     | fn         | Adds a tag (must be inside a change callback).                               |
| `Entity.removeTag(entity, tag)`  | fn         | Removes a tag (must be inside a change callback).                            |

### `Obj` module

Object-specific operations.

| Export                             | Kind       | Description                                                            |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `Obj.Unknown`                      | type       | Object with no known properties.                                       |
| `Obj.Any`                          | type       | Object with arbitrary properties.                                      |
| `Obj.OfShape<Props>`               | type       | Object with specific properties.                                       |
| `Obj.Snapshot<T>`                  | type       | Immutable snapshot of an object (branded with `SnapshotKindId`).       |
| `Obj.Mutable<T>`                   | type       | Mutable view within an `Obj.change` callback.                          |
| `Obj.MakeProps<S>`                 | type       | Props type for `Obj.make` with a given schema.                         |
| `Obj.Comparator`                   | type       | Comparator function type for sorting objects.                          |
| `Obj.Version`                      | type       | Object version representation.                                         |
| `Obj.JSON`                         | type       | JSON representation of an object.                                      |
| `Obj.ReadonlyMeta`                 | type       | Deeply read-only metadata type.                                        |
| `Obj.Meta`                         | const/type | Symbol for passing metadata in `Obj.make`; also the mutable meta type. |
| `Obj.Parent`                       | const      | Symbol to set parent in `Obj.make`.                                    |
| `Obj.ID`                           | const/type | Alias for `ObjectId`.                                                  |
| `Obj.make(schema, props)`          | fn         | Creates a new reactive object from a schema.                           |
| `Obj.isObject(value)`              | fn         | Type guard for ECHO objects.                                           |
| `Obj.isSnapshot(value)`            | fn         | Type guard for object snapshots.                                       |
| `Obj.instanceOf(schema, value?)`   | fn         | Checks if an object matches a schema (curried).                        |
| `Obj.snapshotOf(schema, value?)`   | fn         | Checks if a snapshot matches a schema (curried).                       |
| `Obj.change(obj, cb)`              | fn         | Batched mutations within a callback.                                   |
| `Obj.getSnapshot(obj)`             | fn         | Returns an immutable snapshot.                                         |
| `Obj.getReactive(snapshot)`        | fn         | Effect: resolves the reactive object from a snapshot.                  |
| `Obj.getReactiveOption(snapshot)`  | fn         | Effect: like `getReactive` but returns `Option`.                       |
| `Obj.getReactiveOrThrow(snapshot)` | fn         | Synchronous `getReactive`; throws on failure.                          |
| `Obj.clone(obj, opts?)`            | fn         | Clones an object (shallow by default).                                 |
| `Obj.subscribe(obj, cb)`           | fn         | Subscribes to changes; returns unsubscribe function.                   |
| `Obj.getValue(obj, path)`          | fn         | Deep property access by path.                                          |
| `Obj.setValue(obj, path, value)`   | fn         | Deep property set (inside change callback).                            |
| `Obj.getDXN(obj)`                  | fn         | Returns the DXN of the object.                                         |
| `Obj.getTypeDXN(obj)`              | fn         | Returns the DXN of the object's type.                                  |
| `Obj.getTypename(obj)`             | fn         | Returns the typename string.                                           |
| `Obj.getSchema(obj)`               | fn         | Returns the schema used to create the object.                          |
| `Obj.getDatabase(obj)`             | fn         | Returns the database the object belongs to.                            |
| `Obj.getMeta(obj)`                 | fn         | Returns metadata (mutable inside change, readonly otherwise).          |
| `Obj.getKeys(entity, source)`      | fn         | Returns foreign keys; also curried `(source) => (entity) => ...`.      |
| `Obj.deleteKeys(obj, source)`      | fn         | Deletes foreign keys (inside change callback).                         |
| `Obj.getLabel(obj)`                | fn         | Returns the label annotation value.                                    |
| `Obj.setLabel(obj, label)`         | fn         | Sets the label (inside change callback).                               |
| `Obj.getDescription(obj)`          | fn         | Returns the description annotation value.                              |
| `Obj.setDescription(obj, desc)`    | fn         | Sets the description (inside change callback).                         |
| `Obj.addTag(obj, tag)`             | fn         | Adds a tag (inside change callback).                                   |
| `Obj.removeTag(obj, tag)`          | fn         | Removes a tag (inside change callback).                                |
| `Obj.isDeleted(obj)`               | fn         | Returns true if the object is deleted.                                 |
| `Obj.getParent(obj)`               | fn         | Returns the parent object.                                             |
| `Obj.setParent(obj, parent)`       | fn         | Sets the parent object.                                                |
| `Obj.toJSON(obj)`                  | fn         | Converts to JSON representation.                                       |
| `Obj.fromJSON(json, opts?)`        | fn         | Creates an object from JSON (async, validates against schema).         |
| `Obj.sortByLabel`                  | const      | Comparator that sorts by label.                                        |
| `Obj.sortByTypename`               | const      | Comparator that sorts by typename.                                     |
| `Obj.sort(...comparators)`         | fn         | Composes multiple comparators.                                         |
| `Obj.version(obj)`                 | fn         | Returns the object's version.                                          |
| `Obj.isVersion(value)`             | fn         | Type guard for version values.                                         |
| `Obj.versionValid(version)`        | fn         | Checks if a version is valid.                                          |
| `Obj.compareVersions(a, b)`        | fn         | Compares two versions.                                                 |
| `Obj.encodeVersion(version)`       | fn         | Encodes a version to a string.                                         |
| `Obj.decodeVersion(str)`           | fn         | Decodes a version from a string.                                       |

### `Relation` module

Relation-specific operations.

| Export                                    | Kind       | Description                                                                 |
| ----------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `Relation.Unknown`                        | type       | Relation with no known properties.                                          |
| `Relation.OfShape<Source, Target, Props>` | type       | Relation with specific endpoint types and properties.                       |
| `Relation.Snapshot<T>`                    | type       | Immutable snapshot of a relation.                                           |
| `Relation.Mutable<T>`                     | type       | Mutable view within a `Relation.change` callback.                           |
| `Relation.MakeProps<S>`                   | type       | Props type for `Relation.make` with a given schema.                         |
| `Relation.Endpoints<Source, Target>`      | type       | Interface carrying source and target endpoints.                             |
| `Relation.SourceOf<T>`                    | type       | Extracts the source type of a relation.                                     |
| `Relation.TargetOf<T>`                    | type       | Extracts the target type of a relation.                                     |
| `Relation.Comparator`                     | type       | Comparator function type for sorting relations.                             |
| `Relation.Version`                        | type       | Relation version representation.                                            |
| `Relation.JSON`                           | type       | JSON representation of a relation.                                          |
| `Relation.ReadonlyMeta`                   | type       | Deeply read-only metadata type.                                             |
| `Relation.Meta`                           | const/type | Symbol for passing metadata in `Relation.make`; also the mutable meta type. |
| `Relation.Source`                         | const/type | Symbol for the source endpoint.                                             |
| `Relation.Target`                         | const/type | Symbol for the target endpoint.                                             |
| `Relation.make(schema, props)`            | fn         | Creates a new reactive relation.                                            |
| `Relation.isRelation(value)`              | fn         | Type guard for ECHO relations.                                              |
| `Relation.isSnapshot(value)`              | fn         | Type guard for relation snapshots.                                          |
| `Relation.change(rel, cb)`                | fn         | Batched mutations within a callback.                                        |
| `Relation.getSnapshot(rel)`               | fn         | Returns an immutable snapshot.                                              |
| `Relation.subscribe(rel, cb)`             | fn         | Subscribes to changes; returns unsubscribe function.                        |
| `Relation.getSource(rel)`                 | fn         | Returns the source object.                                                  |
| `Relation.getTarget(rel)`                 | fn         | Returns the target object.                                                  |
| `Relation.getSourceDXN(rel)`              | fn         | Returns the source DXN.                                                     |
| `Relation.getTargetDXN(rel)`              | fn         | Returns the target DXN.                                                     |
| `Relation.getValue(rel, path)`            | fn         | Deep property access by path.                                               |
| `Relation.setValue(rel, path, value)`     | fn         | Deep property set (inside change callback).                                 |
| `Relation.getDXN(rel)`                    | fn         | Returns the DXN of the relation.                                            |
| `Relation.getTypeDXN(rel)`                | fn         | Returns the DXN of the relation's type.                                     |
| `Relation.getTypename(rel)`               | fn         | Returns the typename string.                                                |
| `Relation.getSchema(rel)`                 | fn         | Returns the schema used to create the relation.                             |
| `Relation.getDatabase(rel)`               | fn         | Returns the database the relation belongs to.                               |
| `Relation.getMeta(rel)`                   | fn         | Returns metadata (mutable inside change, readonly otherwise).               |
| `Relation.getKeys(rel, source)`           | fn         | Returns foreign keys from the specified source.                             |
| `Relation.deleteKeys(rel, source)`        | fn         | Deletes foreign keys (inside change callback).                              |
| `Relation.getLabel(rel)`                  | fn         | Returns the label annotation value.                                         |
| `Relation.setLabel(rel, label)`           | fn         | Sets the label (inside change callback).                                    |
| `Relation.getDescription(rel)`            | fn         | Returns the description annotation value.                                   |
| `Relation.setDescription(rel, desc)`      | fn         | Sets the description (inside change callback).                              |
| `Relation.addTag(rel, tag)`               | fn         | Adds a tag (inside change callback).                                        |
| `Relation.removeTag(rel, tag)`            | fn         | Removes a tag (inside change callback).                                     |
| `Relation.isDeleted(rel)`                 | fn         | Returns true if the relation is deleted.                                    |
| `Relation.toJSON(rel)`                    | fn         | Converts to JSON representation.                                            |
| `Relation.sortByLabel`                    | const      | Comparator that sorts by label.                                             |
| `Relation.sortByTypename`                 | const      | Comparator that sorts by typename.                                          |
| `Relation.sort(...comparators)`           | fn         | Composes multiple comparators.                                              |
| `Relation.version(rel)`                   | fn         | Returns the relation's version.                                             |
| `Relation.isVersion(value)`               | fn         | Type guard for version values.                                              |

### `Ref` module

Reference types and operations.

| Export               | Kind | Description                                                             |
| -------------------- | ---- | ----------------------------------------------------------------------- |
| `Ref.Ref<T>`         | type | Instance type for a lazy-loaded reference to an entity.                 |
| `Ref.Unknown`        | type | `Ref<Obj.Unknown>`.                                                     |
| `Ref.Target<R>`      | type | Extracts the target type from a Ref.                                    |
| `Ref.RefSchema<T>`   | type | TypeScript type for a Ref schema (the schema itself, not the instance). |
| `Ref.Resolver`       | type | Reference resolver interface.                                           |
| `Ref.Ref(schema)`    | fn   | Schema factory: creates a Ref schema for the given target schema.       |
| `Ref.Array(schema)`  | fn   | Schema factory: creates an array-of-refs schema.                        |
| `Ref.make(obj)`      | fn   | Creates a reference to an existing object.                              |
| `Ref.fromDXN(dxn)`   | fn   | Creates an unhydrated reference from a DXN.                             |
| `Ref.isRef(value)`   | fn   | Type guard for references.                                              |
| `Ref.isRefType(ast)` | fn   | Checks if an AST node is a ref type.                                    |

### `Feed` module

Feed (queue) types and operations.

| Export                          | Kind       | Description                                          |
| ------------------------------- | ---------- | ---------------------------------------------------- |
| `Feed.Feed`                     | const/type | Schema and instance type for a feed object.          |
| `Feed.Cursor<T>`                | type       | Opaque cursor for iterating feed items.              |
| `Feed.RetentionOptions`         | type       | Retention policy options.                            |
| `Feed.Service`                  | class      | Effect service tag for feed operations.              |
| `Feed.DXN_KEY`                  | const      | Meta key source for the backing DXN.                 |
| `Feed.notAvailable`             | const      | Layer providing a Feed.Service that throws.          |
| `Feed.make(props)`              | fn         | Creates a new feed object.                           |
| `Feed.getDxn(feed)`             | fn         | Derives the queue DXN from the feed object's DXN.    |
| `Feed.append(feed, items)`      | fn         | Effect: appends items to a feed.                     |
| `Feed.remove(feed, items)`      | fn         | Effect: removes items from a feed by ID.             |
| `Feed.query(feed, query)`       | fn         | Effect: creates a reactive query over feed items.    |
| `Feed.runQuery(feed, query)`    | fn         | Effect: executes a feed query once, returns results. |
| `Feed.cursor(feed)`             | fn         | Effect: creates a cursor (stubbed).                  |
| `Feed.next(cursor)`             | fn         | Effect: returns the next item (stubbed).             |
| `Feed.nextOption(cursor)`       | fn         | Effect: returns the next item as Option (stubbed).   |
| `Feed.setRetention(feed, opts)` | fn         | Effect: sets retention policy (stubbed).             |

### `Filter` module

Filter construction for queries.

| Export                             | Kind | Description                                               |
| ---------------------------------- | ---- | --------------------------------------------------------- |
| `Filter.Filter<T>`                 | type | A typed filter.                                           |
| `Filter.Props<T>`                  | type | Property predicate map for a type.                        |
| `Filter.Any`                       | type | `Filter<any>`.                                            |
| `Filter.Type<F>`                   | type | Extracts the filtered type from a Filter.                 |
| `Filter.is(value)`                 | fn   | Type guard for filters.                                   |
| `Filter.fromAst(ast)`              | fn   | Constructs a filter from a QueryAST node.                 |
| `Filter.everything()`              | fn   | Matches all objects.                                      |
| `Filter.nothing()`                 | fn   | Matches no objects.                                       |
| `Filter.id(...ids)`                | fn   | Matches by ObjectId.                                      |
| `Filter.type(schema, props?)`      | fn   | Matches by schema type with optional property predicates. |
| `Filter.typename(name)`            | fn   | Matches by unqualified typename string.                   |
| `Filter.typeDXN(dxn)`              | fn   | Matches by fully qualified type DXN.                      |
| `Filter.tag(tag)`                  | fn   | Matches by tag.                                           |
| `Filter.props(props)`              | fn   | Matches by property predicates only (no type constraint). |
| `Filter.text(text, opts?)`         | fn   | Full-text or vector search.                               |
| `Filter.foreignKeys(schema, keys)` | fn   | Matches by foreign keys.                                  |
| `Filter.eq(value)`                 | fn   | Predicate: equal.                                         |
| `Filter.neq(value)`                | fn   | Predicate: not equal.                                     |
| `Filter.gt(value)`                 | fn   | Predicate: greater than.                                  |
| `Filter.gte(value)`                | fn   | Predicate: greater than or equal.                         |
| `Filter.lt(value)`                 | fn   | Predicate: less than.                                     |
| `Filter.lte(value)`                | fn   | Predicate: less than or equal.                            |
| `Filter.in(...values)`             | fn   | Predicate: value in set.                                  |
| `Filter.contains(value)`           | fn   | Predicate: array contains value.                          |
| `Filter.between(from, to)`         | fn   | Predicate: value in range.                                |
| `Filter.not(filter)`               | fn   | Logical NOT.                                              |
| `Filter.and(...filters)`           | fn   | Logical AND.                                              |
| `Filter.or(...filters)`            | fn   | Logical OR.                                               |

### `Query` module

Query construction and composition.

| Export                                              | Kind   | Description                                     |
| --------------------------------------------------- | ------ | ----------------------------------------------- |
| `Query.Query<T>`                                    | type   | A typed, chainable query.                       |
| `Query.Any`                                         | type   | `Query<any>`.                                   |
| `Query.Type<Q>`                                     | type   | Extracts the result type from a Query.          |
| `Query.is(value)`                                   | fn     | Type guard for queries.                         |
| `Query.fromAst(ast)`                                | fn     | Constructs a query from a QueryAST node.        |
| `Query.select(filter)`                              | fn     | Creates a query from a filter.                  |
| `Query.type(schema, predicates?)`                   | fn     | Shorthand for `select(Filter.type(...))`.       |
| `Query.all(...queries)`                             | fn     | Union of multiple queries.                      |
| `Query.without(source, exclude)`                    | fn     | Set difference of two queries.                  |
| `query.select(filter)`                              | method | Further filter the selection.                   |
| `query.reference(key)`                              | method | Traverse an outgoing reference.                 |
| `query.referencedBy(schema?, key?)`                 | method | Find incoming references.                       |
| `query.sourceOf(schema?, props?)`                   | method | Find relations where this is the source.        |
| `query.targetOf(schema?, props?)`                   | method | Find relations where this is the target.        |
| `query.source()`                                    | method | Get the source objects of relations.            |
| `query.target()`                                    | method | Get the target objects of relations.            |
| `query.parent()`                                    | method | Get parent objects.                             |
| `query.children()`                                  | method | Get child objects.                              |
| `query.orderBy(...orders)`                          | method | Sort results.                                   |
| `query.limit(n)`                                    | method | Limit result count.                             |
| `query.from(db \| feed \| 'all-accessible-spaces')` | method | Scope the query to specific databases or feeds. |
| `query.options(opts)`                               | method | Add query options.                              |

### `QueryResult` module

Query result types.

| Export                            | Kind   | Description                                        |
| --------------------------------- | ------ | -------------------------------------------------- |
| `QueryResult.QueryResult<T>`      | type   | Reactive query result.                             |
| `QueryResult.Entry<T>`            | type   | Individual result entry with match metadata.       |
| `QueryResult.EntityEntry<T>`      | type   | Entry specialized for entities.                    |
| `QueryResult.RunOptions`          | type   | Options for `run()` and `first()`.                 |
| `QueryResult.SubscriptionOptions` | type   | Options for `subscribe()`.                         |
| `result.entries`                  | prop   | Currently available entries with match metadata.   |
| `result.results`                  | prop   | Currently available result values.                 |
| `result.run(opts?)`               | method | Async: returns all results.                        |
| `result.runEntries(opts?)`        | method | Async: returns all entries with metadata.          |
| `result.runSync()`                | method | Sync: returns currently available results.         |
| `result.runSyncEntries()`         | method | Sync: returns currently available entries.         |
| `result.first(opts?)`             | method | Async: returns first result (throws if none).      |
| `result.firstOrUndefined(opts?)`  | method | Async: returns first result or undefined.          |
| `result.subscribe(cb?, opts?)`    | method | Subscribes to result changes; returns unsubscribe. |

### `Order` module

Sort-order construction for queries.

| Export                           | Kind  | Description                                   |
| -------------------------------- | ----- | --------------------------------------------- |
| `Order.Order<T>`                 | type  | A typed sort order.                           |
| `Order.Any`                      | type  | `Order<any>`.                                 |
| `Order.natural`                  | const | Natural (insertion) order.                    |
| `Order.property(key, direction)` | fn    | Order by a property (`'asc'` or `'desc'`).    |
| `Order.rank(direction?)`         | fn    | Order by relevance rank (for search results). |

### `Database` module

Database persistence interface and Effect service.

| Export                           | Kind       | Description                                           |
| -------------------------------- | ---------- | ----------------------------------------------------- |
| `Database.Database`              | type/const | ECHO database interface and Effect schema.            |
| `Database.Queryable`             | type       | Interface exposing `query`.                           |
| `Database.QueryFn`               | type       | Overloaded query function signature.                  |
| `Database.TypeId`                | const/type | Symbol identifying a Database instance.               |
| `Database.QueryOptions`          | type       | Legacy query options (deprecated).                    |
| `Database.GetObjectByIdOptions`  | type       | Options for `getObjectById`.                          |
| `Database.AddOptions`            | type       | Options for `add` (placement).                        |
| `Database.FlushOptions`          | type       | Options for `flush`.                                  |
| `Database.Service`               | class      | Effect service tag for Database.                      |
| `Database.notAvailable`          | const      | Layer providing a Database.Service that throws.       |
| `Database.makeService(db)`       | fn         | Creates a Database service instance.                  |
| `Database.layer(db)`             | fn         | Creates a Layer providing the Database service.       |
| `Database.isDatabase(value)`     | fn         | Type guard for databases.                             |
| `Database.spaceId`               | const      | Effect: returns the space ID of the current database. |
| `Database.resolve(ref, schema?)` | fn         | Effect: resolves an object by DXN.                    |
| `Database.load(ref)`             | fn         | Effect: loads an object reference.                    |
| `Database.loadOption(ref)`       | fn         | Effect: loads a reference as Option.                  |
| `Database.add(obj)`              | fn         | Effect: adds an object to the database.               |
| `Database.remove(obj)`           | fn         | Effect: removes an object from the database.          |
| `Database.flush(opts?)`          | fn         | Effect: flushes pending changes.                      |
| `Database.query(query)`          | fn         | Effect: creates a QueryResult.                        |
| `Database.runQuery(query)`       | fn         | Effect: executes query once, returns results.         |
| `Database.schemaQuery(opts?)`    | fn         | Effect: creates a schema QueryResult.                 |
| `Database.runSchemaQuery(opts?)` | fn         | Effect: executes schema query once, returns results.  |

### `Annotation` module

Schema annotation helpers.

| Export                                                   | Kind  | Description                                   |
| -------------------------------------------------------- | ----- | --------------------------------------------- |
| `Annotation.make(props)`                                 | fn    | Creates a new serializable schema annotation. |
| `Annotation.LabelAnnotation`                             | const | Annotation for object labels.                 |
| `Annotation.DescriptionAnnotation`                       | const | Annotation for object descriptions.           |
| `Annotation.IconAnnotation`                              | const | Annotation for object icons.                  |
| `Annotation.FormInputAnnotation`                         | const | Annotation controlling form input visibility. |
| `Annotation.GeneratorAnnotation`                         | const | Annotation for value generators.              |
| `Annotation.ReferenceAnnotation`                         | const | Annotation for reference metadata.            |
| `Annotation.SystemTypeAnnotation`                        | const | Annotation marking system types.              |
| `Annotation.TypeAnnotation`                              | const | Core type metadata annotation.                |
| `Annotation.getLabelWithSchema(obj, schema)`             | fn    | Gets label using schema metadata.             |
| `Annotation.setLabelWithSchema(obj, schema, label)`      | fn    | Sets label using schema metadata.             |
| `Annotation.getDescriptionWithSchema(obj, schema)`       | fn    | Gets description using schema metadata.       |
| `Annotation.setDescriptionWithSchema(obj, schema, desc)` | fn    | Sets description using schema metadata.       |
| `Annotation.getTypeAnnotation(schema)`                   | fn    | Gets type annotation from a schema.           |
