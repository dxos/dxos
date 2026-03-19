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
  Type.object({ typename: 'com.example.type.person', version: '0.1.0' }),
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
    typename: 'org.dxos.relation.anchored-to',
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
}).pipe(Type.object({ typename: 'com.example.type.task', version: '0.1.0' }));

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
