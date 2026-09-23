# DXOS ECHO API

## Imports

```ts
import { Schema } from 'effect';
import {
  Annotation, // Schema annotations (labels, descriptions, etc.)
  Database, // Database interface for persistence
  Entity, // Generic entity types & functions (works for Obj/Relation/Type)
  Feed, // Feed (queue) types & functions
  Filter, // Filter construction for queries
  Obj, // Object types & functions
  Order, // Sort-order construction for queries
  Query, // Query construction
  QueryResult, // Query result types
  Ref, // Reference types & functions
  Relation, // Relation types & functions
  Type, // Type construction & factories
} from '@dxos/echo';
import { DXN } from '@dxos/keys';
```

---

## Defining Types

`Type.makeObject` / `Type.makeRelation` turn a plain Effect `Schema` into a **type entity** (`Type.Type`). A type entity is itself an ECHO entity (branded `Kind.Type`); its `typename` and `version` live in its `EntityMeta` and are read via `Type.getTypename` / `Type.getVersion` (not as direct fields). Retrieve the underlying Effect `Schema` with `Type.getSchema`.

### Object types

```ts
const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
}).pipe(Annotation.LabelAnnotation.set(['name']), Type.makeObject(DXN.make('com.example.type.person', '0.1.0')));

type Person = Type.InstanceType<typeof Person>;
```

### Relation types

```ts
const AnchoredTo = Schema.Struct({
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.anchoredTo', '0.1.0'),
    source: Obj.Unknown,
    target: Document,
  }),
);

type AnchoredTo = Type.InstanceType<typeof AnchoredTo>;
```

### Reference fields

```ts
const Task = Schema.Struct({
  assignee: Ref.Ref(Person),
  watchers: Ref.Array(Ref.Ref(Person)),
}).pipe(Type.makeObject(DXN.make('com.example.type.task', '0.1.0')));

type Task = Type.InstanceType<typeof Task>;
```

A ref to a deleted object resolves as if the object were absent — see
[Working with Refs](#working-with-refs).

### Owned children

Ownership is declared on the ref field with `Annotation.SetParent`. Writing a ref into an annotated
field sets the target's parent, so the child cascade-deletes and deep-clones with its holder; there
is no imperative parent API.

```ts
const Doc = Schema.Struct({
  content: Ref.Ref(Text).pipe(Annotation.SetParent.set(true)),
  sections: Ref.Array(Ref.Ref(Section).pipe(Annotation.SetParent.set(true))),
}).pipe(Type.makeObject(DXN.make('com.example.type.doc', '0.1.0')));
```

Do not annotate a field whose targets may be parented elsewhere (e.g. a membership array where a
sub-item's parent is another item) — every write to the holder would re-parent them to it.

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
Obj.update(task, (t) => {
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
Relation.update(rel, (r) => {
  r.anchor = 'section-2';
});

// Access endpoints
Relation.getSource(rel);
Relation.getTarget(rel);
```

## Working with Refs

```ts
// Create
const ref = Ref.make(alice);

// Dereference synchronously (working set only).
task.assignee.target; // undefined until loaded — and undefined if the target is deleted

// Load through the resolver.
await task.assignee.load(); // throws when the target is unavailable or deleted
await task.assignee.load({ deleted: 'include' }); // resolves a tombstoned target

// Effect forms.
const program = Effect.gen(function* () {
  const assignee = yield* Database.load(task.assignee); // fails with EntityNotFoundError
  const ghost = yield* Database.load(task.assignee, { deleted: 'include' }); // resolves a tombstoned target
});
```

A ref to a deleted object keeps its URI — id comparison and grouping keep working — and its target
behaves as absent unless the read opts into deleted entities.

### Ref arrays

The stored array is what you read: an entry whose target has been deleted stays in the array as a
dangling ref (its target resolves as absent). Nobody sweeps holders on deletion. To enumerate the
referenced objects, query for them instead of dereferencing the array — the query engine takes
deletion into account, so no caller handles dangling entries by hand:

```ts
// Objects a specific property references, deletion respected on both sides.
const watchers = await db.query(Query.select(Filter.entity(task)).reference('watchers')).run();

// Members of a container: query by the parent edge (or another membership filter).
const members = await db.query(Filter.childOf(taskSet)).run();
```

Reach for the array itself to write membership, and mutate it in place (wholesale reassignment is a
reactivity anti-pattern — splice instead). The array is also the canonical order, which a query does
not preserve: sort the results by it when order matters.

## Querying

```ts
// Build queries
const query = Query.select(Filter.type(Task));
const query2 = Query.type(Task, { completed: false });

// Typed anchor: selects by the entity's id, keeping its type for the traversal chain.
const query3 = Query.select(Filter.entity(task)).referencedBy(TaskSet, 'tasks');

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

// Deleted objects are excluded by default; opt in per query.
Query.type(Task).options({ deleted: 'include' });
Query.type(Task).options({ deleted: 'only' }); // trash view

// Execute against a database
const result = db.query(Query.type(Task));
const items = await result.run();
result.subscribe((r) => console.log(r.results));
```

### Counting

Cardinality is a query; order is the array. A ref array's `length` counts stored entries, dangling
refs included, so displayed counts come from a query — answered from the index, with deletion
respected:

```ts
const members = await db.query(Filter.childOf(taskSet)).run();
members.length; // stable count, deletion respected
```

## Database Operations

```ts
const db: Database.Database = space.db;

db.add(obj);
db.remove(obj); // Soft delete: reversible with db.add(obj) until garbage collection
db.getObjectById(id);
db.query(Query.type(Task));
db.query(Filter.type(Task));
db.makeRef<Task>(dxn);
await db.flush();
await db.flush({ indexes: true, updates: true });
```

## Deletion

`db.remove(obj)` is a soft delete: a tombstone that replicates like any other edit. Data stays
intact and `db.add(obj)` restores the object, until garbage collection permanently destroys it.
Deletion cascades transitively — children (via the parent edge declared with `Annotation.SetParent`,
see [Owned children](#owned-children)) and relations (via either endpoint) of a deleted object read
as deleted, by the same rule at every surface.

Queries exclude deleted objects by default (see [Querying](#querying)) and ref targets read as
absent, with `{ deleted: 'include' }` as the opt-in in both places. Ref arrays are not filtered: a
dangling entry stays in the stored array, and readers enumerate the live members through a query
rather than by dereferencing entries (see [Working with Refs](#working-with-refs)).

Nothing rewrites a ref that dangles — not deletion, not garbage collection. An entry lives until the
object holding it writes it away, so read through dangling refs rather than sweeping them.

## Feed Operations

```ts
const feed = Feed.make({ name: 'notifications', kind: 'plugin/v1' });

// Effectful operations (require Database.Service).
const program = Effect.gen(function* () {
  yield* Feed.append(feed, [item]);
  yield* Feed.remove(feed, [item]);

  // Feed.query chains like Database.query: yield it for a subscribable QueryResult,
  // or use the .run / .first shorthands to execute once.
  const result = yield* Feed.query(feed, Filter.type(Person));
  result.subscribe(() => {});
  const items = yield* Feed.query(feed, Filter.type(Person)).run;
  const first = yield* Feed.query(feed, Filter.type(Person)).first; // Option<Person>

  // Data-last (curried) form composes with `pipe`.
  const piped = yield* pipe(feed, Feed.query(Filter.type(Person))).run;
});
```

## Live Objects vs Snapshots

ECHO has two representations for every object and relation: **live** and **snapshot**.

**Live object** -- A reactive proxy backed by the ECHO database. Reading a property always returns the latest value, including changes made locally, by other parts of the app, or replicated from a remote peer. Live objects can be mutated inside `Obj.update` (or `Relation.update`). Subscribing to a live object (`Obj.subscribe`) fires callbacks whenever any property changes.

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
Obj.getTypename(snapshot); // 'com.example.type.person'
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
Obj.update(snapshot, (s) => {
  s.name = 'Bob';
}); // Error
Obj.subscribe(snapshot, () => {}); // Error
Relation.update(relSnap, (r) => {
  r.anchor = 'x';
}); // Error
```

### Getting a live object from a snapshot

Use the snapshot's `id` to query the live object back from the database:

```ts
const live = await db.query(Query.select(Filter.ids(snap.id)).select(Filter.type(Person))).first();
```

---
