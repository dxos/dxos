# Plugin definition

The plugin file wires modules using `Plugin.define(meta).pipe(...)` with `AppPlugin.add*Module` helpers.

```tsx
// src/plugin.tsx
import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { MyBlueprint } from '#blueprints';
import { BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Foo } from '#types';
import { translations } from './translations';

export const FooPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Foo.Thing.typename,
      metadata: { icon: '...', iconHue: '...', blueprints: [MyBlueprint.key], createObject: ... },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Foo.Thing] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

## Module → activation event reference

| Method                         | Purpose                        | Activation event          |
| ------------------------------ | ------------------------------ | ------------------------- |
| `addSurfaceModule`             | React surface components       | `SetupReactSurface`       |
| `addMetadataModule`            | Type metadata (icon, creation) | `SetupMetadata`           |
| `addSchemaModule`              | ECHO type registration         | `SetupSchema`             |
| `addOperationHandlerModule`    | Operation handlers             | `SetupOperationHandler`   |
| `addTranslationsModule`        | i18n resources                 | `SetupTranslations`       |
| `addBlueprintDefinitionModule` | AI blueprints                  | `SetupArtifactDefinition` |
| `addSettingsModule`            | Plugin settings                | `SetupSettings`           |
| `addAppGraphModule`            | Graph builder extensions       | `SetupAppGraph`           |
| `addCommandModule`             | CLI commands                   | `Startup`                 |
| `addReactContextModule`        | React context provider         | `Startup`                 |
| `addNavigationResolverModule`  | Navigation resolvers           | `OperationInvokerReady`   |
| `addNavigationHandlerModule`   | Navigation handlers            | `OperationInvokerReady`   |

## Activation timing

Operation handlers are loaded **lazily** when first invoked, not on startup. Schema, metadata, and surface modules activate at startup. Blueprint definition activates when `AssistantPlugin` fires `SetupArtifactDefinition`.

This matters for testing — see [testing.md](./testing.md).

## Inside the dxos monorepo

- File is named for the plugin (e.g. `ChessPlugin.tsx`), exported from `src/index.ts`.
- Otherwise identical.
