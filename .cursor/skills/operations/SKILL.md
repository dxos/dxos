---
name: dxos-operations
description: >-
  Guide for defining and implementing Operations in DXOS. Use when creating
  operation definitions, writing handlers, structuring operation modules,
  using OperationHandlerSet, or migrating from the old FunctionDefinition API.
---

# DXOS Operations

## What is an Operation?

An Operation is the unit of callable logic in DXOS. It combines a **definition** (typed schema + metadata) with a **handler** (Effect-based runtime logic). Operations replace the older `FunctionDefinition` / `defineFunction` API.

Key properties:

- **Type-safe**: Input and output are `effect/Schema` types.
- **Effect-native**: Handlers return `Effect.Effect`, enabling composable error handling, service injection, and concurrency.
- **Serializable definitions**: Definitions carry no runtime logic and can be shared across packages, serialized to ECHO, or sent over the wire.
- **Lazy-loadable handlers**: Handler modules use dynamic `import()` so code is loaded only when invoked.

Import: `import { Operation, OperationHandlerSet } from '@dxos/operation';`

## Defining an Operation

Use `Operation.make` to create a definition. Definitions live in a separate file from handlers.

```ts
import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

export const MyOperation = Operation.make({
  meta: {
    key: 'com.example/operation/my-operation',
    name: 'MyOperation',
    description: 'Does something useful',
  },
  input: Schema.Struct({
    value: Schema.Number,
  }),
  output: Schema.Struct({
    result: Schema.String,
  }),
  services: [Database.Service],
});
```

### `Operation.make` options

| Field              | Required | Default   | Description                                            |
| ------------------ | -------- | --------- | ------------------------------------------------------ |
| `meta.key`         | yes      | —         | Globally unique key (reverse-domain style).            |
| `meta.name`        | no       | —         | Human-readable name.                                   |
| `meta.description` | no       | —         | Short description.                                     |
| `input`            | yes      | —         | `effect/Schema` for the input payload.                 |
| `output`           | yes      | —         | `effect/Schema` for the return value.                  |
| `executionMode`    | no       | `'async'` | `'sync'` or `'async'`.                                 |
| `types`            | no       | `[]`      | ECHO types the operation uses (registered at runtime). |
| `services`         | no       | `[]`      | Effect `Context.Tag`s required by the handler.         |

## Writing a Handler

Each handler file default-exports the definition piped through `Operation.withHandler`.
The handler function receives the decoded input and returns an `Effect`.

```ts
import * as Effect from 'effect/Effect';
import { Operation } from '@dxos/operation';
import { MyOperation } from './definitions';

export default MyOperation.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ value }) {
      return { result: String(value * 2) };
    }),
  ),
);
```

### Handler patterns

**Simple handler** (no services):

```ts
export default MyOp.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      return { result: process(input) };
    }),
  ),
);
```

**Handler with Effect services**:

```ts
export default MyOp.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      const db = yield* Database.Service;
      // use db...
      return { result: 'ok' };
    }),
  ),
);
```

**Handler with `Schema.Any` input/output** (pass-through):

```ts
export default EchoOp.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      return input;
    }),
  ),
);
```

Note: Services need to be explicitly listed in the operation definition.

## File Structure

Follow this layout (see `packages/core/functions/src/example/` for reference):

```
my-operations/
├── definitions.ts      # All Operation.make() definitions (no handlers)
├── handler-a.ts        # Default-exports definition with handler attached
├── handler-b.ts        # One handler per file
└── index.ts            # Re-exports definitions + creates OperationHandlerSet
```

### `definitions.ts` — Pure definitions, no runtime logic

```ts
import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

export const OpA = Operation.make({
  meta: { key: 'com.example/op-a', name: 'OpA' },
  input: Schema.Struct({ n: Schema.Number }),
  output: Schema.Struct({ result: Schema.String }),
});

export const OpB = Operation.make({
  meta: { key: 'com.example/op-b', name: 'OpB' },
  input: Schema.Any,
  output: Schema.Any,
});
```

### `handler-a.ts` — Single handler, default export

```ts
import * as Effect from 'effect/Effect';
import { Operation } from '@dxos/operation';
import { OpA } from './definitions';

export default OpA.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ n }) {
      return { result: String(n) };
    }),
  ),
);
```

### `index.ts` — Barrel with lazy handler set

```ts
import { OperationHandlerSet } from '@dxos/operation';
export * from './definitions';

export const MyHandlers = OperationHandlerSet.lazy(
  () => import('./handler-a'),
  () => import('./handler-b'),
);
```

## OperationHandlerSet

Groups handlers for registration with the runtime. The type for a handler set is `OperationHandlerSet.OperationHandlerSet`.

Whenever you need to pass around a collection of handlers (test layers, registration, etc.), use `OperationHandlerSet.OperationHandlerSet` as the type — never `Operation.WithHandler<...>[]`.

| Factory                          | Use case                                      |
| -------------------------------- | --------------------------------------------- |
| `OperationHandlerSet.lazy(...)`  | Lazy-load handler modules via dynamic import. |
| `OperationHandlerSet.make(...)`  | Wrap already-resolved handlers.               |
| `OperationHandlerSet.merge(...)` | Combine multiple sets into one.               |

```ts
import { OperationHandlerSet } from '@dxos/operation';

// Merge multiple sets.
const AllHandlers = OperationHandlerSet.merge(FeatureAHandlers, FeatureBHandlers);

// Wrap resolved handlers (e.g. for tests).
const TestHandlers = OperationHandlerSet.make(MyHandler, OtherHandler);

// Accept as a parameter.
const setup = (handlers: OperationHandlerSet.OperationHandlerSet) => { ... };
```

## Invoking Operations

Inside an Effect handler, use the `Operation.Service`:

```ts
// Invoke another operation
const result = yield * Operation.invoke(OtherOp, { data: 'hello' });

// Schedule a fire-and-forget followup
yield * Operation.schedule(AnalyticsOp, { event: 'completed' });
```

## Migration from FunctionDefinition

The `FunctionDefinition` / `defineFunction` API is replaced by `Operation`.

### Definition

**Before** (`defineFunction`):

```ts
import { defineFunction } from '@dxos/functions';
import * as Schema from 'effect/Schema';

export const myFunc = defineFunction({
  key: 'com.example/function/my-func',
  name: 'MyFunc',
  description: 'Does something',
  inputSchema: Schema.Struct({ value: Schema.Number }),
  outputSchema: Schema.Struct({ result: Schema.String }),
  handler: ({ data }) => {
    return { result: String(data.value) };
  },
});
```

**After** (`Operation.make` + `Operation.withHandler`):

```ts
// definitions.ts
import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

export const MyFunc = Operation.make({
  meta: {
    key: 'com.example/function/my-func',
    name: 'MyFunc',
    description: 'Does something',
  },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ result: Schema.String }),
});
```

```ts
// my-func.ts
import * as Effect from 'effect/Effect';
import { Operation } from '@dxos/operation';
import { MyFunc } from './definitions';

export default MyFunc.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ value }) {
      return { result: String(value) };
    }),
  ),
);
```

### Handler input

Operation handlers receive the input directly, not wrapped in `{ data }`:

```ts
// Old (FunctionDefinition) — input wrapped in { data, context }:
handler: ({ data: { a, b } }) => a + b

// New (Operation) — input passed directly:
Operation.withHandler(Effect.fn(function* ({ a, b }) {
  return a + b;
}))
```

### Key differences

| Aspect               | `FunctionDefinition`                         | `Operation`                                                                       |
| -------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Import               | `@dxos/functions`                            | `@dxos/operation`                                                                 |
| Create definition    | `defineFunction({ ... })`                    | `Operation.make({ ... })`                                                         |
| Schema fields        | `inputSchema` / `outputSchema`               | `input` / `output`                                                                |
| Metadata             | Top-level `key`, `name`, `description`       | Nested under `meta: { key, name, description }`                                   |
| Handler              | Inline `handler` property                    | Separate: `Operation.withHandler(handler)`                                        |
| Handler input        | `({ context, data }) => ...`                 | `Effect.fn(function* (input) { ... })`                                            |
| Handler return       | Plain value, Promise, or Effect              | Always `Effect`                                                                   |
| Services             | `string[]` keys                              | `Context.Tag[]` references                                                        |
| File structure       | Single file with definition + handler        | Split: `definitions.ts` + per-handler files                                       |
| Type                 | `FunctionDefinition<I, O>`                   | `Operation.Definition<I, O>` or `Operation.WithHandler<Operation.Definition.Any>` |
| Persistent ECHO type | `Function.Function` (from `@dxos/functions`) | `Operation.PersistentOperation` (from `@dxos/operation`)                          |
| Handler set          | N/A                                          | `OperationHandlerSet.lazy(...)`                                                   |
