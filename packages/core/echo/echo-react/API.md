# DXOS ECHO React API

## Imports

```ts
import {
  useObject, // Subscribe to a single Echo object or Ref
  useQuery, // Reactive query subscription
  useType, // Type (schema registry) subscription
} from '@dxos/echo-react';
```

---

## useObject

Subscribe to an Echo object or Ref. Returns a snapshot and an update callback.

### Subscribing to an object

```ts
const [person, update] = useObject(obj);
person.name; // snapshot value -- re-renders on any change
```

### Subscribing to a specific property

Only re-renders when the subscribed property changes.

```ts
const [name, setName] = useObject(obj, 'name');
```

### Subscribing to a Ref

Automatically dereferences the Ref and handles async loading. A deleted target reads as `undefined`,
the same as a target that has not loaded — deleted objects are invisible by default throughout the
API.

```ts
const [assignee, setAssignee] = useObject(task.assignee);
assignee?.name; // undefined until the Ref loads, and undefined if the target is deleted

const [ghost] = useObject(task.assignee, { deleted: 'include' }); // resolves a tombstoned target
```

### Updating objects

The update callback wraps `Obj.update` internally.

```ts
// Mutate via callback
update((obj) => {
  obj.name = 'Alice';
});

// Property: set directly
setName('Alice');

// Property: mutate via callback
setName((name) => name.toUpperCase());
```

### Handling undefined

All signatures accept `undefined` and return `undefined` when the input is not available.

```ts
const [value] = useObject(maybePerson); // Obj.Snapshot<Person> | undefined
const [name] = useObject(maybePerson, 'name'); // string | undefined
const [target] = useObject(maybeRef); // Obj.Snapshot<T> | undefined
```

---

## useQuery

Create a reactive subscription to a database query or filter.

### With a Query

```ts
const tasks = useQuery(space.db, Query.type(Task));
```

### With a Filter

```ts
const tasks = useQuery(space.db, Filter.type(Task, { completed: false }));
```

### Notes

- Accepts both `Query` and `Filter` objects (filters are converted to queries internally).
- The query is memoized based on its AST -- no need to wrap with `useMemo`.
- Returns an empty array when `resource` is `undefined`.
- Deleted objects are excluded by default; opt in with `Query.type(Task).options({ deleted: 'include' })`.

### Counting

Cardinality is a query, order is the array: when the UI shows a count, take it from a `useQuery`
result, never from the length of a ref array. The query count is answered from the index and only
moves on real writes and replication; a ref array's length varies with which targets happen to be
loaded locally.

```ts
const members = useQuery(space.db, Filter.childOf(taskSet));
members.length; // stable count, deletion respected
taskSet.tasks.length; // locally visible entries -- not a number to display
```

---

## useType

Subscribe to type changes from a database's schema registry.

```ts
const type = useType(space.db, 'com.example.type.task');
```

### Notes

- Searches both `database` and `runtime` schema locations.
- Returns `undefined` if either `db` or `typename` is not provided, or if the typename is not found.

---

## Type Reference

### Callback types

```ts
interface ObjectUpdateCallback<T> {
  (update: (obj: Obj.Mutable<T>) => void): void;
  (update: (obj: Obj.Mutable<T>) => Obj.Mutable<T>): void;
}

interface ObjectPropUpdateCallback<T> {
  (update: (value: Obj.Mutable<T>) => void): void;
  (update: (value: Obj.Mutable<T>) => Obj.Mutable<T>): void;
  (newValue: T): void;
}
```

### useObject signatures

| Signature                  | Input                                | Return                                                    |
| -------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `useObject(ref)`           | `Ref.Ref<T>`                         | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(ref)`           | `Ref.Ref<T> \| undefined`            | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(obj)`           | `T`                                  | `[Obj.Snapshot<T>, ObjectUpdateCallback<T>]`              |
| `useObject(obj)`           | `T \| undefined`                     | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(objOrRef)`      | `T \| Ref.Ref<T>`                    | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(obj, property)` | `T, K`                               | `[T[K], ObjectPropUpdateCallback<T[K]>]`                  |
| `useObject(obj, property)` | `T \| undefined, K`                  | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |
| `useObject(ref, property)` | `Ref.Ref<T>, K`                      | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |
| `useObject(ref, property)` | `Ref.Ref<T> \| undefined, K`         | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |
| `useObject(ref, options)`  | `Ref.Ref<T>, { deleted: 'include' }` | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |

### useQuery signatures

| Signature                    | Input                                     | Return     |
| ---------------------------- | ----------------------------------------- | ---------- |
| `useQuery(resource, query)`  | `Database.Queryable \| undefined, Query`  | `Entity[]` |
| `useQuery(resource, filter)` | `Database.Queryable \| undefined, Filter` | `Entity[]` |

### useType signature

| Signature                 | Input                                                 | Return                   |
| ------------------------- | ----------------------------------------------------- | ------------------------ |
| `useType(db?, typename?)` | `Database.Database \| undefined, string \| undefined` | `Type.Type \| undefined` |
