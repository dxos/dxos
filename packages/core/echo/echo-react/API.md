# DXOS ECHO React API

## Imports

```ts
import {
  useObject, // Subscribe to a single Echo object or Ref
  useObjects, // Subscribe to multiple Refs
  useQuery, // Reactive query subscription
  useSchema, // Schema registry subscription
} from '@dxos/echo-react';
```

---

## useObject

Subscribe to an Echo object or Ref. Returns a snapshot and an update callback.

### Subscribing to an object

```ts
const [person, change] = useObject(obj);
person.name; // snapshot value -- re-renders on any change
```

### Subscribing to a specific property

Only re-renders when the subscribed property changes.

```ts
const [name, setName] = useObject(obj, 'name');
```

### Subscribing to a Ref

Automatically dereferences the Ref and handles async loading.

```ts
const [assignee, setAssignee] = useObject(task.assignee);
assignee?.name; // undefined until the Ref loads
```

### Updating objects

The change callback wraps `Obj.change` internally.

```ts
// Mutate via callback
change((obj) => {
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

## useObjects

Subscribe to multiple Refs' target objects. Returns loaded snapshots, filtering out unloaded refs.

```ts
const snapshots = useObjects(task.watchers);
snapshots.length; // only includes refs that have loaded
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

---

## useSchema

Subscribe to schema changes from a database's schema registry.

```ts
const schema = useSchema(space.db, 'com.example.type.task');
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

| Signature                  | Input                        | Return                                                    |
| -------------------------- | ---------------------------- | --------------------------------------------------------- |
| `useObject(ref)`           | `Ref.Ref<T>`                 | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(ref)`           | `Ref.Ref<T> \| undefined`    | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(obj)`           | `T`                          | `[Obj.Snapshot<T>, ObjectUpdateCallback<T>]`              |
| `useObject(obj)`           | `T \| undefined`             | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(objOrRef)`      | `T \| Ref.Ref<T>`            | `[Obj.Snapshot<T> \| undefined, ObjectUpdateCallback<T>]` |
| `useObject(obj, property)` | `T, K`                       | `[T[K], ObjectPropUpdateCallback<T[K]>]`                  |
| `useObject(obj, property)` | `T \| undefined, K`          | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |
| `useObject(ref, property)` | `Ref.Ref<T>, K`              | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |
| `useObject(ref, property)` | `Ref.Ref<T> \| undefined, K` | `[T[K] \| undefined, ObjectPropUpdateCallback<T[K]>]`     |

### useObjects signature

| Signature          | Input                   | Return              |
| ------------------ | ----------------------- | ------------------- |
| `useObjects(refs)` | `readonly Ref.Ref<T>[]` | `Obj.Snapshot<T>[]` |

### useQuery signatures

| Signature                    | Input                                     | Return     |
| ---------------------------- | ----------------------------------------- | ---------- |
| `useQuery(resource, query)`  | `Database.Queryable \| undefined, Query`  | `Entity[]` |
| `useQuery(resource, filter)` | `Database.Queryable \| undefined, Filter` | `Entity[]` |

### useSchema signature

| Signature                   | Input                                                 | Return                        |
| --------------------------- | ----------------------------------------------------- | ----------------------------- |
| `useSchema(db?, typename?)` | `Database.Database \| undefined, string \| undefined` | `Type.AnyEntity \| undefined` |
