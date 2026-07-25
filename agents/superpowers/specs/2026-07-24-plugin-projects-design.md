# plugin-projects — Design

Date: 2026-07-24
Status: approved (brainstorm 1×1 with burdon)
Tracker: `.agents/projects/plugin-projects/TASKS.md`

## Concept

`Project` is a user-facing container for interactive, long-running work, loosely
modeled on Claude Desktop projects: instructions (with skills and sentinel
commands), routines, artifacts, and AI chat sessions that run in project
context. It is the successor to `Topic` (`@dxos/compute`) and obviates the
stalled plugin-sidekick.

plugin-projects is a **seminal core plugin**: it unifies existing concepts
(topics, sidekick ambitions, automation scoping) and other plugins are expected
to extend it (via artifacts, templates) or use projects directly. It will be one
of the core aspects of Composer.

## Types

### `Project` (`@dxos/compute`)

Evolved in place from `Topic.ts` (Topic is deleted; no shims). Typename
`org.dxos.type.project@0.2.0` — 0.2.0 disambiguates from stored instances of the
name-squatting `@dxos/types` Project at 0.1.0.

```text
name?: string
description?: string
instructions: Ref(Instructions)      // owned (Obj.setParent), cascade-delete/clone
routines: Ref(Routine)[]             // routines created in project scope
artifacts?: Ref(Collection)          // owned child Collection (documents, outliners, tables, …)
```

- Placement decision: core type in `@dxos/compute` (next to Instructions, Skill,
  Trigger) so brain/inbox/EDGE-side code can reference it without a plugin
  dependency. Follow-up (tracked): possibly move the type into the plugin once
  its shape settles.
- Artifacts use a `Collection` (core, `@dxos/echo`) to reuse existing collection
  UI/drag-drop. Artifact provenance (which routine/agent produced what) is
  deferred.

### `Routine` schema moves to `@dxos/compute`

`Routine` (`org.dxos.type.routine@0.2.0`) moves from
`plugin-routine/src/types/Routine.ts` to `@dxos/compute` types, with its pure
helpers (`instanceOf`, `instructionsRef`, `runnableRef`). This lets `Project`
hold `Ref(Routine)`.

`wireTriggers` and the wiring `make` (instructions/trigger parenting +
`runInstructionsRef`) **stay in plugin-routine**: they depend on
`RunInstructions` from `@dxos/assistant-toolkit`, which itself depends on
`@dxos/compute` — moving them would create a cycle.

### `Instructions.commands` (structured sentinel commands)

`Instructions` (`@dxos/compute`) gains an optional structured field:

```text
commands?: Array<{ sentinel: string; description?: string; prompt: string }>
```

Project instructions define sentinel commands (e.g. `$track …`) that chat
sessions in project context can reference; they surface as autocomplete in the
chat prompt from day one (no free-text-only MVP). Living on `Instructions`
(not `Project`) means routines and agents get commands too.

### `ExternalProject` rename (`@dxos/types`)

The existing `@dxos/types` `Project` ({name, description, image}) is a separate
GH/Linear-style concept name-squatting the typename. It is renamed (possibly
temporarily) for later use syncing remote services with a lightweight,
non-AI project concept:

- Type + file: `Project` → `ExternalProject`; all call sites updated
  (plugin-github/plugin-linear sync + materialize-target, plugin-space,
  onboarding exemplar script, stories/tests); no compatibility shims.
- DXN: → `org.dxos.type.externalProject@0.1.0` (frees the typename in the data
  layer; acceptable because the type is not actively exercised).
- plugin-space create menu: **entry removed** (sync plugins materialize it;
  hand-creation would collide with the new Project entry).

### Chats and Agents (layering)

`@dxos/assistant-toolkit` depends on `@dxos/compute`, so `Project` cannot hold
typed refs to `Chat` or `Agent`.

- **Chats**: linked via the existing `CompanionTo` relation
  (`org.dxos.relation.assistant.companionTo`, source `Chat` → target
  `Obj.Unknown`), consistent with `Agent`'s chat wiring. plugin-projects queries
  chats by relation target. **Review flagged** (tracked): revisit vs a dedicated
  relation once the design is exercised.
- **Agents**: explicit linkage deferred. MVP: agents participate via project
  chats and routines (an instructions-routine already runs in the agent
  harness). A project-scoped agent roster (relation or parenting) comes later,
  decided alongside the CompanionTo review.

## Plugin

New `packages/plugins/plugin-projects` (`"private": true`), standard core-plugin
shape:

- `meta`, `types/` (`ProjectOperation`, capabilities, events), `translations`.
- `capabilities/`: `create-object` (navtree "+ Project": creates Project with
  owned Instructions + empty artifacts Collection), `app-graph-builder`
  (Project node with children: artifacts collection, routines),
  `navigation-resolver`, `react-surface`, `operation-handler`.
- `containers/ProjectArticle/`: reworked from plugin-brain's `TopicArticle`
  (which moves here and is deleted from plugin-brain): header
  (name/description), instructions editor (Form + markdown text), routines
  list, artifacts collection section. Storybook story + play test.

### Extension points (seminal-plugin posture)

1. **Artifacts**: any plugin's objects can be project artifacts — the
   Collection accepts `Obj.Unknown`; no coupling required.
2. **Direct use**: types/operations exported so other plugins can create/target
   projects (`ProjectOperation.Create`, …).
3. **Templates (phase 2)**: a capability for plugins to contribute project
   templates (instructions + skills + starter routines), mirroring the
   existing `automation-templates` pattern.

### plugin-routine merge (deferred)

Considered merging plugin-routine into plugin-projects. Decision: not in this
pass — the Routine schema move to `@dxos/compute` already thins the boundary;
revisit once plugin-projects settles (tracked).

## Chat integration

- Companion chat surface on `Project` (as plugin-assistant provides for other
  types).
- On session start the project binds via `AiContext`: instructions text,
  skills, context objects, and commands flow into the system prompt.
- Commands autocomplete: plugin-assistant `ChatPrompt` extension reads
  `commands` from the bound project's Instructions and offers sentinel
  completion.

## Call-site migrations

- **plugin-brain**: drops Topic surfaces (create-object, navigation-resolver,
  app-graph-builder, react-surface entries, translations); `TopicArticle`
  moves to plugin-projects.
- **plugin-inbox**: `create-topic-from-message` produces a `Project`; operation
  renamed `CreateProjectFromMessage`; labels updated.
- **stories-brain / stories-inbox / assistant fixtures**: updated to `Project`.
- **plugin-github / plugin-linear / plugin-space / onboarding script**:
  `ExternalProject` rename.

## Milestone 1 scope (approved)

Full loop: `Project` type + create-object; `ProjectArticle`; companion chat
bound via `AiContext` (instructions + skills + commands); commands autocomplete
in the chat prompt; all call-site migrations above. Routine creation _within_
the article is deferred to milestone 2 (create via existing routine flows;
linked via `routines`).

## Testing

- Type tests: Project/Routine schema round-trip, commands field, ExternalProject
  rename fallout.
- Migration-touched suites: plugin-routine, plugin-inbox, plugin-brain,
  plugin-linear, plugin-github sync.
- `ProjectArticle` story + play test; chat-binding story in stories-assistant.
- Verify: `moon` build/test/lint + storybook from the worktree on an alt port.

## Milestone 2 decisions (as-built addenda)

- **Instructions reach the model via the prompt formatter, not stubs**: bound
  `Instructions` objects are rendered inline by `formatSystemPrompt`
  (`@dxos/assistant` request/format.ts) as a `## Instructions` section — resolved
  markdown text plus sentinel-command directives — and are excluded from the
  `## Context Objects` stub list. This is the load-bearing half of "use project
  instructions in chat"; binding alone only produced a tool-loadable stub.
- **Context stubs carry labels** (`<label>`), so the model tool-loads bound
  objects only for contents, not identification.
- **Owned refs resolve reactively in articles**: `.target` sync reads never
  resolve on cold/deep-link loads; use `useObject(ref)` +
  `Obj.getReactiveOrUndefined` (ProjectArticle instructions).
- **Instructions typename labels**: plugin-assistant's legacy "Routine" labels
  for `org.dxos.type.instructions` corrected to "Instructions"; project
  creation names the owned Instructions object.
- **Dev loop**: Projects/Routine/Outliner plugins are part of the composer-app
  minimal set (`serve-min`).

## Deferred / follow-ups (tracked in TASKS.md)

- Possibly move Project type from `@dxos/compute` into the plugin at end.
- Review CompanionTo reuse for project chats (vs dedicated relation).
- Remove plugin-sidekick (this pass: AUDIT.md note only).
- Consider merging plugin-routine into plugin-projects.
- In-article routine creation; project agent roster; artifact provenance;
  project templates capability.
