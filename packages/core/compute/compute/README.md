# @dxos/compute

Umbrella package for AI-aware DXOS compute primitives.

## Usage

Importing from `@dxos/compute` is equivalent to importing from the underlying
source packages. Namespaces preserve their nesting — there is no extra wrapping
or unwrapping:

```ts
import { Blueprint, Operation, Routine, Process, Script, Trace, Trigger } from '@dxos/compute';

Blueprint.make({ /* ... */ });
Operation.lazy(() => /* ... */);
Trace.write(Trace.OperationStart, { /* ... */ });
```

This single surface subsumes:

| Re-exported from   | Includes                                                        |
| ------------------ | --------------------------------------------------------------- |
| `@dxos/operation`  | `Operation`, `OperationInvoker`, `OperationHandlerSet`, `OperationRegistry`, errors |
| `@dxos/blueprints` | `Blueprint`, `Routine`, `Template`                              |
| `@dxos/functions`  | `Process`, `Trigger`, `TriggerEvent`, `Script`, `Trace`, `ServiceResolver`, `StorageService`, `CredentialsService`, `ExampleHandlers`, services, errors, sdk |

The HyperFormula-based compute graph that previously lived here moved to
[`@dxos/compute-hyperformula`](../compute-hyperformula).

## Roadmap

- Stage 1 (current): re-exports — consumers depend only on `@dxos/compute`
  while the source packages stay in place.
- Stage 2: migrate source into `@dxos/compute` and remove
  `@dxos/operation`, `@dxos/blueprints`, and `@dxos/functions`.
- A companion `@dxos/compute-runtime-local` package will host the local
  implementations of the services defined here (currently in
  `@dxos/functions-runtime`).
