# Skills — let agents use your plugin

A **skill** advertises your plugin's capabilities to the assistant. Without one, the agent can't drive your plugin. **Every plugin worth shipping should ship a skill.**

A skill pairs:

- A unique key.
- A list of operations exposed as **tools**.
- A short, behavioral **instruction template**.

## Definition

```ts
// src/skills/my-skill.ts
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Skill, Template } from '@dxos/skills';
import { trim } from '@dxos/util';

import { Create, Move, Play, Print } from '#operations';

const SKILL_KEY = 'com.example.skill.foo';

const operations = [Create, Move, Play, Print];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Foo',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You can manage Foo objects via the Create, Move, Play, and Print tools.
        Don't take destructive actions unless asked. Prefer Print to inspect state before acting.
      `,
    }),
  });

export const FooSkill: AppCapabilities.SkillDefinition = {
  key: SKILL_KEY,
  make,
};

export default FooSkill;
```

## Capability wiring

```ts
// src/capabilities/skill-definition.ts
import * as Effect from 'effect/Effect';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { FooSkill } from '#skills';

export default Capability.makeModule<[], Capability.Capability<typeof AppCapabilities.SkillDefinition>[]>(() =>
  Effect.succeed([Capability.contributes(AppCapabilities.SkillDefinition, FooSkill)]),
);
```

Then in the plugin file:

```ts
AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition });
```

And on the **type's metadata**, attach the skill key so the assistant knows the skill applies when working with that type:

```ts
AppPlugin.addMetadataModule({
  metadata: {
    id: Foo.Thing.typename,
    metadata: { /* ... */ skills: [FooSkill.key] },
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
// src/skills/index.ts
export { default as FooSkill } from './my-skill';
```

## Reference

- `packages/plugins/plugin-chess/src/skills/chess-skill.ts`
