# @dxos/operation

Unified Operation Primitives for DXOS.

## Overview

This package provides the core primitives for defining and executing operations that can run both locally (as Intents) and remotely (as Functions).

## Usage

```typescript
import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

// Define an operation
const CreateSpace = Operation.make({
  schema: {
    input: Schema.Struct({ name: Schema.String }),
    output: Schema.Struct({ id: Schema.String }),
  },
  meta: {
    key: 'space.create',
    name: 'Create Space',
    description: 'Creates a new space',
  },
});

// Attach a handler (direct call)
const createSpaceWithHandler = Operation.withHandler(CreateSpace, (input) => 
  Effect.gen(function* () {
    // ... implementation
    return { id: 'space-id' };
  })
);

// Or use in a pipe (piped call)
import * as Function from 'effect/Function';
const createSpaceWithHandler2 = Function.pipe(
  CreateSpace,
  Operation.withHandler((input) => 
    Effect.gen(function* () {
      // ... implementation
      return { id: 'space-id' };
    })
  )
);
```

## API

- `Operation.make<I, O>(props)` - Creates a new operation definition
- `Operation.withHandler<I, O, E, R>(op, handler)` - Attaches a handler to an operation (direct call)
- `Operation.withHandler<I, O, E, R>(handler)` - Returns a function for piped usage
- `OperationDefinition<I, O>` - The operation definition interface
- `OperationHandler<I, O, E, R>` - The handler type
