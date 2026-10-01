# Code mode (Effect dialect)

Your `eval` code is the body of an `Effect.gen` generator: `yield*` works, and you must not write
the wrapper. Only what you `print` comes back to you.

These docs are a plain object of markdown strings. Read what you need instead of guessing:

```js
yield* print(Object.keys(DOCS));
yield* print(DOCS['database.md']);
yield* print(DOCS['operations.md'].slice(0, 400));
```

| File            | Covers                                                          |
| --------------- | --------------------------------------------------------------- |
| `database.md`   | Resolving types, querying, creating, updating and deleting.     |
| `references.md` | `Ref` fields: creating, loading, and refs to deleted objects.   |
| `operations.md` | Resolving an operation by DXN and invoking it.                  |
| `errors.md`     | Failures, `Effect.result`, and the mistakes that cost a call.   |

## Everything is addressed by DXN

A type and an operation are both resolved the same way — by their DXN, through the database:

```js
const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
const Score = yield* Database.resolve('dxn:com.example.operation.score');
```

The system prompt lists every registered type and every bound operation with its DXN. Use that DXN
exactly, version included: a type's DXN without its version, or a DXN not listed there, does not
resolve.
