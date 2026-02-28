# DXOS ECHO API Summary

## API ontology proposal

### Principles

- Separation of APIs to work with data (Entity, Obj, Relation, Feed) and APIs to introspect schema (Type).
- Symetry of names used to define schema, and names used to specify TypeScript types.

```ts
const Mailbox = Schema.Struct({
  messages: Type.Ref(Feed.Feed)
}).pipe(Type.object({ typename: 'example.com/type/Mailbox', version: '0.1.0' }));
interface Mailbox extends Schema.Schema.Type<typeof Mailbox> {}

typeof mailbox.messages === Feed.Feed;

const Collection = Schema.Struct({
  objects: Schema.Array(Type.Ref(Obj.Unknown))
}).pipe(Type.relation({ typename: 'example.com/type/Collection', version: '0.1.0' }));
interface Collection extends Schema.Schema.Type<typeof Collection> {}

typeof collection.objects === Obj.Unknown[];

const feed = Feed.make({});
typeof feed === Feed.Feed;
```

- Entity module defines APIs useful for both objects and relations, but Obj and Relation can specialize and alias those APIs.
- Snaphots are deined as a higher-order type so that a snapshot type can be derived any type.

```ts
Entity.Snapshot<Person>;
Entity.Snapshot<Relation.AnchoredTo>;
Entity.Snapshot<Obj.Unknown>;
Entity.Snapshot<Entity.Unknown>;
```

- Snapshots cannot be mutated or used with `db.add` or `db.remove`.

### `Type` module

Used when working with the schema definitions

Two use-cases:

- Definiting new schema.
- Iterating and introspecting schema.

The types are used when dealing with schema as values.

Types:

- type `Type.Entity<T extends Entity.Unknown>` - instance of a schema for an object or relation of instance type `T`.
- type `Type.UnknownEntity` - instance of a schema for object or relation, but instance type is not known.
- type `Type.Obj<T extends Obj.Unknown>` - instance of a schema for an object of instance type `T`.
- type `Type.UnknownObj` - instance of a schema for object, but instance type is not known.
- type `Type.Relation<T extends Relation.Unknown>` - instance of a schema for a relation of instance type `T`.
- type `Type.UnknownRelation` - instance of a schema for a relation, but instance type is not known.

Functions:

- function `Type.object(...)` - defines a new object schema; returns `Type.Obj<T>`.
- function `Type.relation(...)` - defines a new relation schema; returns `Type.Relation<T>`.
- function `Type.get*(schema: Type.UnknownEntity)` - getters for schema metadata.

Worth mentioning:

- `Type.Obj<Feed.Feed>` - instance of a schema for a Feed object.

### `Entity` module

Used when working with instances of objects and relations.

Types:

- type `Entity.Base` - common base type for all entity instances.
- type `Entity.Unknown` - instance of an entity, but properties are not known.
- type `Entity.Any` - instance of an entity, but exposes arbitrary properties (on the way to deprecation).
- type `Entity.Properties<T extends Entity.Base>` - properties of an entity of instance type `T`.
- type `Entity.Snapshot<T extends Entity.Base>` - snapshot of an entity of instance type `T`. Readonly; cannot be mutated with `Obj.change`

### `Obj` module

Used when working with instances of objects.

Types:

- type `Obj.Base` - common base type for all object instances.
- type `Obj.Unknown` - instance of an object, but properties are not known.
- type `Obj.Any` - instance of an object, but exposes arbitrary properties (on the way to deprecation).
- type `Obj.Properties<T extends Obj.Base>` - properties of an object of instance type `T`.
- type `Obj.Snapshot<T extends Obj.Base>` - snapshot of an object of instance type `T`. Readonly; cannot be mutated with `Obj.change`

Constants:

- constant `Obj.Unknown` - schema that represents an object with unknown properties. **Deliberatly same name as the type.** Used in schema definitions.
- constnat `Obj.Meta` - Used in `Obj.make` call to define metadata for the object.

Functions:

- function `Obj.make(schema: Type.Obj<T>, props: Obj.Properties<T>)` - create a new object of instance type `T`.
- function `Obj.snapshot(obj: Obj.Obj<T>)` - get a snapshot of an object of instance type `T`.
- function `Obj.change(obj: Obj.Obj<T>, callback: (obj: Obj.Mutable<T>) => void)` - mutate an object of instance type `T`.

- fun
  To define new schema:

```ts
const Person = Schema.Struct({
  name: Schema.String,
}).pipe(Type.object({ typename: 'example.com/type/Person', version: '0.1.0' }));
interface Person extends Schema.Schema.Type<typeof Person> {}

// Person extends Obj.Base
// We don't need to wrap Person in Obj.Obj<Person>

// **CORRECT**
const x: Person;

// **INCORRECT**
const x: Obj.Obj<Person>;

const schema: Type.Obj<Person>; // <--- this is an instance of a schema that produces `Person`
```

`Person` is a type that extends `Obj.Base`.

### `Relation` module

Used when working with instances of relations.

Types:

- type `Relation.Base` - common base type for all relation instances.
- type `Relation.Unknown` - instance of a relation, but properties are not known.
- type `Relation.Any` - instance of a relation, but exposes arbitrary properties (on the way to deprecation).
- type `Relation.Source<T extends Relation.Base>` - get source of the relation.
- type `Relation.Target<T extends Relation.Base>` - get target of the relation.
- type `Relation.Properties<T extends Relation.Base>` - properties of a relation of instance type `T`.
- type `Relation.Snapshot<T extends Relation.Base>` - snapshot of a relation of instance type `T`. Readonly; cannot be mutated with `Relation.change`

Constants:

- constant `Relation.Unknown` - schema that represents a relation with unknown properties. **Deliberatly same name as the type.** Used in schema definitions.
- constant `Relation.Meta` - Used in `Relation.make` call to define metadata for the relation.
- cosntant `Relation.Source` - Used in `Relation.make` call to define source ofthe relation
- constant `Relation.Target` - Used in `Relation.make` call to define target of the relation.

Functions:

- function `Relation.make(schema: Type.Relation<T>, props: Relation.Properties<T>)` - create a new relation of instance type `T`.
- function `Relation.snapshot(relation: Relation.Relation<T>)` - get a snapshot of a relation of instance type `T`.
- function `Relation.change(relation: Relation.Relation<T>, callback: (relation: Relation.Mutable<T>) => void)` - mutate a relation of instance type `T`.

### Feed module

Used when working with instances of feeds.

Types:

- type `Feed.Feed` - instance of a feed. **Deliberatly can't type items the feed stores.**.

Constants:

- constant `Feed.Feed` - schema that represents a feed. **Deliberatly same name as the type.** Used in schema definictions and queries.

Functions:

- function `Feed.make(props: Obj.MakeProps<typeof Feed.Feed>)` - create a new feed.
- function `Feed.query(query: Query.Any)` - query a feed.
- function `Feed.append(feed: Feed.Feed, items: Entity.Unknown[])` - append items to a feed.

```ts
const Foo = Schema.Struct({
  feed: Type.Ref(Feed.Feed),
}).pipe(Type.object({ typename: 'example.com/type/Foo', version: '0.1.0' }));

Query.select(Filter.type(Feed.Feed));
```

## Core Modules

The `@dxos/echo` package exports these primary namespaces:

```ts
import {
  Annotation, // Schema annotations (labels, descriptions, etc.)
  Database, // Database interface for persistence
  Entity, // Generic entity types & functions (works for both Obj and Relation)
  Filter, // Filter construction for queries
  Obj, // Object types & functions
  Query, // Query construction
  Ref, // Reference types & functions
  Relation, // Relation types & functions
  Type, // Schema types and factories
} from '@dxos/echo';
```

---

## Type Module - Schema Definitions

### Defining Object Schemas

```ts
import { Schema } from 'effect';
import { Type, Annotation } from '@dxos/echo';

// Define an object schema with Type.object()
const Document = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  content: Type.Ref(Text), // Reference to another object
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Document',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.DescriptionAnnotation.set('description'),
) satisfies Type.Obj.Any;

interface Document extends Schema.Schema.Type<typeof Document> {}
```

### Defining Relation Schemas

```ts
// Define a relation schema with Type.relation()
const AnchoredTo = Schema.Struct({
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Type.Obj, // Any object as source
    target: Document, // Specific type as target
  }),
) satisfies Type.Relation.Any;

interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}
```

### Type System Overview

| Export                             | Description                                                 |
| ---------------------------------- | ----------------------------------------------------------- | ---------- |
| `Type.Obj`                         | Runtime schema for any ECHO object (for validation/parsing) |
| `Type.Obj<T>`                      | TypeScript type for an object schema producing `T`          |
| `Type.Obj.Any`                     | Type alias for any object schema                            |
| `Type.object({...})`               | Factory function - adds object metadata to a schema         |
| `Type.Relation`                    | Runtime schema for any ECHO relation                        |
| `Type.Relation<T, Source, Target>` | TypeScript type for a relation schema                       |
| `Type.Relation.Any`                | Type alias for any relation schema                          |
| `Type.relation({...})`             | Factory function - adds relation metadata to a schema       |
| `Type.Entity.Any`                  | Runtime schema for any entity (union of `Obj                | Relation`) |
| `Type.Ref(Schema)`                 | Schema constructor - creates a reference schema             |

### Reference Schemas

```ts
// Type.Ref creates a schema for references to other objects
const Task = Schema.Struct({
  assignee: Type.Ref(Person), // Single reference
  watchers: Ref.Array(Type.Ref(Person)), // Array of references
}).pipe(Type.object({ typename: '...', version: '0.1.0' }));
```

---

## Obj Module - Object Operations

### Creating Objects

```ts
import { Obj, Type } from '@dxos/echo';

// Create an object from a schema
const doc = Obj.make(Document, {
  name: 'My Document',
  description: 'A sample document',
  content: Ref.make(textObj),
}) satisfies Obj.Obj<Document>;

// With metadata
const docWithMeta = Obj.make(Document, {
  [Obj.Meta]: { keys: [{ source: 'external', id: '123' }] },
  name: 'My Document',
});
```

### Object Types

| Type              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `Obj.Obj<T>`      | Object with specific properties (readonly but reactive)    |
| `Obj.Unknown`     | Object with no known properties (safe, forces type checks) |
| `Obj.Any`         | Object with arbitrary properties (permissive)              |
| `Obj.Snapshot<T>` | Point-in-time frozen copy (immutable)                      |
| `Obj.Mutable<T>`  | Mutable view within `Obj.change` callback                  |

### Mutating Objects

```ts
// Objects are readonly by default
// @ts-expect-error - direct mutation throws
doc.name = 'New Name';

// Use Obj.change for mutations (batched, single notification)
Obj.change(doc, (d) => {
  d.name = 'New Name';
  d.description = 'Updated description';
});

// Deep property access
Obj.getValue(doc, ['nested', 'property']);

// Deep property mutation (within change callback)
Obj.change(doc, (d) => {
  Obj.setValue(d, ['addresses', 0, 'street'], '123 Main St');
});
```

### Type Guards and Introspection

```ts
Obj.isObject(value); // Check if value is an ECHO object
Obj.instanceOf(Document, value); // Check if object matches schema
Obj.instanceOf(Document); // Curried form: returns predicate

Obj.getTypename(doc); // 'dxos.org/type/Document'
Obj.getDXN(doc); // DXN (object identifier)
Obj.getTypeDXN(doc); // DXN of the type
Obj.getSchema(doc); // Returns the schema
Obj.getDatabase(doc); // Returns the database (if added)
```

### Metadata Operations

```ts
// Read metadata (returns ReadonlyMeta outside change callback)
const meta = Obj.getMeta(doc);
Obj.getLabel(doc);
Obj.getDescription(doc);
Obj.getKeys(doc, 'external-source');
Obj.isDeleted(doc);

// Mutate metadata (within Obj.change)
Obj.change(doc, (d) => {
  const meta = Obj.getMeta(d); // Mutable meta inside change
  Obj.setLabel(d, 'New Label');
  Obj.setDescription(d, 'New description');
  Obj.addTag(d, 'important');
  Obj.removeTag(d, 'draft');
  Obj.deleteKeys(d, 'old-source');
});
```

### Snapshots and Subscriptions

A **snapshot** is a deep-frozen, point-in-time copy of an object's state. Unlike a regular
object (which is read-only but still reflects updates to the underlying data), a snapshot's
values will never change - it captures the object's state at the moment it was created.

```ts
const snapshot = Obj.getSnapshot(doc); // Get point-in-time frozen copy

const cloned = Obj.clone(doc); // Clone an object (new reactive object)
const clonedWithId = Obj.clone(doc, { retainId: true });

const unsubscribe = Obj.subscribe(doc, () => {
  // Subscribe to changes
  console.log('Object changed');
});
```

### JSON Serialization

```ts
const json = Obj.toJSON(doc);
const restored = await Obj.fromJSON(json, { refResolver });
```

---

## Relation Module - Relation Operations

The Relation module mirrors the Obj module API. Only the differences are documented here.

### Creating Relations

```ts
import { Relation } from '@dxos/echo';

// Relations require source and target endpoints
const anchoredTo = Relation.make(AnchoredTo, {
  [Relation.Source]: sourceObj,
  [Relation.Target]: targetObj,
  anchor: 'section-1',
});
```

### Relation-Specific Types

| Type                                       | Description                   |
| ------------------------------------------ | ----------------------------- |
| `Relation.Relation<Source, Target, Props>` | Relation with typed endpoints |
| `Relation.Unknown`                         | Unknown relation              |
| `Relation.Source`                          | Symbol for source endpoint    |
| `Relation.Target`                          | Symbol for target endpoint    |

### Relation-Specific Operations

```ts
// Use Relation.change (not Obj.change) for mutations
Relation.change(anchoredTo, (r) => {
  r.anchor = 'section-2';
});

// Access endpoints
Relation.getSource(anchoredTo); // Returns source object
Relation.getTarget(anchoredTo); // Returns target object
Relation.getSourceDXN(anchoredTo); // Returns source DXN
Relation.getTargetDXN(anchoredTo); // Returns target DXN

// Type guard
Relation.isRelation(value); // Check if value is a relation
```

---

## Entity Module - Generic Operations

Works on both objects and relations when you don't know or care about the specific kind:

```ts
import { Entity } from '@dxos/echo';

const entity: Entity.Unknown = doc; // Accepts objects
const entity2: Entity.Unknown = relation; // Accepts relations

// Generic change (prefer Obj.change or Relation.change when type is known)
Entity.change(entity, (e) => {
  e.name = 'Updated';
});

// Generic operations
Entity.getDXN(entity);
Entity.getTypename(entity);
Entity.getLabel(entity);
Entity.subscribe(entity, callback);
Entity.toJSON(entity);
Entity.addTag(entity, 'tag');
Entity.removeTag(entity, 'tag');
```

---

## Ref Module - References

### Creating References

```ts
import { Ref } from '@dxos/echo';

const ref = Ref.make(doc); // Create a reference to an object
const ref2 = Ref.fromDXN(dxn); // Create from DXN (unhydrated)
```

### Reference Operations

```ts
Ref.isRef(value); // Type guard
Ref.Target<R>; // Extract target type from Ref<T>

// Loading references
const target = await ref.tryLoad(); // Returns T | undefined
const target = ref.target; // Synchronous access (may be undefined)
```

---

## Filter Module - Building Filters

```ts
import { Filter } from '@dxos/echo';

// Basic filters
Filter.everything(); // Match all objects
Filter.nothing(); // Match no objects
Filter.id('abc', 'def'); // Match by IDs
Filter.type(Document); // Match by type
Filter.typename('Document'); // Match by typename string
Filter.tag('important'); // Match by tag
Filter.text('search query'); // Full-text search

// Property predicates
Filter.type(Document, {
  name: 'My Doc', // Shorthand for eq
  rating: Filter.gt(5), // Greater than
  status: Filter.in('active', 'pending'),
});

// Comparison predicates
Filter.eq(value);
Filter.neq(value);
Filter.gt(value);
Filter.gte(value);
Filter.lt(value);
Filter.lte(value);
Filter.in(...values);
Filter.contains(value); // Array contains
Filter.between(from, to);

// Logical combinators
Filter.not(filter);
Filter.and(filter1, filter2);
Filter.or(filter1, filter2);
```

---

## Query Module - Building Queries

```ts
import { Query, Filter } from '@dxos/echo';

// Start a query
const query = Query.select(Filter.type(Document));
const query2 = Query.type(Document); // Shorthand

// Query methods (chainable)
query
  .select(Filter.props({ status: 'active' })) // Further filtering
  .reference('author') // Traverse outgoing reference
  .referencedBy(Comment, 'target') // Find incoming references
  .sourceOf(AnchoredTo) // Find relations where this is source
  .targetOf(AnchoredTo) // Find relations where this is target
  .source() // Get source of relations
  .target() // Get target of relations
  .orderBy(Order.asc('name')) // Sort results
  .limit(10); // Limit results

// Combine queries
Query.all(query1, query2); // Union
Query.without(source, exclude); // Difference
```

---

## Database Module - Persistence

```ts
import { Database, Query, Filter } from '@dxos/echo';

const db: Database.Database = space.db;

db.add(doc); // Add objects
db.query(Query.type(Document)); // Query objects
db.query(Filter.type(Document)); // Query with filter
db.getObjectById(id); // Get by ID
db.remove(doc); // Remove objects
db.makeRef<Document>(dxn); // Create hydrated reference
await db.flush(); // Flush changes
await db.flush({ indexes: true, updates: true });
```

---

## Complete Example

```ts
import { Schema } from 'effect';
import { Type, Obj, Relation, Entity, Filter, Query, Ref, Annotation } from '@dxos/echo';

// Define schemas
const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
}).pipe(
  Type.object({ typename: 'example.com/type/Person', version: '0.1.0' }),
  Annotation.LabelAnnotation.set(['name']),
);

const Task = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
  assignee: Schema.optional(Type.Ref(Person)),
}).pipe(Type.object({ typename: 'example.com/type/Task', version: '0.1.0' }));

interface Person extends Schema.Schema.Type<typeof Person> {}
interface Task extends Schema.Schema.Type<typeof Task> {}

// Create objects
const alice = Obj.make(Person, { name: 'Alice', email: 'alice@example.com' });
const task = Obj.make(Task, {
  title: 'Review PR',
  completed: false,
  assignee: Ref.make(alice),
});

// Mutate within change context
Obj.change(task, (t) => {
  t.completed = true;
});

// Type-safe access
const doSomething = (entity: Entity.Unknown) => {
  if (Obj.instanceOf(Task, entity)) {
    console.log(entity.title); // TypeScript knows this is Task
  }
};

// Query (with Database)
const incompleteTasks = db.query(Query.type(Task, { completed: false }).orderBy(Order.asc('title')).limit(10));

// Subscribe to query results
const subscription = incompleteTasks.subscribe((tasks) => {
  console.log('Tasks updated:', tasks);
});
```
