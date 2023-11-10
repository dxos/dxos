## Warp database

Each space contains a number of object identified by a unique id within that space.

Upon creation objects define a type (e.g. `example:task`) and a model.

The default model is DocumentModel.
TextModel is another type of model that represents rich text with concurrent editing.
Other custom models may be define: chat (log) model, chess model, etc.

### DocumentModel

DocumentModel is the default model for objects.
DocumentModel associates a protobuf message type to every object type.
Objects must adhere to the schema defined in protobuf, following protobuf semantics.
Unknown fields must be ignored by the application, but preserved in the serialized state.

Objects may have typed references to other objects in the database.
References may be strong or weak.
Strong references are guranteed to hold a reference to a valid object in the database.
Weak references may dangle.
Weak references may reference objects in other spaces.
Strong references may only reference objects in the same space.

- Parent-child relationship
- Modeling links

### Schema 

Schema is defined in protobuf syntax, using annotations to denote database semantics.

Example:

```protobuf
[dxos.object = true]
message Project {
  [dxos.ref = true]
  repeated Task tasks = 1;
}

[dxos.object = true]
message Task {
  string content = 1;

  dxos.echo.TextModel description = 2; // yJS rich text.

  Person assignee = 1; // Weak ref

  [dxos.ref = true];
  [dxos.order = ORDERED]; // Ordering semantics.
  repeated Task subtasks = 3;
}

[dxos.object = true]
message Person {
  string name = 1;
}

[dxos.object = true]
message Org {

}

// A way to model links in the object graph.
[dxos.object = true]
message OrgPersonLink { 
  [dxos.parent = true]
  Person person = 1; // Instances of OrgPersonLink will become children of the referenced Person.

  Org org = 2;
}


```

### Replication model

The changes in the database are replicated as mutations stored within feeds.
Each mutation is a batch of atomic updates to one or more objects.
Each feed is identified by a public key.
Each mutation in a feed is assigned a unique sequence number.
A tuple of (feedKey, sequenceNumber) is a stable and unique identifier for the mutation.

Database state is computed by processing mutations.
The state is identified by a Timeframe - a series of (feedKey, seqNumber) tuples, they correspond to the last mutation processed from each feed.
Timeframe uniquely identifies the state of the database at a given point in time.

The earlier mutations in data feeds may be pruned and replaced by a snapshot.
A snapshot is a reified state of the database based on mutations from multiple feeds at a particular timeframe.
Database might load the snapshot first, and then start processing mutations from feeds starting after the snapshot timeframe.

#### Partial loading

Database may load a only partial subset of items in a space.
The subset must load enough items to satisfy the all of the data integrity gurantees.
While processing feed mutations, changes to unloaded items may be ignored.

### Ordering

Each mutation contains a timeframe which must be satisfied before processing the mutation:
For example if mutation C3 has timeframe (A2, B1), then mutations A2 and B1 must be processed, before processing C3.

Mutations are ordered to satisfy their timeframes first. Timeframes define a partial order.

Full order is then created by sorting unordered mutations by feed keys (e.g. mutations from feed A are processed before feed B).
In case of big branches a custom order can be forced by creating an epoch with a snapshot.

### Rollback and reordering

Total order may cause reorders during processing.
For example: if mutations A3 and B3 are not comparable using timeframes, and B3 is discovered and processed before A3, when A3 is discovered it will need to be inserted before B3. This will cause a rollback in the state to process A3 first, and then B3.

Reorder depth is the amount of mutations that need to be reverted to correct the order. Shallow reorders have a small depth.

Shallow reorders will typically occur when multiple peers are actively editing the same data concurrently.
Deep reorders may occur when peers do not synchronize for a long amount of time.

Reorders can be resolved for different objects separately to not revert the state of the whole space.

### JavaScript API

A scaffolding is generated from the database schema.
Each object type generates a TypeScript class with typed getters and setters for properties defined in the schema.

Example:

```protobuf
package example;

message Task {
  string content = 1;
  Person assignee = 2;
  bool completed = 3;

  [dxos.ref = true];
  repeated Task subtasks = 34;
}
```

```typescript
class Task extends schema.WarpPrototype<Task$Fields>('example.task') {
  constructor(fields: Partial<Task$Fields>) {
    super(fields);
  }

  declare readonly id: string;

  declare content: string;

  declare assignee: Person; // Reference to another object.

  declare completed: boolean;

  declare subtasks: Task[]; // Depending on list ordering semantics may either be a set or an array.
}

// Field set used for initialization/traversal.
type Task$Fields = {
  content: string;
  assignee: Person;
  completed?: boolean;
  subtasks: Task[]
}
```

Assignment to properties generates a mutation.
Locally the change is applied immediately, and could be read back.
Multiple updates that happen in one event-loop cycle are batched together.

```typescript
const task: Task;

task.content = 'Fix bugs';
task.completed = true;

assert(task.content === 'Fix bugs');
```

Database manages object instances so there's at most one class instance with a given Id.
This means that they could be referentially compared (`task1 === task2`) and used as dependencies in `useEffect` and `useMemo` in react.

Establishing references between objects is done by assignment to reference fields:

```typescript
const task: Task;
const person: Person;

task.assignee = person;
```

Objects can be created by calling their constructor and then referencing them in the object graph.

```typescript
const mainTask: Task;

mainTask.subtasks.push(new Task({
  content: 'Fix flickering on iOS',
  assignee: mainTask.assignee
}))
```

Objects can be saved manually by calling `database.save`:

```typescript
const newTask = new Task({
  content: 'Release new version',
})

space.database.save(newTask)
```

### Mutation sequence

Updates go through following stages:

1. A property on an object is updated, the property is marked as "dirty".
2. Flush is triggered. All dirty field updates are collected into an UpdateBatch. Dirty fields are now marked as "pending". MutationBatch is sent to be recorded in the feed.
3. Mutation 