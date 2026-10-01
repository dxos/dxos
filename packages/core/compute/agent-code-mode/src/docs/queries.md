# Queries

Every query runs the same way: build it, then `yield* Database.query(query).run`, which returns an
array. `Filter.*` builds a filter; `Query.select(filter)` turns one into a query you can chain;
`Database.query` takes either.

```js
const Task = yield * Database.resolve('dxn:com.example.type.task:0.1.0');
const open = yield * Database.query(Filter.type(Task, { status: 'open' })).run;
yield * print('open', open.length);
```

## By type and properties

The second argument of `Filter.type` matches property values. A plain value matches exactly; a
comparison matches a range:

```js
Filter.type(Task, { status: 'open' });
Filter.type(Task, { priority: Filter.gt(3) }); // also gte, lt, lte, neq
Filter.type(Task, { priority: Filter.between(1, 5) });
Filter.type(Task, { tags: Filter.contains('urgent') }); // an array field that holds the value
```

## By id

```js
const [task] = yield * Database.query(Filter.id(id)).run;
```

## Combining filters

Put alternatives for one field inside that field's filter, and use `Filter.and` / `Filter.not` to
combine whole filters:

```js
Filter.type(Task, { status: Filter.or(Filter.eq('open'), Filter.eq('blocked')) });
Filter.and(Filter.type(Task), Filter.not(Filter.type(Task, { status: 'done' })));
```

`Filter.or` of two whole `Filter.type(...)` filters fails as `Query too complex`; write the
alternatives on the field instead, or run two queries.

## Ordering and limits

```js
const top =
  yield * Database.query(Query.select(Filter.type(Task)).orderBy(Order.property('priority', 'desc')).limit(3)).run;
```

`Order.natural()` is the database's own order; `.skip(n)` pages past the first `n`.

## Following references

`.reference(field)` moves from the selected objects to what their `Ref` field points at, and
`.referencedBy(Type, field)` moves to the objects whose `Ref` field points at the selection:

```js
const Person = yield * Database.resolve('dxn:com.example.type.person:0.1.0');
const owners = yield * Database.query(Query.select(Filter.type(Task, { status: 'open' })).reference('owner')).run;
const adasTasks =
  yield * Database.query(Query.select(Filter.type(Person, { name: 'Ada' })).referencedBy(Task, 'owner')).run;
```

## Relations

`.sourceOf(Relation)` selects the relations whose source is in the selection, `.targetOf(Relation)`
those whose target is; `.target()` and `.source()` then move to the other end:

```js
const Assigned = yield * Database.resolve('dxn:com.example.relation.assigned:0.1.0');
const assigned = yield * Database.query(Query.select(Filter.id(ada.id)).sourceOf(Assigned)).run;
const tasks = yield * Database.query(Query.select(Filter.id(ada.id)).sourceOf(Assigned).target()).run;
yield * print(assigned.map((relation) => relation.role));
```

Pass the relation's own fields to narrow it: `.sourceOf(Assigned, { role: 'reviewer' })`.

## Parents and children

```js
const children = yield * Database.query(Query.select(Filter.id(project.id)).children()).run;
const tasksOf = yield * Database.query(Filter.and(Filter.type(Task), Filter.childOf(project))).run;
const roots = yield * Database.query(Filter.and(Filter.type(Task), Filter.hasParent(false))).run;
```

`Filter.childOf` also matches grandchildren; pass `{ transitive: false }` for direct children only.
`Obj.getParent(obj)` reads one object's parent without a query.

## Counting

There is no count query to reach for: run the query and print `.length`.
