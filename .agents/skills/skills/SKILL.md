---
name: dxos-skills
description: >-
  Guide for creating and integrating Skills in DXOS. Use when adding
  skills to plugins, wiring operations as tools, structuring skill
  definitions, or testing with AssistantTestLayer.
---

# DXOS Skills

Skills define AI toolkits for a domain (e.g. markdown, kanban). They combine **operation definitions** (for tool schemas) with **operation handlers** (for runtime execution). See the operations skill (`.cursor/skills/operations/SKILL.md`) for defining operations.

## Skill definition

A skill has three parts:

| Field        | Type                                      | Purpose                                                 |
| ------------ | ----------------------------------------- | ------------------------------------------------------- |
| `key`        | `string`                                  | Globally unique key (reverse-domain style).             |
| `operations` | `OperationHandlerSet.OperationHandlerSet` | Handler set for runtime invocation.                     |
| `make`       | `() => Skill.Skill`               | Factory that creates the Skill instance with tools. |

Example (see `packages/plugins/plugin-markdown/src/skills/markdown-skill.ts`):

```ts
import { type AppCapabilities } from '@dxos/app-toolkit';
import { Skill, Template } from '@dxos/skills';
import { trim } from '@dxos/util';

import { MarkdownHandlers, Create, Open, Update } from './functions';

const SKILL_KEY = 'org.dxos.skill.markdown';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Markdown',
    tools: Skill.toolDefinitions({ operations: [Create, Open, Update] }),
    instructions: Template.make({
      source: trim`
        You can create, read and update markdown documents.
        When asked to edit or update documents return updates as a set of compact diff string pairs.
      `,
    }),
  });

const skill: AppCapabilities.SkillDefinition = {
  key: SKILL_KEY,
  operations: MarkdownHandlers,
  make,
};

export default skill;
```

- **Definitions** (`Create`, `Open`, `Update`) go to `Skill.toolDefinitions({ operations })` — they provide schemas for the AI.
- **Handlers** (`MarkdownHandlers`) go to the skill's `operations` field — they are invoked at runtime.

## File structure

Skills live inside plugins. Structure:

```
plugin-my-domain/
├── src/
│   ├── skills/
│   │   ├── index.ts              # Re-exports skill
│   │   ├── my-skill.ts       # Skill definition (key, operations, make)
│   │   └── functions/            # Operations (definitions + handlers)
│   │       ├── definitions.ts
│   │       ├── create.ts
│   │       ├── open.ts
│   │       ├── update.ts
│   │       └── index.ts
│   └── capabilities/
│       └── skill-definition/
│           ├── index.ts          # Lazy export
│           └── skill-definition.ts  # Contributes to AppCapabilities.SkillDefinition
```

### Where skills are registered (Composer)

1. **Capability module** — contributes the skill to the app:

```ts
// capabilities/skill-definition/skill-definition.ts
import * as Effect from 'effect/Effect';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { MarkdownSkill } from '../../skills';

const skillDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.SkillDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.SkillDefinition, MarkdownSkill)]));

export default skillDefinition;
```

2. **Plugin** — registers the capability module:

```ts
// MarkdownPlugin.tsx
import { SkillDefinition } from './capabilities';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  // ...other modules
  Plugin.make,
);
```

3. **Composer** — plugin must be in the app's plugin list (`packages/apps/composer-app/src/plugin-defs.tsx`). If the plugin is imported there, its skills are available.

## Testing with AssistantTestLayer

Use `AssistantTestLayer` from `@dxos/assistant/testing` to test operations and AI flows that use skills. Operation definitions and `OperationHandlerSet` wiring follow the same patterns as production code (see `.cursor/skills/operations/SKILL.md`).

```ts
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Skill } from '@dxos/skills';
import MarkdownSkill from '../markdown-skill';

const TestLayer = AssistantTestLayer({
  operationHandlers: MarkdownSkill.operations,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject],
  tracing: 'pretty',
});
```

- **`operationHandlers`** — the skill's `operations` (`OperationHandlerSet.OperationHandlerSet`). Required so the runtime can resolve handlers when you call `Operation.invoke` / `Operation.Service` (same mechanism as in-app operation execution).
- **`types`** — ECHO types the test needs (e.g. `Markdown.Document`, `Skill.Skill`). Mirror any `types` declared on your `Operation.make` definitions where relevant.
- **`skills`** — optional; use when the test binds skills via `AiContextService.bindContext({ skills: [...] })` and you need the registry to know about them.

To invoke an operation directly, use **`Operation.invoke`** from `@dxos/operation` (not `FunctionInvocationService` from `@dxos/functions`, which is deprecated):

```ts
import { Operation } from '@dxos/operation';
import { Create } from './definitions';

const result =
  yield *
  Operation.invoke(Create, {
    name: 'My Doc',
    content: 'Hello world.',
  });
```

Inside another operation's handler, the same API applies (`yield* Operation.invoke(...)`, `yield* Operation.schedule(...)`); see the operations skill section **Invoking Operations**.
