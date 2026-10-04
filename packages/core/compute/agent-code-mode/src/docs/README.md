# Code mode (Effect dialect)

Your `eval` code is the body of an `Effect.gen` generator: `yield*` works, and you must not write
the wrapper. Only what you `print` comes back to you, capped per call.

These docs are a plain object of markdown strings. Read what you need instead of guessing:

```js
yield* print(Object.keys(DOCS));
yield* print(DOCS['queries.md']);
yield* print(DOCS['operations.md'].slice(0, 400));
```

| File                    | Covers                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `README.md`             | How to read and grep these docs, and how everything is addressed by DXN.     |
| `database.md`           | Resolving types; creating, updating, deleting; refs, relations, parents.     |
| `queries.md`            | Filters, comparisons, ordering, limits, following refs, relations, children. |
| `operations.md`         | Resolving an operation by DXN and invoking it.                               |
| `errors.md`             | Failures, `Effect.result`, and the mistakes that cost a call.                |
| `catalog/types.md`      | Every type this workspace can resolve: its DXN, kind and fields.             |
| `catalog/operations.md` | Every operation this turn can resolve: its DXN, description and input.       |

The two `catalog/` files are generated for each call from what is actually registered, so they are
the source of truth for which DXNs exist.

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

## Listing every type and operation

```js
const typeKeys = DOCS['catalog/types.md'].match(/dxn:[^\s`]+/g);
const operationKeys = DOCS['catalog/operations.md'].match(/dxn:[^\s`']+/g) ?? [];
yield* print(typeKeys.length, 'types;', operationKeys.length, 'operations');
yield* print(DOCS['catalog/types.md'].split('\n').filter((line) => line.includes('organization')).join('\n'));
```

## Everything is addressed by DXN

A type and an operation are both resolved the same way — by their DXN, through the database:

```js
const Task = yield* Database.resolve('dxn:com.example.type.task:0.1.0');
const Score = yield* Database.resolve('dxn:com.example.operation.score');
```

The system prompt and the `catalog/` files list every registered type and every bound operation
with its DXN. Use that DXN exactly, version included: a type's DXN without its version, or a DXN not
listed there, does not resolve.
