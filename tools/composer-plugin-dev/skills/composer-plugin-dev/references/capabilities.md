# Capabilities

A capability is a lazy module that contributes some functionality to the framework. The barrel `capabilities/index.ts` declares which capabilities exist; each one lives in its own file.

## Barrel — only `Capability.lazy()`

```ts
// src/capabilities/index.ts
import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const BlueprintDefinition = Capability.lazy(
  'BlueprintDefinition',
  () => import('./blueprint-definition'),
);
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy(
  'ReactSurface',
  () => import('./react-surface'),
);
```

**Do not** add eager exports here. The barrel is consumed during plugin definition before the framework has decided whether to activate each module.

## Module file — `Capability.makeModule()` default export

Each capability file exports a `Capability.makeModule(...)`:

```ts
// src/capabilities/react-surface.tsx
import * as Effect from 'effect/Effect';
import { Capabilities, Capability } from '@dxos/app-framework';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [/* surfaces */]),
  ),
);
```

The pattern:

1. Import the capability registry (`Capabilities.X` or `AppCapabilities.X`).
2. Build your contribution.
3. `Capability.contributes(Registry, value)` declares it.
4. Wrap in `Capability.makeModule(...)` so the framework can activate it under the right event.

## Why everything is lazy

- Capabilities are large (surfaces pull React, operation handlers pull domain logic).
- The framework uses **activation events** to decide when each capability is needed.
- Lazy imports keep the initial bundle small — operation handlers, for example, never load until an operation is invoked.

## Reference

- `packages/plugins/plugin-chess/src/capabilities/`
