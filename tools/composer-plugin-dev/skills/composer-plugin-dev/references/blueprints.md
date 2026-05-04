# Blueprints — let agents use your plugin

A **blueprint** advertises your plugin's capabilities to the assistant. Without one, the agent can't drive your plugin. **Every plugin worth shipping should ship a blueprint.**

A blueprint pairs:

- A unique key.
- A list of operations exposed as **tools**.
- A short, behavioral **instruction template**.

## Definition

```ts
// src/blueprints/my-blueprint.ts
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { Create, Move, Play, Print } from '#operations';

const BLUEPRINT_KEY = 'com.example.blueprint.foo';

const operations = [Create, Move, Play, Print];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Foo',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You can manage Foo objects via the Create, Move, Play, and Print tools.
        Don't take destructive actions unless asked. Prefer Print to inspect state before acting.
      `,
    }),
  });

export const FooBlueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default FooBlueprint;
```

## Capability wiring

```ts
// src/capabilities/blueprint-definition.ts
import * as Effect from 'effect/Effect';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { FooBlueprint } from '#blueprints';

export default Capability.makeModule<[], Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]>(() =>
  Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, FooBlueprint)]),
);
```

Then in the plugin file:

```ts
AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition });
```

And on the **type's metadata**, attach the blueprint key so the assistant knows the blueprint applies when working with that type:

```ts
AppPlugin.addMetadataModule({
  metadata: {
    id: Foo.Thing.typename,
    metadata: { /* ... */ blueprints: [FooBlueprint.key] },
  },
});
```

## Writing instructions

Keep the instruction template short. Describe **behaviors and policies**, not API surface — the tool schemas already cover that. Useful patterns:

- "Prefer reading before writing."
- "Don't perform destructive actions without confirmation."
- "When asked X, use tool Y."
- Domain expertise the agent wouldn't otherwise have.

## Index barrel

```ts
// src/blueprints/index.ts
export { default as FooBlueprint } from './my-blueprint';
```

## Reference

- `packages/plugins/plugin-chess/src/blueprints/chess-blueprint.ts`
