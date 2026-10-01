# Code mode (Effect dialect)

Your `eval` code is the body of an `Effect.gen` generator: `yield*` works, and you must not write
the wrapper. Only what you `print` comes back to you, capped per call.

These docs are a plain object of markdown strings. Read what you need instead of guessing:

```js
yield* print(Object.keys(DOCS));
yield* print(DOCS['queries.md']);
yield* print(DOCS['operations.md'].slice(0, 400));
```

| File            | Covers                                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| `database.md`   | Resolving types; creating, updating, deleting; refs, relations, parents.      |
| `queries.md`    | Filters, comparisons, ordering, limits, following refs, relations, children.  |
| `operations.md` | Resolving an operation by DXN and invoking it.                                |
| `errors.md`     | Failures, `Effect.result`, and the mistakes that cost a call.                 |

## Searching the docs

Grep every file for a pattern and print the matching lines with their file and line number, rather
than printing whole files:

```js
const grep = (pattern) =>
  Object.entries(DOCS).flatMap(([file, text]) =>
    text.split('\n').flatMap((line, index) => (pattern.test(line) ? [`${file}:${index + 1}: ${line}`] : [])),
  );
yield* print(grep(/Relation\.make|sourceOf/).join('\n'));
```

Then print the section around a hit: `DOCS['queries.md'].split('\n').slice(40, 70).join('\n')`.

## Everything is addressed by DXN

A type and an operation are both resolved the same way — by their DXN, through the database:

```js
const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
const Score = yield* Database.resolve('dxn:com.example.operation.score');
```

The system prompt lists every registered type and every bound operation with its DXN. Use that DXN
exactly, version included: a type's DXN without its version, or a DXN not listed there, does not
resolve.
