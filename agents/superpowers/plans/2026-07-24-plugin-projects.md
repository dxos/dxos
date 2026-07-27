# plugin-projects Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New core plugin-projects with a `Project` type (successor to `Topic` in `@dxos/compute`) — instructions, skills, sentinel commands, routines, artifacts, and project-scoped AI chats.

**Architecture:** `Project` becomes a core `@dxos/compute` type next to `Instructions`/`Skill`/`Trigger` (the `Routine` schema moves into compute so `Project` can hold `Ref(Routine)[]`). A new `packages/plugins/plugin-projects` owns all UX (create, navtree section, `ProjectArticle`), reusing plugin-brain's Topic surfaces (which move here). Chats bind to projects through the existing `CompanionTo` relation + `AiContext` binder; commands autocomplete is a new CodeMirror extension in `@dxos/react-ui-chat`.

**Tech Stack:** TypeScript, Effect Schema, ECHO (`@dxos/echo`), moon tasks, React + `@dxos/react-ui*`, CodeMirror (`@codemirror/autocomplete`), Storybook.

**Spec:** `agents/superpowers/specs/2026-07-24-plugin-projects-design.md`
**Tracker:** `.agents/projects/plugin-projects/TASKS.md`

## Global Constraints

- Branch `claude/plugin-projects-core-03b07f`; worktree `.claude/worktrees/wizardly-allen-2923f1`. Never create branches/worktrees. Run all moon/pnpm commands FROM the worktree root (`pwd` before trusting results).
- New package MUST set `"private": true`.
- Workspace deps: `workspace:*` (peerDependencies: `workspace:^`). Add external deps via catalog.
- **No compatibility re-exports or shims** — update every call site in the same task.
- No casts (`as any`, `as unknown as T`, non-null `!`); no single-letter variable names; comments say _why_, once, ending with a period.
- Namespace-export type modules start with `// @import-as-namespace` and are exported `export * as Name from './Name'`.
- `pnpm format` (oxfmt) + stage the result before EVERY commit. `git status` before every commit; include the user's concurrent edits.
- Each task ends green: `moon run <pkg>:build` (+ tests) for every package touched in that task.
- Single test file: `pnpm --filter <pkg> exec vitest run --project=node <file>` (NOT `moon run :test -- <file>`).
- Typenames: new Project = `org.dxos.type.project@0.2.0`; ExternalProject = `org.dxos.type.externalProject@0.1.0`; Routine keeps `org.dxos.type.routine@0.2.0`.
- Commit messages: `scope: description` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Rename `@dxos/types` `Project` → `ExternalProject`

Frees the `Project` name and the `org.dxos.type.project` typename for the new core type.

**Files:**

- Rename: `packages/sdk/types/src/types/Project.ts` → `packages/sdk/types/src/types/ExternalProject.ts`
- Modify: `packages/sdk/types/src/types/index.ts:22,63`
- Modify: `packages/plugins/plugin-linear/src/operations/sync.ts`, `sync.test.ts`, `materialize-target.ts`
- Modify: `packages/plugins/plugin-github/src/operations/sync.ts`, `sync.test.ts`, `materialize-target.ts`
- Modify: `packages/plugins/plugin-space/src/capabilities/create-object.ts` (remove entry), `packages/plugins/plugin-space/src/translations.ts`
- Modify: `packages/plugins/plugin-onboarding/scripts/build-exemplar-space.ts`

**Interfaces:**

- Consumes: existing `Project` class in `@dxos/types` (`{name?, description?, image?}`).
- Produces: `ExternalProject.ExternalProject` class + `ExternalProject.make`, exported as `export * as ExternalProject from './ExternalProject'`. Later tasks rely on `org.dxos.type.project` being unclaimed.

- [ ] **Step 1: Rename the module**

`git mv packages/sdk/types/src/types/Project.ts packages/sdk/types/src/types/ExternalProject.ts`, then edit it:

```ts
export class ExternalProject extends Type.makeObject<ExternalProject>(
  DXN.make('org.dxos.type.externalProject', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'External Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link ExternalProject}. */
export const make = (props: Partial<Obj.MakeProps<typeof ExternalProject>> = {}): ExternalProject =>
  Obj.make(ExternalProject, { ...props });
```

Add a header comment stating why the type exists: lightweight, non-AI project mirrored from remote services (GitHub repos, Linear projects).

- [ ] **Step 2: Update the barrel**

In `packages/sdk/types/src/types/index.ts` change `import * as Project from './Project'` → `import * as ExternalProject from './ExternalProject'` and the re-export list entry `Project,` → `ExternalProject,` (keep alphabetical order if the list is sorted).

- [ ] **Step 3: Update linear + github sync**

In all six files (`plugin-linear`/`plugin-github` × `sync.ts`, `sync.test.ts`, `materialize-target.ts`): change `import { Project, ... } from '@dxos/types'` → `import { ExternalProject, ... } from '@dxos/types'` and every `Project.Project` → `ExternalProject.ExternalProject`, `Project.make` → `ExternalProject.make`. Local names (`ProjectSnapshot`, `upsertProject`) stay — they describe the remote domain concept, not the ECHO type.

- [ ] **Step 4: Remove the plugin-space create entry**

In `packages/plugins/plugin-space/src/capabilities/create-object.ts`: delete the `Project` entry (the block at ~lines 74–82 using `Type.getTypename(Project.Project)` / `Project.make`) and drop `Project` from the `@dxos/types` import. In `packages/plugins/plugin-space/src/translations.ts`: rename the typename translation key block from `Type.getTypename(Project.Project)` to `Type.getTypename(ExternalProject.ExternalProject)` with labels "External project" (keep the block — the type still renders when synced).

- [ ] **Step 5: Update exemplar script**

`packages/plugins/plugin-onboarding/scripts/build-exemplar-space.ts`: same mechanical `Project` → `ExternalProject` import/usage rename.

- [ ] **Step 6: Build + test all touched packages**

Run: `moon run types:build linear:build github:build space:build onboarding:build`
Then: `moon run linear:test github:test space:test`
Expected: green. Fix any missed reference the compiler finds (search: `grep -rn "Project" packages/sdk/types/src` must show only `ExternalProject`).

- [ ] **Step 7: Commit**

```bash
pnpm format && git add -A && git commit -m "types: rename Project to ExternalProject (frees org.dxos.type.project)"
```

---

### Task 2: Move `Routine` schema into `@dxos/compute`

**Files:**

- Create: `packages/core/compute/compute/src/types/Routine.ts`
- Create test: `packages/core/compute/compute/src/types/Routine.test.ts` (schema parts moved)
- Modify: `packages/core/compute/compute/src/types/index.ts`
- Delete: `packages/plugins/plugin-routine/src/types/Routine.ts` (+ its `Routine.test.ts` wiring parts move to util test)
- Create: `packages/plugins/plugin-routine/src/util/wire.ts` (+ `wire.test.ts`)
- Modify: `packages/plugins/plugin-routine/src/types/index.ts`, `packages/plugins/plugin-routine/src/util/index.ts`
- Modify (import updates): every plugin-routine file that imports `Routine` from `#types` (capabilities/_, components/RoutineForm, TriggerEditor, containers/Routine_, operations/_, templates, translations.ts, paths.ts, RoutinePlugin_.ts\*, util/routines-for-object.ts)
- Modify (external): `packages/plugins/plugin-inbox/src/util/sync-routine.ts`, `sync-routine.test.ts`, `sync-target.ts`, `packages/plugins/plugin-inbox/src/capabilities/connector.ts`, `packages/plugins/plugin-inbox/src/hooks/useSyncTrigger.ts`, `packages/plugins/plugin-connector/src/types/connector.ts`

**Interfaces:**

- Consumes: `Instructions`, `Trigger`, `Runnable` modules inside compute (`./Instructions`, `./Trigger`, `../Runnable`).
- Produces:
  - `@dxos/compute` `Routine` namespace: `Routine.Routine` (class), `Routine.Kind`, `Routine.instanceOf(value)`, `Routine.instructionsRef(routine)`, `Routine.runnableRef(routine)`, and a plain `Routine.make(props)` (`Obj.make` + `triggers` default `[]`, NO instructions/trigger wiring).
  - `@dxos/plugin-routine` named exports: `makeRoutine({instructions?, trigger?, ...props})` (the old wiring `make`) and `wireTriggers(routine)`.

- [ ] **Step 1: Create the compute module**

`packages/core/compute/compute/src/types/Routine.ts` — port the class from `packages/plugins/plugin-routine/src/types/Routine.ts` verbatim with these changes: imports become internal (`import * as Instructions from './Instructions'`, `import * as Trigger from './Trigger'`, `import * as Runnable from '../Runnable'`, `import type * as Operation from '../Operation'`; echo imports unchanged); drop the `runInstructionsRef` import; include `Kind`, `RunnableSpec`/`InstructionsSpec`/`RoutineSpec`, the `Routine` class, `instanceOf`, `instructionsRef`, `runnableRef`, and this plain factory (replacing the old wiring `make`):

```ts
/** Factory wrapper around `Obj.make` for {@link Routine}. Trigger wiring lives in plugin-routine (`makeRoutine`). */
export const make = (
  props: Omit<Obj.MakeProps<typeof Routine>, 'triggers'> & { triggers?: ReadonlyArray<Ref.Ref<Trigger.Trigger>> },
): Routine => Obj.make(Routine, { triggers: [], ...props });
```

Do NOT port `wireTriggers` or `withoutInstructions` (they need `runInstructionsRef` → `@dxos/assistant-toolkit`, which depends on compute — cycle).

Add `export * as Routine from './Routine';` to `packages/core/compute/compute/src/types/index.ts` (alphabetical).

- [ ] **Step 2: Write the compute schema test**

`packages/core/compute/compute/src/types/Routine.test.ts` (follow `Template.test.ts` structure):

```ts
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as Routine from './Routine';

describe('Routine', () => {
  test('typename and factory', ({ expect }) => {
    expect(Type.getTypename(Routine.Routine)).toBe('org.dxos.type.routine');
    const routine = Routine.make({ name: 'test' });
    expect(Obj.instanceOf(Routine.Routine, routine)).toBe(true);
    expect(routine.triggers).toEqual([]);
  });
});
```

Run: `pnpm --filter @dxos/compute exec vitest run --project=node src/types/Routine.test.ts`
Expected: PASS (the module is self-contained).

- [ ] **Step 3: Move wiring into plugin-routine util**

Create `packages/plugins/plugin-routine/src/util/wire.ts`: move `wireTriggers`, `withoutInstructions`, and the old wiring `make` (renamed `makeRoutine`) from the deleted types module, importing `Routine` from `@dxos/compute` (use `Routine.instructionsRef`/`Routine.runnableRef`; `makeRoutine` calls `Routine.make` under the hood then parents/wires). Keep the existing doc comments. Export both from `packages/plugins/plugin-routine/src/util/index.ts`. Move the wiring assertions from the old `types/Routine.test.ts` into `packages/plugins/plugin-routine/src/util/wire.test.ts` (schema assertions were moved to compute in Step 2). Delete `packages/plugins/plugin-routine/src/types/Routine.ts` + `Routine.test.ts` and remove `export * as Routine from './Routine'` from `packages/plugins/plugin-routine/src/types/index.ts`.

- [ ] **Step 4: Update all Routine imports**

Mechanical, guided by the compiler:

- Inside plugin-routine: `import { Routine } from '#types'` (or `from '../types'`) → `import { Routine } from '@dxos/compute'`; call sites of `Routine.make(...)` that passed `instructions`/`trigger` → `makeRoutine(...)` from `#util` / `../util`; `Routine.wireTriggers` → `wireTriggers`.
- plugin-inbox: `import { Routine, connectedRoutinesQuery } from '@dxos/plugin-routine'` → `import { Routine } from '@dxos/compute'` + `import { connectedRoutinesQuery, makeRoutine } from '@dxos/plugin-routine'`; `Routine.make({...})` in `sync-routine.ts:67` → `makeRoutine({...})`.
- plugin-connector / plugin-trip / plugin-script: fix whatever the compiler flags (RoutineOperation/testing imports are unaffected).
- Add `"@dxos/compute": "workspace:*"` to plugin-inbox/plugin-connector package.json if not already present (check first).

Run: `moon run routine:build inbox:build connector:build trip:build script:build`
Expected: green after fixes.

- [ ] **Step 5: Test**

Run: `moon run compute:test routine:test inbox:test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm format && git add -A && git commit -m "compute: move Routine schema from plugin-routine (wiring stays as makeRoutine/wireTriggers)"
```

---

### Task 3: `Instructions.commands` — structured sentinel commands

**Files:**

- Modify: `packages/core/compute/compute/src/types/Instructions.ts`
- Create test: `packages/core/compute/compute/src/types/Instructions.test.ts`

**Interfaces:**

- Produces: `Instructions.Command` schema (`{ sentinel: string; description?: string; prompt: string }`) and optional `commands` array on `Instructions`; `Instructions.MakeProps` gains `commands?: Command[]`. Consumed by Task 9 (binding) and Task 10 (autocomplete).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test } from 'vitest';

import * as Instructions from './Instructions';

describe('Instructions', () => {
  test('commands round-trip through make', ({ expect }) => {
    const instructions = Instructions.make({
      name: 'test',
      commands: [{ sentinel: '$track', description: 'Track a follow-up', prompt: 'Append the item to TASKS.md.' }],
    });
    expect(instructions.commands?.length).toBe(1);
    expect(instructions.commands?.[0].sentinel).toBe('$track');
  });
});
```

Run: `pnpm --filter @dxos/compute exec vitest run --project=node src/types/Instructions.test.ts`
Expected: FAIL — `commands` does not exist.

- [ ] **Step 2: Add the schema field**

In `Instructions.ts`, above the class:

```ts
/** A sentinel command the model recognizes in chat (e.g. `$track <text>`). */
export const Command = Schema.Struct({
  sentinel: Schema.String.annotations({ description: 'Token that invokes the command (e.g. "$track").' }),
  description: Schema.optional(Schema.String),
  prompt: Schema.String.annotations({ description: 'What the model should do when the sentinel appears.' }),
});
export type Command = Schema.Schema.Type<typeof Command>;
```

In the struct, after `objects`:

```ts
    /** Sentinel commands available to chat sessions running with these instructions. */
    commands: Schema.Array(Command).pipe(Schema.annotations({ title: 'Commands' }), Schema.optional),
```

Extend `MakeProps` with `commands?: Command[];` and pass `commands` through in `make`.

- [ ] **Step 3: Run test to verify it passes**

Same command as Step 1. Expected: PASS. Also `moon run compute:build`.

- [ ] **Step 4: Commit**

```bash
pnpm format && git add -A && git commit -m "compute: Instructions.commands structured sentinel commands"
```

---

### Task 4: `Topic` → `Project` in `@dxos/compute` (+ all call sites)

The rename keeps every current surface compiling (plugin-brain's surfaces migrate to plugin-projects in Task 6; here they are only re-typed).

**Files:**

- Rename: `packages/core/compute/compute/src/types/Topic.ts` → `Project.ts`; modify `packages/core/compute/compute/src/types/index.ts`
- Create test: `packages/core/compute/compute/src/types/Project.test.ts`
- Modify: `packages/core/compute/pipeline-email/src/corpus/topics.ts`, `topics.test.ts`, `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts`
- Modify (plugin-brain, re-type only): `translations.ts`, `BrainPlugin.tsx`, `capabilities/create-object.ts`, `capabilities/navigation-resolver.ts`, `capabilities/app-graph-builder.ts`, `capabilities/react-surface.tsx`, `containers/TopicArticle/TopicArticle.tsx`, `TopicArticle.stories.tsx`
- Modify (plugin-inbox): `InboxPlugin.tsx`, `types/InboxOperation.ts`, rename `operations/analyze/create-topic-from-message.ts` → `create-project-from-message.ts` (+ its barrel `operations/analyze/index.ts` or `operations/index.ts`)
- Modify: `packages/stories/stories-inbox/src/stories/CreateTopic.stories.tsx`

**Interfaces:**

- Consumes: `Routine` (Task 2), `Instructions` modules in compute; `Collection` from `@dxos/echo`.
- Produces: `@dxos/compute` `Project` namespace — `Project.Project` (`org.dxos.type.project@0.2.0`): `{ name?, description?, instructions?: Ref(Instructions), routines: Ref(Routine)[], artifacts?: Ref(Collection) }`, plus `Project.make(props)` defaulting `routines: []`. `InboxOperation.CreateProjectFromMessage` (output `{ projectId }`).

- [ ] **Step 1: Write the failing test**

`packages/core/compute/compute/src/types/Project.test.ts`:

```ts
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as Project from './Project';

describe('Project', () => {
  test('typename, version, and defaults', ({ expect }) => {
    expect(Type.getTypename(Project.Project)).toBe('org.dxos.type.project');
    expect(Type.getVersion(Project.Project)).toBe('0.2.0');
    const project = Project.make({ name: 'test' });
    expect(Obj.instanceOf(Project.Project, project)).toBe(true);
    expect(project.routines).toEqual([]);
  });
});
```

(If `Type.getVersion` does not exist, assert the DXN via `Type.getDXN(Project.Project).toString()` containing `0.2.0` — check `Type`'s API in `@dxos/echo` first.)

Run: `pnpm --filter @dxos/compute exec vitest run --project=node src/types/Project.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Create Project.ts (delete Topic.ts)**

`git mv .../types/Topic.ts .../types/Project.ts`, rewrite the body (drop the exploratory TODO banner; keep the priorities that still apply in one short comment):

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Instructions from './Instructions';
import * as Routine from './Routine';

/**
 * A user-facing container for interactive, long-running work: instructions (skills + commands),
 * routines, artifacts, and AI chat sessions in project context. Successor to `Topic`.
 * Chats and agents attach via relations/queries (assistant-toolkit depends on compute, so no typed refs here).
 */
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Owned agent instructions (created + parented at the plugin layer). */
    instructions: Ref.Ref(Instructions.Instructions).pipe(FormInlineAnnotation.set(true), Schema.optional),

    /** Routines created within the scope of this project. */
    routines: Schema.Array(Ref.Ref(Routine.Routine)),

    /** Owned collection of artifacts (documents, outliners, tables, ...) managed by the project. */
    artifacts: Ref.Ref(Collection.Collection).pipe(Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'rose' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'routines'> & {
    routines?: ReadonlyArray<Ref.Ref<Routine.Routine>>;
  } = {},
): Project => Obj.make(Project, { routines: [], ...props });
```

(Verify `Collection` is exported from `@dxos/echo` root as a namespace — check `packages/core/echo/echo/src/index.ts`; adjust the import to match.) Update `types/index.ts`: `export * as Topic from './Topic'` → `export * as Project from './Project'`.

- [ ] **Step 3: Run test to verify it passes**

Same command. Expected: PASS. Then `moon run compute:build`.

- [ ] **Step 4: Migrate pipeline-email**

`corpus/topics.ts`: `import { Topic }` → `import { Project }`; `materializeTopics` return type `Project.Project[]`; `Obj.make(Topic.Topic, ...)` → `Project.make(...)` (or `Obj.make(Project.Project, {...routines: []...})` — prefer `Project.make`). Keep `TopicDraft`, `clusterThreads`, `summarizeTopics` names — email topic clustering is the domain concept; only the materialized ECHO type changes. Update `topics.test.ts` + `email-pipeline.test.ts` accordingly.
Run: `moon run pipeline-email:build pipeline-email:test`.

- [ ] **Step 5: Re-type plugin-brain surfaces**

In the eight plugin-brain files: `import { Topic } from '@dxos/compute'` → `import { Project } from '@dxos/compute'`; `Topic.Topic` → `Project.Project`; `Topic.make` → `Project.make`; translation labels 'Topic'/'Topics' → 'Project'/'Projects'; `DEFAULT_TOPIC_INSTRUCTIONS` → `DEFAULT_PROJECT_INSTRUCTIONS` with copy "You are an assistant focused on this project. Use its instructions, artifacts, routines, and chats as context…". Do NOT move files yet (Task 6). Component name `TopicArticle` stays put for now.
Run: `moon run brain:build brain:test`.

- [ ] **Step 6: Migrate plugin-inbox**

- `InboxPlugin.tsx`: schema list `Topic.Topic` → `Project.Project`.
- `types/InboxOperation.ts`: rename `CreateTopicFromMessage` → `CreateProjectFromMessage`; `makeKey('createTopicFromMessage')` → `makeKey('createProjectFromMessage')`; name 'Create Project'; description "Creates a Project seeded from a message's thread, with an LLM summary."; output `{ projectId: Schema.String }`.
- `git mv` `operations/analyze/create-topic-from-message.ts` → `create-project-from-message.ts`; update its handler to build `Project.make({...})`, return `{ projectId }`; update the operations barrel and any handler-set registration (grep `CreateTopicFromMessage`).
- `stories-inbox/src/stories/CreateTopic.stories.tsx`: update imports/queries to `Project.Project` (rename story file to `CreateProject.stories.tsx` via `git mv`, update its title).

Run: `moon run inbox:build inbox:test stories-inbox:build`
Expected: green. Then repo-wide check: `grep -rn "Topic\.Topic\|Topic\.make\|from '@dxos/compute'" packages --include="*.ts" --include="*.tsx" -l | xargs grep -ln "Topic\." | grep -v pipeline-discord | grep -v crawler` — pipeline-discord/crawler have their own local Topic type (`packages/core/compute/pipeline-discord/src/types/Topic.ts`), untouched.

- [ ] **Step 7: Commit**

```bash
pnpm format && git add -A && git commit -m "compute: Project type succeeds Topic (routines + artifacts; call sites migrated)"
```

---

### Task 5: Scaffold `packages/plugins/plugin-projects`

**Files:**

- Create: `packages/plugins/plugin-projects/{package.json,moon.yml,tsconfig.json,dx.config.ts,README.md}`
- Create: `packages/plugins/plugin-projects/src/{index.ts,meta.ts,plugin.ts,ProjectsPlugin.tsx,translations.ts,vite-env.d.ts}`
- Create: `packages/plugins/plugin-projects/src/capabilities/index.ts`, `src/containers/index.ts`, `src/types/index.ts`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`

**Interfaces:**

- Produces: `@dxos/plugin-projects` with `ProjectsPlugin` (lazy) export from `./plugin`; plugin key `org.dxos.plugin.projects`. Registered in composer-app.

- [ ] **Step 1: Package files (model on plugin-brain, trimmed)**

`package.json`: copy `packages/plugins/plugin-brain/package.json`; set name `@dxos/plugin-projects`, description "Projects — interactive, long-running processes with instructions, routines, and artifacts", keep `"private": true`; imports map: `#capabilities`, `#containers`, `#meta`, `#plugin` (→ `./src/ProjectsPlugin.tsx`), `#translations`, `#types`; exports: `.`, `./plugin`, `./types`, `./translations`; dependencies (all `workspace:*`): `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/compute`, `@dxos/echo`, `@dxos/echo-react`, `@dxos/plugin-space`, `@dxos/util`, plus catalog `effect`; devDependencies: `@dxos/plugin-testing`, `@dxos/react-ui`, `@types/react`, `react`, `vite`; peerDependencies `@dxos/react-ui` (`workspace:^`), `react` (catalog). Drop brain-specific deps (`@dxos/pipeline-rdf`, `@dxos/react-ui-rdf`, `@dxos/plugin-inbox`, `@dxos/ai`).

`moon.yml`:

```yaml
layer: library
language: typescript
tags:
  - ts-vite-build
  - ts-test
  - ts-test-storybook
  - storybook
```

`tsconfig.json`: copy plugin-brain's, replace the `references` array with entries matching this package's workspace deps (mirror how sibling plugins reference `../../core/compute/compute`, etc. — copy paths from plugin-brain's and prune). `vite.config.ts`: copy plugin-brain's verbatim if it is generic (read it first; it usually just wires the shared preset).

`dx.config.ts`:

```ts
import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.projects',
    name: 'Projects',
    author: 'DXOS',
    description: trim`
      Projects: interactive, long-running processes composed of instructions, skills,
      sentinel commands, routines, artifacts, and AI chat sessions in project context.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-projects',
    icon: { key: 'ph--stack--regular', hue: 'rose' },
    tags: ['assistant'],
  },
});
```

- [ ] **Step 2: Source scaffold**

`src/meta.ts`, `src/plugin.ts`, `src/index.ts` — mirror plugin-brain exactly (meta from dx.config; `export const ProjectsPlugin = Plugin.lazy(meta, () => import('#plugin'));`). `src/translations.ts`: typename block for `Project.Project` (labels Project/Projects, 'object-deleted.label', section labels) — port the strings updated in Task 4 Step 5 from plugin-brain (they move here for real in Task 6; for now duplicate-free: leave brain's in place, this file starts with just the plugin name entry to keep i18n keys unique per-namespace — the ns is this plugin's key, so no collision). `src/ProjectsPlugin.tsx`:

```tsx
import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Project } from '@dxos/compute';

import { meta } from '#meta';
import { translations } from '#translations';

export const ProjectsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Project.Project] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProjectsPlugin;
```

(Brain still registers the schema too until Task 6 — verify duplicate schema registration is tolerated by checking `addSchemaModule` semantics; if it throws on duplicates, drop the schema module from brain in this task instead.)

Empty barrels for `capabilities`/`containers`/`types` (filled in Task 6).

- [ ] **Step 3: Register in composer-app**

`packages/apps/composer-app/src/plugin-defs.tsx`: add `import { ProjectsPlugin } from '@dxos/plugin-projects/plugin';` and `ProjectsPlugin(),` in the alphabetical position within `getPlugins`. Add `"@dxos/plugin-projects": "workspace:*"` to composer-app's package.json.

- [ ] **Step 4: Install + build**

Run: `pnpm install` (workspace link), then `moon run projects:build composer-app:build`
Expected: green. Fix tsconfig `references` errors the build surfaces.

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-projects: scaffold core plugin (schema + registration)"
```

---

### Task 6: Move Project surfaces from plugin-brain into plugin-projects

**Files:**

- Move (git mv + rename): `plugin-brain/src/containers/TopicArticle/*` → `plugin-projects/src/containers/ProjectArticle/{ProjectArticle.tsx,ProjectArticle.stories.tsx,index.ts}`
- Move logic (re-create in plugin-projects, delete from brain): `capabilities/create-object.ts`, `capabilities/app-graph-builder.ts`, `capabilities/navigation-resolver.ts`, the `brain.topic` surface entry from `capabilities/react-surface.tsx`
- Modify: `plugin-brain/src/BrainPlugin.tsx` (drop schema/create/graph/navigation modules + Project translations), `plugin-brain/src/translations.ts`, `plugin-brain/src/capabilities/index.ts`
- Modify: `plugin-projects/src/ProjectsPlugin.tsx`, `capabilities/index.ts`, `containers/index.ts`, `translations.ts`

**Interfaces:**

- Consumes: `Project` (Task 4), plugin scaffold (Task 5), `SpaceCapabilities.CreateObjectEntry`, `TypeSection` helpers from `@dxos/app-toolkit`.
- Produces: plugin-projects contributes CreateObject / AppGraphBuilder / NavigationResolver / ReactSurface(`project.article` → `ProjectArticle`); `createProject({name, db})` internal helper that builds the full owned graph (Project + Instructions + artifacts Collection).

- [ ] **Step 1: Move the article container**

`git mv packages/plugins/plugin-brain/src/containers/TopicArticle packages/plugins/plugin-projects/src/containers/ProjectArticle`, rename files and the component `TopicArticle` → `ProjectArticle`, prop type to `AppSurface.ObjectArticleProps<Project.Project>`, `#meta` import now resolves to plugin-projects. Fix brain's `containers/index.ts` (drop the export) and add to projects' `containers/index.ts`. Keep the component's current minimal rendering — the rework is Task 7.

- [ ] **Step 2: Port the three capabilities**

Create in `plugin-projects/src/capabilities/`, porting the brain implementations with `Project` substituted (they were already re-typed in Task 4 — this is a move):

- `create-object.ts` — port brain's, plus artifacts: after creating instructions, also create the owned artifacts collection:

```ts
const project = Project.make({ name: name ?? '' });
const instructions = Instructions.make({ text: DEFAULT_PROJECT_INSTRUCTIONS });
Obj.setParent(instructions, project);
const artifacts = Collection.make();
Obj.setParent(artifacts, project);
Obj.update(project, (project) => {
  project.instructions = Ref.make(instructions);
  project.artifacts = Ref.make(artifacts);
});
```

- `app-graph-builder.ts`, `navigation-resolver.ts` — port verbatim (Project + `Paths.GroupSegments.ai`).
- `react-surface.tsx` — one `Surface.create({ id: 'project.article', filter: AppSurface.object(AppSurface.Article, Project.Project), component: ... <ProjectArticle .../> })`.

Delete the ported code from plugin-brain (`create-object.ts`, `app-graph-builder.ts`, `navigation-resolver.ts` files entirely; the `brain.topic` surface entry; their `capabilities/index.ts` exports; `AppPlugin.addSchemaModule`, `addCreateObjectModule`, `addAppGraphModule`, `addNavigationResolverModule` from `BrainPlugin.tsx` — brain keeps Facts surface, skills, operations, settings). Move the Project typename translations block from brain's `translations.ts` into plugin-projects' (ns key is the typename, so it must live exactly once — with the plugin that owns the type UI).

- [ ] **Step 3: Wire ProjectsPlugin modules**

```tsx
export const ProjectsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Project.Project] }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

(If Task 5 left the schema module in brain, remove it there now.)

- [ ] **Step 4: Build + test both plugins and the app**

Run: `moon run projects:build brain:build composer-app:build brain:test`
Expected: green; brain has no remaining `Project` imports except none (grep `Project` in plugin-brain/src → only Facts-unrelated hits should remain, ideally zero).

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-projects: own Project surfaces (moved from plugin-brain)"
```

---

### Task 7: `ProjectArticle` rework + story

**Files:**

- Modify: `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx`
- Modify: `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx`

**Interfaces:**

- Consumes: `Project.Project`, `useObject` (`@dxos/echo-react`), `Form` (`@dxos/react-ui-form`), `InstructionsEditor` — reuse from plugin-routine if exported from its `./components` package export (check `packages/plugins/plugin-routine/package.json` exports map; if `./components` is exported, add dependency `@dxos/plugin-routine: workspace:*` and import it; otherwise export it there first — a real export of a shared component, not a shim).
- Produces: article with sections: header form (name/description), Instructions (markdown editor + commands table via Form), Routines (read-only list of `project.routines` labels), Artifacts (list of `artifacts.objects` labels). Creation flows for routines/artifacts are milestone 2.

- [ ] **Step 1: Write the story first (render contract)**

`ProjectArticle.stories.tsx` — follow the repo react-ui story rules (`withTheme()` CALLED, `parameters: { translations }`); build an in-memory project via `Project.make` + `Instructions.make` + `Collection.make` with `Obj.setParent` wiring (same graph as create-object), using the plugin-testing story harness that brain's TopicArticle story used (port its setup — it already constructs a Topic with instructions). Story asserts (play fn): the project name renders, the instructions editor is present, Routines and Artifacts section headings render.

Run: `pnpm --filter @dxos/plugin-projects exec vitest run --project=storybook src/containers/ProjectArticle/ProjectArticle.stories.tsx` (storybook-test project name: mirror how sibling plugins run story tests — check `moon.yml` tag `ts-test-storybook` task and use `moon run projects:test` if story tests are wired through it).
Expected: FAIL (sections not implemented).

- [ ] **Step 2: Implement the article**

Structure (Panel + ScrollArea per composer-ui skill; no wrapper divs; theme tokens only):

```tsx
export const ProjectArticle = ({ role, subject }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [project] = useObject(subject);
  const [instructions] = useObject(project?.instructions);
  const [artifacts] = useObject(project?.artifacts);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical' padding thin>
          <ScrollArea.Viewport classNames='dx-document'>
            {/* Header: name/description edited in place via Form against the Project schema. */}
            <Form.Root schema={Project.Project} subject={subject} fields={['name', 'description']} autoSave />
            {instructions && <InstructionsEditor db={db} instructions={instructions} />}
            <h2>{t('routines.label')}</h2>
            {project.routines.map((ref) => ( /* label row per resolved routine via useObject(ref) child component */ ))}
            <h2>{t('artifacts.label')}</h2>
            {artifacts?.objects.map((ref) => ( /* label row per resolved artifact */ ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
```

This sketch pins intent, not exact APIs: match `Form` usage to how `RoutineForm` calls it (schema/subject/autosave prop names), resolve refs with a small `ObjectLabelRow` child component using `useObject(ref)` + `Obj.getLabel`, and use `Card.Row`/`List` primitives per the composer-ui skill instead of bare `<h2>`/rows if that is the surrounding idiom. Add `routines.label` / `artifacts.label` / `instructions.label` to plugin-projects translations.

- [ ] **Step 3: Run the story test until green; visual check**

Story test command from Step 1 → PASS. Then run storybook from the worktree on a free port (NOT 9009 — that belongs to the user): `moon run storybook-react:serve -- --port 9010` from the worktree root, open the ProjectArticle story, check console for errors (a green build is NOT a tested UI).

- [ ] **Step 4: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-projects: ProjectArticle sections (instructions, routines, artifacts) + story"
```

---

### Task 8: Project context binding for companion chats

**Files:**

- Modify: `packages/core/compute/compute/src/types/Project.ts` (+ `Project.test.ts`)
- Modify: `packages/plugins/plugin-assistant/src/containers/ChatCompanion/ChatCompanion.tsx`

**Interfaces:**

- Consumes: `AiContext.Binder.bind({ skills, objects })` (existing, via `useContextBinder`); `Project.Project`.
- Produces: `Project.contextBindings(project)` in compute:

```ts
export type ContextBindings = {
  skills: Ref.Ref<Skill.Skill>[];
  objects: Ref.Ref<Obj.Unknown>[];
};

/**
 * Bindings a chat session should receive when running in this project's context:
 * the instructions object itself (so its text/commands are visible), its skills, and its context objects.
 * Requires the instructions ref to be resolved (`.target`); unresolved refs contribute nothing.
 */
export const contextBindings = (project: Project): ContextBindings => { ... };
```

- [ ] **Step 1: Write the failing test**

Extend `Project.test.ts`:

```ts
test('contextBindings exposes instructions, skills, and objects', ({ expect }) => {
  const skillRef = Ref.fromURI('dxn:echo:@:skill-1');
  const doc = Obj.make(Expando, {}); // any Obj.Unknown stand-in; use an existing test helper type
  const instructions = Instructions.make({ text: 'Test', skills: [skillRef], objects: [Ref.make(doc)] });
  const project = Project.make({ name: 'test' });
  Obj.setParent(instructions, project);
  Obj.update(project, (p) => {
    p.instructions = Ref.make(instructions);
  });

  const bindings = Project.contextBindings(project);
  expect(bindings.skills.map((r) => r.uri)).toEqual([skillRef.uri]);
  expect(bindings.objects.length).toBe(2); // instructions object + the context object.
});
```

(Adapt the stand-in object + ref construction to what `Instructions.test.ts`/`Template.test.ts` already use for in-memory refs — resolve `.target` semantics there; if plain in-memory refs don't resolve without a DB, build via `EchoTestBuilder`-style helper used by `Operation.test.ts`.)
Run: `pnpm --filter @dxos/compute exec vitest run --project=node src/types/Project.test.ts` → FAIL.

- [ ] **Step 2: Implement `contextBindings`**

In `Project.ts`: read `project.instructions?.target`; return `{ skills: [...instructions.skills], objects: [Ref to instructions object, ...(instructions.objects ?? [])] }`; empty arrays when unresolved. Preserve refs as-is (registry DXNs must survive — same constraint documented in `run-instructions.ts`).
Run test → PASS.

- [ ] **Step 3: Bind in ChatCompanion**

In `useSkills` (ChatCompanion.tsx), after the existing companionTo bind, add:

```ts
if (Obj.instanceOf(Project.Project, companionTo)) {
  const bindings = Project.contextBindings(companionTo);
  if (bindings.skills.length > 0) {
    await binder.bind({ skills: bindings.skills });
  }
  if (bindings.objects.length > 0) {
    await binder.bind({ objects: bindings.objects });
  }
}
```

(`import { Project } from '@dxos/compute'` — plugin-assistant already depends on compute.) Note: `useObject`-subscribe to `companionTo.instructions` so late-resolving refs re-bind — mirror how the hook already reacts to `feedSnapshot`.

- [ ] **Step 4: Build + test**

Run: `moon run compute:test assistant:build` (plugin-assistant moon project name — check `packages/plugins/plugin-assistant/moon.yml` `id`, likely `assistant` or `plugin-assistant`; use what `moon query projects | grep assistant` prints).
Expected: green.

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "assistant: bind project instructions/skills/objects into companion chat context"
```

---

### Task 9: Commands autocomplete in the chat prompt

**Files:**

- Create: `packages/ui/react-ui-chat/src/components/ChatEditor/commands.ts` (+ `commands.test.ts`)
- Modify: `packages/ui/react-ui-chat/src/components/ChatEditor/index.ts`
- Modify: `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx` (+ the prop chain: `ChatArticle` → `Chat` component → `ChatPrompt`, following where `companionTo` already flows)

**Interfaces:**

- Consumes: `Instructions.Command[]` (Task 3); `ChatEditor`'s `extensions` prop (it forwards CodeMirror `Extension[]` — verify in `ChatEditor.tsx`).
- Produces: `commands({ getCommands })` CodeMirror extension exported from `@dxos/react-ui-chat`:

```ts
export type CommandData = { sentinel: string; description?: string };
export type CommandsOptions = { getCommands: () => CommandData[] };
export const commands: (options: CommandsOptions) => Extension;
```

- [ ] **Step 1: Write the failing test for the completion source**

`commands.test.ts` — test the pure completion logic (factor it so it is testable without an editor):

```ts
import { describe, test } from 'vitest';

import { matchCommands } from './commands';

describe('commands completion', () => {
  test('prefix-matches sentinels', ({ expect }) => {
    const all = [{ sentinel: '$track' }, { sentinel: '$resume' }];
    expect(matchCommands(all, '$t').map((c) => c.sentinel)).toEqual(['$track']);
    expect(matchCommands(all, '$')).toHaveLength(2);
    expect(matchCommands(all, 'tr')).toHaveLength(0);
  });
});
```

Run: `pnpm --filter @dxos/react-ui-chat exec vitest run --project=node src/components/ChatEditor/commands.test.ts` → FAIL.

- [ ] **Step 2: Implement the extension**

`commands.ts` — model on `references.ts` but minimal (no decorations, no async provider):

```ts
import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';

export type CommandData = { sentinel: string; description?: string };

/** Pure prefix matcher, exported for tests. */
export const matchCommands = (all: CommandData[], token: string): CommandData[] =>
  token.startsWith('$') ? all.filter(({ sentinel }) => sentinel.startsWith(token)) : [];

export type CommandsOptions = { getCommands: () => CommandData[] };

/**
 * Sentinel-command completion: typing `$` offers the commands defined by the bound context's instructions.
 */
export const commands = ({ getCommands }: CommandsOptions): Extension =>
  autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\$[\w-]*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }
        const options = matchCommands(getCommands(), context.state.sliceDoc(word.from, word.to));
        if (options.length === 0) {
          return null;
        }
        return {
          from: word.from,
          options: options.map(({ sentinel, description }) => ({ label: sentinel, detail: description })),
        };
      },
    ],
  });
```

Export from `ChatEditor/index.ts`. Check whether `ChatEditor` already installs `autocompletion` (via `references` or base extensions) — if so, contribute only the override source through the same mechanism references uses, to avoid double `autocompletion()` instances.
Run test → PASS. `moon run react-ui-chat:build`.

- [ ] **Step 3: Wire into ChatPrompt**

- Thread `companionTo` to `ChatPrompt` the same way it reaches `ChatArticle` (ChatCompanion → ChatArticle already passes it; extend `ChatArticle` to forward it into the prompt component chain — grep `ChatPrompt` usage inside `ChatArticle`/`Chat` components for the insertion point).
- In `ChatPrompt.tsx`: resolve commands reactively and add the extension to `ChatEditor`'s `extensions`:

```tsx
const [companion] = useObject(companionTo);
const [instructions] = useObject(Obj.instanceOf(Project.Project, companion) ? companion.instructions : undefined);
const commandsRef = useDynamicRef(instructions?.commands ?? []);
const commandsExtension = useMemo(
  () =>
    commands({
      getCommands: () => commandsRef.current.map(({ sentinel, description }) => ({ sentinel, description })),
    }),
  [commandsRef],
);
```

(`useDynamicRef` is already imported in ChatPrompt; pass `commandsExtension` alongside the existing keymap extensions into `ChatEditor`.)

- [ ] **Step 4: Story-level verification**

Extend `ChatOptions.stories.tsx`-adjacent coverage OR add a `ChatPrompt` story case with a project carrying `commands: [{ sentinel: '$track', prompt: '...' }]`; verify in worktree storybook (port 9010) that typing `$` in the prompt shows the completion. Console must be clean.

- [ ] **Step 5: Build + test + commit**

Run: `moon run react-ui-chat:test assistant:build` → green.

```bash
pnpm format && git add -A && git commit -m "assistant: sentinel-command autocomplete in chat prompt from project instructions"
```

---

### Task 10: Finalization — AUDIT note, changeset, full verification

**Files:**

- Modify: `packages/plugins/AUDIT.md`
- Create: `.changeset/plugin-projects.md`
- Modify: `.agents/projects/plugin-projects/TASKS.md`, `.agents/projects/registry.yml`

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: AUDIT note**

Add/update the plugin-sidekick row/section in `packages/plugins/AUDIT.md` (read its format first): note "obviated by plugin-projects (see agents/superpowers/specs/2026-07-24-plugin-projects-design.md); removal tracked separately." Add a plugin-projects entry if the file lists all plugins.

- [ ] **Step 2: Changeset**

Read `agents/instructions/changesets.md`, then create `.changeset/plugin-projects.md` following it — expected shape: minor bumps for the consumer-relevant published packages touched (`@dxos/compute`, `@dxos/types`, `@dxos/react-ui-chat`, `@dxos/plugin-routine`, `@dxos/plugin-assistant`, plugin-brain/inbox if published) with a one-paragraph summary (Project type succeeds Topic; Routine schema moved to compute; ExternalProject rename; commands autocomplete). Private packages (the new plugin) get no changeset entry.

- [ ] **Step 3: Full verification**

From the worktree root (`pwd` first):

Run: `moon exec --on-failure continue --quiet :build`
Run: `moon run compute:test routine:test inbox:test brain:test projects:test react-ui-chat:test pipeline-email:test linear:test github:test space:test`
Run: `moon run :lint -- --fix`
Run: `pnpm format`
Expected: all green; no unformatted files. Audit the diff for stray casts and narration comments (`git diff main --stat`, then grep the diff for `as any\|as unknown`).

- [ ] **Step 4: Update tracker + commit**

Update `.agents/projects/plugin-projects/TASKS.md` (check off milestone-1 tasks, note deferred items) and the registry `resume` line.

```bash
git status && git add -A && git commit -m "plugin-projects: finalize milestone 1 (audit note, changeset)"
```

- [ ] **Step 5: End-of-branch check**

Use superpowers:verification-before-completion, then offer the user the submit-pr skill (surface the Composer preview URL when opened). PLUGIN.mdl for plugin-projects is written only after implementation settles (repo convention) — propose it as a follow-up alongside the PR.
