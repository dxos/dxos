---
name: dxos-blueprints
description: >-
  Guide for creating and integrating Blueprints in DXOS. Use when adding
  blueprints to plugins, wiring operations as tools, structuring blueprint
  definitions, or testing with AssistantTestLayer.
---

# DXOS Blueprints

Blueprints define AI toolkits for a domain (e.g. markdown, kanban). They combine **operation definitions** (for tool schemas) with **operation handlers** (for runtime execution). See the operations skill (`.cursor/skills/operations/SKILL.md`) for defining operations.

## Blueprint definition

A blueprint has three parts:

| Field        | Type                              | Purpose                                                |
| ------------ | --------------------------------- | ------------------------------------------------------ |
| `key`        | `string`                          | Globally unique key (reverse-domain style).             |
| `operations` | `OperationHandlerSet.OperationHandlerSet` | Handler set for runtime invocation.                     |
| `make`       | `() => Blueprint.Blueprint`       | Factory that creates the Blueprint instance with tools. |

Example (see `packages/plugins/plugin-markdown/src/blueprints/markdown-blueprint.ts`):

```ts
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { MarkdownHandlers, Create, Open, Update } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.markdown';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Markdown',
    tools: Blueprint.toolDefinitions({ operations: [Create, Open, Update] }),
    instructions: Template.make({
      source: trim`
        You can create, read and update markdown documents.
        When asked to edit or update documents return updates as a set of compact diff string pairs.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: MarkdownHandlers,
  make,
};

export default blueprint;
```

- **Definitions** (`Create`, `Open`, `Update`) go to `Blueprint.toolDefinitions({ operations })` — they provide schemas for the AI.
- **Handlers** (`MarkdownHandlers`) go to the blueprint's `operations` field — they are invoked at runtime.

## File structure

Blueprints live inside plugins. Structure:

```
plugin-my-domain/
├── src/
│   ├── blueprints/
│   │   ├── index.ts              # Re-exports blueprint
│   │   ├── my-blueprint.ts       # Blueprint definition (key, operations, make)
│   │   └── functions/            # Operations (definitions + handlers)
│   │       ├── definitions.ts
│   │       ├── create.ts
│   │       ├── open.ts
│   │       ├── update.ts
│   │       └── index.ts
│   └── capabilities/
│       └── blueprint-definition/
│           ├── index.ts          # Lazy export
│           └── blueprint-definition.ts  # Contributes to AppCapabilities.BlueprintDefinition
```

### Where blueprints are registered (Composer)

1. **Capability module** — contributes the blueprint to the app:

```ts
// capabilities/blueprint-definition/blueprint-definition.ts
import * as Effect from 'effect/Effect';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { MarkdownBlueprint } from '../../blueprints';

const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, MarkdownBlueprint)]));

export default blueprintDefinition;
```

2. **Plugin** — registers the capability module:

```ts
// MarkdownPlugin.tsx
import { BlueprintDefinition } from './capabilities';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  // ...other modules
  Plugin.make,
);
```

3. **Composer** — plugin must be in the app's plugin list (`packages/apps/composer-app/src/plugin-defs.tsx`). If the plugin is imported there, its blueprints are available.

## Testing with AssistantTestLayer

Use `AssistantTestLayer` from `@dxos/assistant/testing` to test operations and AI flows that use blueprints.

```ts
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import MarkdownBlueprint from '../markdown-blueprint';

const TestLayer = AssistantTestLayer({
  operationHandlers: MarkdownBlueprint.operations,
  types: [SpaceProperties, Collection.Collection, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
  tracing: 'pretty',
});
```

- **`operationHandlers`** — the blueprint's `operations` (handler set). Required for `FunctionInvocationService.invokeFunction` to resolve handlers.
- **`types`** — ECHO types the test needs (e.g. `Markdown.Document`, `Blueprint.Blueprint`).
- **`blueprints`** — optional; use when the test binds blueprints via `AiContextService.bindContext({ blueprints: [...] })` and you need the registry to know about them.

To invoke an operation directly:

```ts
import { FunctionInvocationService } from '@dxos/functions';
import { Create } from './definitions';

const result = yield* FunctionInvocationService.invokeFunction(Create, {
  name: 'My Doc',
  content: 'Hello world.',
});
```
