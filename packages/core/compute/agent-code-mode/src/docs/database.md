# Database

Reading is in `queries.md`; this file is about types and writing.

## Types

Resolve a type by its DXN before you query or create objects of it. The result is the type itself,
the same value `Filter.type`, `Obj.make` and `Relation.make` take:

```js
const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
```

## Create

`Obj.make` builds an object; `Database.add` stores it and returns the stored object.

```js
const created = yield* Database.add(Obj.make(Task, { title: 'New', status: 'open' }));
yield* print('created', created.id);
```

## Update

`Obj.update` is synchronous and is the only way to change a stored object. Assigning a property
outside it throws.

```js
Obj.update(task, (task) => {
  task.status = 'done';
});
```

## Delete

```js
yield* Database.remove(task);
```

## Flush

Call `yield* Database.flush()` after writing and before printing a final confirmation, so what you
report is what was stored.

## References

A `Ref<typename>` field holds a reference to another object — never the object's id or a URI
string. Make one from an object you hold with `Ref.make(obj)`, creating the target first:

```js
const Person = yield* Database.resolve('dxn:com.example.type.person:0.1.0');
const owner = yield* Database.add(Obj.make(Person, { name: 'Ada' }));
yield* Database.add(Obj.make(Task, { title: 'Review', status: 'open', owner: Ref.make(owner) }));
```

Read one back with `yield* Database.load(task.owner)`. A ref array can point at objects that were
deleted, and one failed load fails the whole program, so load such arrays one ref at a time
through `Effect.result` (see `errors.md`):

```js
for (const ref of project.tasks) {
  const loaded = yield* Effect.result(Database.load(ref));
  if (loaded._tag === 'Failure') {
    yield* print('missing', ref.uri);
    continue;
  }
  yield* print(loaded.success.title);
}
```

## Relations

A relation is a stored edge with its own type and fields, from a source object to a target object.
The system prompt marks relation types as such. Pass the endpoints under the `Relation.Source` and
`Relation.Target` keys:

```js
const Assigned = yield* Database.resolve('dxn:com.example.relation.assigned:0.1.0');
yield* Database.add(Relation.make(Assigned, { [Relation.Source]: owner, [Relation.Target]: task, role: 'reviewer' }));
```

`Relation.getSource(relation)` and `Relation.getTarget(relation)` read the endpoints back. Finding
the relations of an object is a query — see `queries.md`.

## Parents

An object can have one parent. The parent must already hold a ref to the child, so add the child
to the parent's ref field first, then set the parent:

```js
Obj.update(project, (project) => {
  project.tasks = [...project.tasks, Ref.make(task)];
});
Obj.setParent(task, project);
yield* print(Obj.getParent(task)?.name);
```

Finding the children of an object is a query — see `queries.md`.
