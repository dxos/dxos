# References

A `Ref<typename>` field holds a reference to another object — never the object's id or a URI
string. Make one from an object you hold with `Ref.make(obj)`, creating the target first:

```js
const Person = yield * Database.resolve('dxn:com.example.type.person:0.1.0');
const Task = yield * Database.resolve('dxn:com.example.type.task:0.1.0');

const owner = yield * Database.add(Obj.make(Person, { name: 'Ada' }));
yield * Database.add(Obj.make(Task, { title: 'Review', status: 'open', owner: Ref.make(owner) }));
```

## Loading

Read a reference back with `Database.load`:

```js
const owner = yield * Database.load(task.owner);
```

## Refs to deleted objects

A ref array can point at objects that were deleted, and one failed load fails the whole program.
Load such arrays one ref at a time through `Effect.result` (see `errors.md`):

```js
for (const ref of taskSet.tasks) {
  const loaded = yield * Effect.result(Database.load(ref));
  if (loaded._tag === 'Failure') {
    yield * print('missing', ref.uri);
    continue;
  }
  yield * print(loaded.success.title);
}
```
