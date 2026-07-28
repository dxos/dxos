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

## Background: Agent, Chat, and the AiSession lifecycle

An **`Agent`** (`org.dxos.type.agent@0.1.0`, `@dxos/assistant-toolkit`) is a
durable named actor — its own identity DID for attributing content it authors,
markdown instructions, a primary `chat`, artifacts, subscriptions, and an
`enabled` master switch over its triggers — whereas a **`Chat`**
(`org.dxos.type.assistant.chat@0.1.0`) is deliberately thin: essentially a `name`
plus a ref to a **`Feed`**, the durable append-only log that _is_ the
conversation (messages, plus `Binding` records of the skills and objects bound to
it), with the feed parented to its chat and a `CompanionTo` relation attaching the
chat to whatever object it accompanies. That split is why the runtime is
**feed-centric rather than chat-centric**: `AiSession.Session` is constructed from
`{ feed, runtime }` and knows nothing of `Chat`; it owns an `AiContext.Binder`
that projects the feed's `Binding` records into live skill/object sets, and
`createRequest` replays history from the feed, formats the system prompt, then
loops turns — recomputing the toolkit and system prompt each turn so dynamically
enabled skills take effect — appending every message back to the feed. In the app
that request does not run in-process: `AgentService.getSession(feed)` spawns (or
re-hydrates) a durable `AgentProcess` whose process _target_ is the feed's DXN,
so a restart recovers the whole conversation by replaying the feed — and so
anything the session needs beyond the feed has to be handed to it explicitly,
which is the constraint milestone 3's instructions ref is designed around.

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
- On session start the project binds via `AiContext`: skills and context objects.
  Instructions text and commands reach the system prompt through the
  `Chat.instructions` ref (milestone 3), not through a binding.
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

- **Instructions reach the model via the prompt formatter, not stubs** —
  _superseded in milestone 3 by the `Chat.instructions` ref; the inline rendering
  stays, the typename-based recovery from `objects` goes._ Bound
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

1. Invoke `AssistantOperation.CreateChat({ db, instructions })` — chat + feed,
   with the assistant's default skills already bound.
2. `Obj.setParent(chat, project)`.
3. Bind `instructions.skills` (see below — skills still travel by binding).
4. Open it with `LayoutOperation.Open` (a plank in the deck, matching the Chats
   section's own create action).

The project passes its instructions **by reference** — `chat.instructions` points
at the project's own `Instructions` object, never a copy, so editing the project's
instructions steers every chat under it.

`SpaceOperation.AddObject` is deliberately **not** called: it would file the chat
in the space's root collection, surfacing it under Collections as well. DB
membership alone (`addToSpace: true`) is what a parented chat needs.

### Instructions: a typed ref on `Chat`, read when the request is built

`Chat` gains `instructions?: Ref.Ref<Instructions>` (assistant-toolkit → compute,
so the typed ref is legal). Whoever builds the session resolves it and passes it
down; `formatSystemPrompt` takes an explicit `instructions` parameter.

This **replaces** the milestone-2 mechanism, where the instructions ref rode in
the context-object bindings and `formatSystemPrompt` recovered it by filtering
`objects` for `Obj.instanceOf(Instructions.Instructions, …)`. That worked, but
dispatch was by typename rather than intent: _any_ bound `Instructions` object
steered the session, so an Instructions object could never be bound as subject
matter (e.g. "help me edit these"). Rejected alternatives: an `instructions` slot
on the `Binding` feed message (schema bump on a type written into every
conversation feed, and it leaves the ref unqueryable); and walking
`Obj.getParent(feed)` to reach the chat (needs a compute-level accessor, since
neither `@dxos/assistant` nor `@dxos/agent-runtime` may import `Chat` —
`assistant-toolkit` already depends on `agent-runtime`).

The ref is available at every session-construction site, so nothing needs to
resolve it structurally:

| Site                    | Feed from        | Chat in hand                                                                                     |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| `useChatProcessor`      | `chat.feed`      | yes                                                                                              |
| `run-instructions`      | `chat.feed`      | yes (routines pass their own `system` text; path unaffected)                                     |
| agent skill `agent.ts`  | `chatFeed`       | yes                                                                                              |
| cli `chat/processor.ts` | chat             | yes                                                                                              |
| `agent-process`         | spawn target DXN | no — but its spawner, `AgentService.getSession`, is called by `processor.ts`, which holds `chat` |

So: `AiSession.Options.instructions` → `RunProps` → `formatSystemPrompt`. For the
durable agent process, `GetSessionOptions.instructions` plus a persisted spawn
annotation next to `Process.TargetAnnotation` — executable options do not survive
re-hydration (`hydrateAgents` rebuilds with a bare `makeExecutable()`), which is
why the feed itself travels as the process target. `@dxos/agent-runtime` already
depends on `@dxos/compute`, so it carries an `Instructions` ref without naming
`Chat`.

**Accepted staleness** (decided 2026-07-27): spawn annotations are the immutable
identity plane, so editing the instructions _text_ reaches a running process (the
ref resolves fresh each turn) but _repointing_ `chat.instructions` at a different
object does not, until the process is terminated. This is the same behavior a
model change already has. If it ever bites, compare the ref against the
`sessionCache` entry and terminate/respawn, exactly as the model/provider
comparison does.

Consequences:

- `Project.contextBindings` drops the instructions ref from `objects`, keeping
  `skills` and `instructions.objects`. **Skills still travel by binding** — a ref
  on the Chat can put text in the prompt but cannot put skills in the toolkit.
- `formatSystemPrompt`'s `instructionObjects` / `contextObjects` partition is
  deleted. A bound `Instructions` object then renders as an ordinary context
  stub, which is the point.
- `ChatCompanion` stops binding project instructions; companion-chat creation
  sets `chat.instructions` instead, so companion and standalone chats share one
  path and that hook gets smaller.
- Chats predating the field have no instructions and would silently lose their
  steering. Lazy backfill: when a chat opens whose parent (or `CompanionTo`
  target) is a Project and `chat.instructions` is unset, set it.
- `format.test.ts`'s three instruction tests move to the explicit parameter.

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

- Unit: `formatSystemPrompt` renders the explicit `instructions` parameter and no
  longer inlines a bound `Instructions` object; the `children()`-based chat
  enumeration; `CreateChat` parenting + instructions-ref pass-through (in-memory
  db).
- Story + play test: `ProjectArticle` toolbar creates a chat and it appears in
  the project's chat list.
- Live: create a project chat in Composer, confirm the project's instructions
  reach the system prompt in a _standalone plank_ (not just the companion) — the
  end-to-end check that the ref survives the agent-process boundary — and that
  the chat shows under the project in the navtree, including after a cold
  deep-link load.

## Deferred / follow-ups (tracked in TASKS.md)

- Possibly move Project type from `@dxos/compute` into the plugin at end.
- Unify project-context binding across companion and standalone chats (shared
  hook keyed on the chat's parent), closing the late-added-skills gap.
- Remove plugin-sidekick (this pass: AUDIT.md note only).
- Consider merging plugin-routine into plugin-projects.
- In-article routine creation; project agent roster; artifact provenance;
  project templates capability.
