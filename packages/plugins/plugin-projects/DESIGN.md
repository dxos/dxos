# plugin-projects — Design

Date: 2026-07-24 (milestone 3 design added 2026-07-27)
Status: approved (brainstorm 1×1 with burdon)
Tracker: `./TASKS.md`

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

- **Chats**: two distinct linkages, resolved in milestone 3 (see
  [Project chats](#milestone-3-project-chats)). A project's _companion_ chat
  stays on the existing `CompanionTo` relation
  (`org.dxos.relation.assistant.companionTo`, source `Chat` → target
  `Obj.Unknown`), consistent with `Agent`'s chat wiring. A project's _own_ chat
  sessions are instead **parented** to the Project in the ECHO hierarchy
  (`Obj.setParent`) and enumerated with `Query…children()` — the relation is
  single-current by construction (`state.currentChat[objectUri]`) and carries no
  ownership edge, so it cannot express "N sessions belonging to this project".
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

## Milestone 3: project chats

Goal: start a chat session from a project, with the project already in scope, and
see that session in the navtree under its project.

### Ownership: the ECHO parent edge

A project chat is parented to its Project (`Obj.setParent(chat, project)`) and
enumerated with `Query.select(Filter.id(project.id)).children()` narrowed to
`Chat.Chat`. No `Project` schema change, so no version bump and no migration of
existing project objects.

Rejected alternatives: a `chats: Ref<Collection>` field mirroring `artifacts`
(buys sibling ordering and drag-rearrange, costs a 0.2.0 → 0.3.0 bump); and
reusing `CompanionTo` (conflates the single-current companion chat with N owned
sessions, and yields no ownership edge).

The one risk this takes on: a hierarchy-traversal query driving a graph connector
is less exercised than a ref-array read. If `children()` does not re-emit when a
chat is newly parented, fall back to the Collection field — the rest of the
design is unchanged, only the enumeration source moves.

### Creation: `ProjectOperation.CreateChat`

`ProjectOperation.CreateChat({ project })`, handled in plugin-projects:

1. Invoke `AssistantOperation.CreateChat({ db, bindings })` — chat + feed, with
   the assistant's default skills already bound.
2. `Obj.setParent(chat, project)`.
3. Open it with `LayoutOperation.Open` (a plank in the deck, matching the Chats
   section's own create action).

`SpaceOperation.AddObject` is deliberately **not** called: it would file the chat
in the space's root collection, surfacing it under Collections as well. DB
membership alone (`addToSpace: true`) is what a parented chat needs.

### Context binding: an optional `bindings` input on `CreateChat`

`AssistantOperation.CreateChat` gains an optional
`bindings: { skills?, objects? }`, passed straight to the `AiContext.Binder` it
already constructs for the default skills. plugin-projects supplies
`Project.contextBindings(project)` plus a ref to the project itself, and needs no
`AiContext` plumbing of its own.

Bindings persist in the conversation feed, and `Instructions` are bound **by
ref** — so later edits to instruction text or commands reach the model at
prompt-format time without re-binding. Known gap, accepted: a skill added to the
instructions _after_ the chat exists does not reach that chat. `ChatCompanion`
avoids this by re-binding reactively; unifying the two paths (extract its binding
logic into a shared hook keyed on `Obj.getParent(chat)`) is a follow-up, not this
milestone.

### Navtree: chats as children of the project node

Projects are leaf nodes today — `TypeSection.createTypeSectionExtension` emits
`AppNode.makeObject` with no children. A new `projectChats` extension in
plugin-projects contributes them:

- `match`: nodes whose `data` is a `Project.Project`.
- `connector`: the `children()` query above → `AppNode.makeObject` per chat.
- `url`: reuses the `chat` key with a data-dependent `path` that resolves the
  chat's parent project. Sharing one key across extensions is supported and
  intended — plugin-space's `object` key spans both collection connectors for
  exactly this reason (`@dxos/app-graph` `path-resolution.ts`), so a chat is
  addressed the same way wherever it sits.

**Consequence in plugin-assistant**: the Chats type-section query already
excludes `CompanionTo` sources; it must also exclude project-parented chats, or
every project chat appears twice — once under its project, once at the top level.

### Toolbar: `ProjectArticle`

`ProjectArticle` has no toolbar today. Add `Panel.Toolbar asChild` +
`Toolbar.Root` with a single `IconButton` invoking
`ProjectOperation.CreateChat`. The same action is contributed to the project's
navtree node (`disposition: 'list-item-primary'`) so `+` works from the tree.

Scope held to chat creation: in-article routine and artifact creation are already
their own TASKS.md items.

### Dependencies

plugin-projects gains `@dxos/assistant-toolkit` (the `Chat` type) and
`@dxos/plugin-assistant` (`AssistantOperation`, via its `./types` export). No
cycle — plugin-assistant does not depend on plugin-projects.

### Testing

- Unit: the `children()`-based chat enumeration, and `CreateChat` parenting +
  binding pass-through (in-memory db).
- Story + play test: `ProjectArticle` toolbar creates a chat and it appears in
  the project's chat list.
- Live: create a project chat in Composer, confirm the project's instructions
  reach the system prompt in a _standalone plank_ (not just the companion) and
  that the chat shows under the project in the navtree, including after a cold
  deep-link load.

## Deferred / follow-ups (tracked in TASKS.md)

- Possibly move Project type from `@dxos/compute` into the plugin at end.
- Unify project-context binding across companion and standalone chats (shared
  hook keyed on the chat's parent), closing the late-added-skills gap.
- Remove plugin-sidekick (this pass: AUDIT.md note only).
- Consider merging plugin-routine into plugin-projects.
- In-article routine creation; project agent roster; artifact provenance;
  project templates capability.
