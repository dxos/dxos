# Plugin definition

The plugin file wires modules using `Plugin.define(meta).pipe(...)` with `AppPlugin.add*Module` helpers.

```tsx
// src/plugin.tsx
import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { MySkill } from '#skills';
import { SkillDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Foo } from '#types';
import { translations } from './translations';

export const FooPlugin = Plugin.define(meta).pipe(
  // Modules declared in `capabilities/index.ts` (via makers) are added by reference.
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  // Value-shaped contributions have inline makers.
  Plugin.addModule(AppCapability.schema([Foo.Thing])),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);
```

## Maker → default activation wave

Modules are declared in `capabilities/index.ts` with a maker, then added by reference with
`Plugin.addModule(...)`. Each maker carries the wave that kind of contribution requires.

| Maker                                                   | Contributes                 | Default wave                                         |
| ------------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `AppCapability.surface`                                 | React surfaces              | demand — `SurfacesRequested(role)` per declared role |
| `AppCapability.reactContext`                            | React context provider      | **Startup** (a context wraps the first render)       |
| `AppCapability.reactRoot`                               | React root                  | **Startup**                                          |
| `AppCapability.settings`                                | Plugin settings             | **Startup**                                          |
| `AppCapability.operationHandler`                        | Operation handlers          | **Startup**                                          |
| `AppCapability.navigationResolver`                      | Navigation target resolvers | **Startup**                                          |
| `AppCapability.navigationHandler`                       | Navigation handlers         | **Startup**                                          |
| `AppCapability.layerSpec`                               | Effect layer specs          | **Startup** (restart-scoped snapshot)                |
| `AppCapability.commands`                                | CLI commands                | **Startup**                                          |
| `AppCapability.appGraphBuilder`                         | Graph builder extensions    | `Idle`                                               |
| `AppCapability.skillDefinition`                         | AI skills                   | the assistant's start event                          |
| `AppCapability.schema` / `translations` / `pluginAsset` | as named                    | idle (ungated)                                       |

Anything without a maker uses `Capability.lazyModule(name, spec, loader)` and states its own
`activatesOn`. **Omitting `activatesOn` means idle**, not startup.

## Activation timing

Operation handlers are loaded **lazily** when first invoked, not on startup. Schema, metadata, and surface modules activate at startup. Skill definition activates when `AssistantPlugin` fires `SetupArtifactDefinition`.

This matters for testing — see [testing.md](./testing.md).

## Inside the dxos monorepo

- File is named for the plugin (e.g. `ChessPlugin.tsx`), exported from `src/index.ts`.
- Otherwise identical.
