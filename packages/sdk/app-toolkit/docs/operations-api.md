# Operations API

## What Are Operations?

Operations are the compute layer of Composer. They define what can happen in the application — creating objects, updating state, triggering workflows. They are typed, decoupled from UI, and invocable by other plugins and AI assistants.

Operations decouple the _what_ from the _how_: any plugin can invoke an operation without knowing which plugin implements it. The framework's operation dispatcher routes invocations to the registered handler.

## How Operations Fit Together

```
Definition ──> Handler ──> HandlerSet ──> Plugin Registration
     │              │            │                │
Operation.make()  withHandler  lazy()    addOperationHandlerModule
```

1. **Define** the operation contract (input/output schemas).
2. **Implement** a handler for the operation.
3. **Register** handlers as a lazy-loaded set.
4. **Contribute** the set via the plugin definition.

## Core API: `@dxos/operation`

### `Operation.make(options)`

Creates a typed operation definition.

```typescript
import { Operation } from '@dxos/operation';

export const CreateItem = Operation.make({
  // Globally unique key, typically `${meta.id}.operation.{name}`.
  meta: { key: 'org.dxos.plugin.example.operation.create-item', name: 'Create Item' },
  // Optional: capabilities required by the handler.
  services: [Capability.Service],
  // Input schema — validated before the handler runs.
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  // Output schema — validated after the handler returns.
  output: Schema.Struct({
    object: Schema.Any,
  }),
});
```

### `Operation.withHandler(fn)`

Wraps an operation definition with an implementation.

```typescript
const handler: Operation.WithHandler<typeof CreateItem> = CreateItem.pipe(
  Operation.withHandler(({ name }) =>
    Effect.sync(() => {
      const object = Item.make({ name });
      return { object };
    }),
  ),
);

// Each handler file must export default for lazy loading.
export default handler;
```

### `Operation.invoke(operation, input)`

Invokes an operation from within an Effect context (e.g., inside another handler or graph action).

```typescript
yield * Operation.invoke(SpaceOperation.AddObject, { object, target: collection });
```

### `OperationHandlerSet.lazy(...imports)`

Registers handler modules for lazy loading. Each module must `export default` a handler.

```typescript
import { OperationHandlerSet } from '@dxos/operation';

export const MyOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-item'),
  () => import('./delete-item'),
);
```

## App-Toolkit Helper: `AppPlugin.addOperationHandlerModule`

Registers the handler set with the framework during the `SetupOperationHandler` activation event.

```typescript
import { AppPlugin } from '@dxos/app-toolkit';

export const MyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  // ...
);
```

## Invoking from React

Use `useOperationInvoker` to invoke operations from components:

```typescript
import { useOperationInvoker } from '@dxos/app-framework/ui';

const { invokePromise } = useOperationInvoker();
await invokePromise(MyOperation.CreateItem, { name: 'New Item' });
```

## File Organization Convention

```
src/operations/
  definitions.ts         # All Operation.make() definitions
  create-item.ts         # Handler for CreateItem (export default)
  delete-item.ts         # Handler for DeleteItem (export default)
  index.ts               # OperationHandlerSet.lazy() + re-export definitions
```

## Examples

- **plugin-exemplar**: [`src/operations/`](../../plugins/plugin-exemplar/src/operations/) — Simple create and update operations.
- **plugin-kanban**: [`src/operations/`](../../plugins/plugin-kanban/src/operations/) — Delete/restore operations with undo support.
- **plugin-space**: [`src/operations/`](../../plugins/plugin-space/src/operations/) — Complex operations for space management.
