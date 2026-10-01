# Database

## Types

Resolve a type by its DXN before you query or create objects of it. The result is the type itself,
the same value `Filter.type` and `Obj.make` take:

```js
const Task = yield * Database.resolve('dxn:com.example.type.task:0.1.0');
```

## Query

```js
const open = yield * Database.query(Filter.type(Task, { status: 'open' })).run;
yield * print('open', open.length);
```

The second argument of `Filter.type` matches exact property values. To fetch one object whose id
you hold:

```js
const [task] = yield * Database.query(Filter.id(id)).run;
```

## Create

`Obj.make` builds an object; `Database.add` stores it and returns the stored object.

```js
const created = yield * Database.add(Obj.make(Task, { title: 'New', status: 'open' }));
yield * print('created', created.id);
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
yield * Database.remove(task);
```

## Flush

Call `yield* Database.flush()` after writing and before printing a final confirmation, so what you
report is what was stored.
