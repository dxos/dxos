# Operations

An operation is a schema-typed, Effect-based unit of work. Definition and handler are split.

## Definition (`src/operations/definitions.ts`)

```ts
import * as Schema from 'effect/Schema';
import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Foo } from '../types';

export const Create = Operation.make({
  meta: {
    key: 'com.example.function.foo.create',
    name: 'Create Thing',
    description: 'Creates a new thing.',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Foo.Thing,
  services: [Database.Service],
});

export const Move = Operation.make({
  meta: { key: 'com.example.function.foo.move', name: 'Move', description: '...' },
  input: Schema.Struct({
    thing: Ref.Ref(Foo.Thing),
    move: Schema.String.annotations({ description: 'The move to make.', examples: ['e4'] }),
  }),
  output: Schema.Struct({ pgn: Schema.String }),
  services: [Database.Service],
});
```

## Handler (one file per operation, default export)

```ts
// src/operations/create.ts
import * as Effect from 'effect/Effect';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Foo } from '../types';
import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name }) {
      return yield* Database.add(Foo.make({ name }));
    }),
  ),
);

export default handler;
```

## Barrel (`src/operations/index.ts`)

```ts
import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./move'),
);

export { Create, Move } from './definitions';
export const FooHandlers = Handlers;
```

Why two layers? Definitions are imported by **anyone** (UI, blueprints, CLI, tests) and must stay light. Handlers contain the heavy code path (HTTP, AI, DB writes) and are loaded lazily only when invoked.

## Wire as a capability

```ts
// src/capabilities/operation-handler.ts
import * as Effect from 'effect/Effect';
import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/operation';

import { FooHandlers } from '#operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, FooHandlers);
  }),
);
```

Then `AppPlugin.addOperationHandlerModule({ activate: OperationHandler })` in your plugin file.

## Services

The `services` array on a definition declares what the handler will need. Common ones:

- `Database.Service` — read/write ECHO objects.
- `AiService` — LLM inference (see [ai-service.md](./ai-service.md)).
- Custom services for external APIs (declared via `Effect.Tag`).

## Invoking

- From the UI: `useOperationInvoker()` (returns `(op, input) => Promise<output>`).
- From a test: `harness.invoke(Op, input)`.
- From another operation: `yield* Operation.invoke(Op, input)`.
- From an agent: register in a blueprint's tools.
