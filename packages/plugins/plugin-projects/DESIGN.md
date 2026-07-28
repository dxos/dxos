# plugin-projects — Design

Tracker: `./TASKS.md`

## Concept

`Project` is a user-facing container for interactive, long-running work, loosely
modeled on Claude Desktop projects: instructions (with skills and sentinel
commands), routines, artifacts, and AI chat sessions that run in project context.

plugin-projects is a **seminal core plugin**: it unifies subject-matter grouping,
automation scoping, and project-scoped assistance, and other plugins are expected
to extend it (via artifacts, templates) or use projects directly. It is intended
to be one of the core aspects of Composer.

## Background: Project, Agent, Chat, AiSession

**Project**: the user's unit of long-running work and the _scope_ a session runs
in. It owns the instructions that steer its chats (text, sentinel commands, and
the skills those chats get), the routines that automate it, a collection of
artifacts, and the chat sessions parented to it. It is inert on its own — a
project does nothing until a chat or routine runs in its context — so its whole
job is to supply that context, and every design question below is about how its
instructions, skills, and objects reach a running session.

**Agent**: a durable named actor (`org.dxos.type.agent@0.1.0`,
`@dxos/assistant-toolkit`) — its own identity DID for attributing content it
authors, markdown instructions, a primary `chat`, artifacts, subscriptions, and
an `enabled` master switch over its triggers. Where a project is scope, an agent
is a participant: it is the thing that acts on a schedule or a trigger rather
than in response to a user turn.

**Chat**: a conversation (`org.dxos.type.assistant.chat@0.1.0`), deliberately
thin — essentially a `name`, a ref to a **`Feed`**, and (per this design) a ref to
the `Instructions` that steer it. The feed is the durable append-only log that
_is_ the conversation: messages, plus `Binding` records of the skills and objects
bound to it. The feed is parented to its chat, and a `CompanionTo` relation
attaches a chat to whatever object it accompanies.

**AiSession**: the runtime, and it is **feed-centric rather than chat-centric**.
`AiSession.Session` is constructed from `{ feed, runtime }` and knows nothing of
`Chat`; it owns an `AiContext.Binder` that projects the feed's `Binding` records
into live skill/object sets, and `createRequest` replays history from the feed,
formats the system prompt, then loops turns — recomputing the toolkit and system
prompt each turn so dynamically enabled skills take effect — appending every
message back to the feed. In the app that request does not run in-process:
`AgentService.getSession(feed)` spawns (or re-hydrates) a durable `AgentProcess`
whose process _target_ is the feed's DXN, so a restart recovers the whole
conversation by replaying the feed. The consequence that shapes this design:
anything a session needs beyond its feed has to be handed to it explicitly.

## Types

### `Project` (`@dxos/compute`)

`org.dxos.type.project@0.2.0`:

```text
name?: string
description?: string
instructions: Ref(Instructions)      // owned (Obj.setParent), cascade-delete/clone
routines: Ref(Routine)[]             // routines created in project scope
artifacts?: Ref(Collection)          // owned child Collection (documents, outliners, tables, …)
```

The type lives in `@dxos/compute` (next to Instructions, Skill, Trigger) so
brain/inbox/EDGE-side code can reference it without a plugin dependency.
Artifacts use a `Collection` (core, `@dxos/echo`) to reuse existing collection
UI and drag-drop.

Chats are **not** a field: they are parented to the Project in the ECHO
hierarchy — see [Project chats](#project-chats).

### `Routine` (`@dxos/compute`)

`Routine` (`org.dxos.type.routine@0.2.0`) lives in `@dxos/compute` with its pure
helpers (`instanceOf`, `instructionsRef`, `runnableRef`), so `Project` can hold
`Ref(Routine)`. Its wiring — `wireTriggers` and the wiring `make`
(instructions/trigger parenting + `runInstructionsRef`) — stays in plugin-routine
because it depends on `RunInstructions` from `@dxos/assistant-toolkit`, which
itself depends on `@dxos/compute`.

### `Instructions.commands` (structured sentinel commands)

`Instructions` (`@dxos/compute`) carries an optional structured field:

```text
commands?: Array<{ sentinel: string; description?: string; prompt: string }>
```

Project instructions define sentinel commands (e.g. `$track …`) that chat
sessions in project context can invoke, surfaced as autocomplete in the chat
prompt. Living on `Instructions` rather than `Project` means routines and agents
get commands too.

### `Chat.instructions` (`@dxos/assistant-toolkit`)

`Chat` carries `instructions?: Ref.Ref<Instructions>` — the instructions that
steer that conversation. A project chat's ref points at the **project's own**
`Instructions` object, never a copy, so editing the project's instructions
steers every chat under it.

## Layering constraints

These are load-bearing and easy to trip over:

- `@dxos/assistant-toolkit` depends on `@dxos/compute`, so `Project` cannot hold
  typed refs to `Chat` or `Agent` — but `Chat` can hold a typed ref to
  `Instructions`.
- `@dxos/assistant-toolkit` depends on `@dxos/agent-runtime`, so neither
  `@dxos/assistant` nor `@dxos/agent-runtime` may import `Chat`. Both may import
  `@dxos/compute`, so an `Instructions` ref can travel through them.
- plugin-projects depends on `@dxos/assistant-toolkit` (the `Chat` type) and
  `@dxos/plugin-assistant` (`AssistantOperation`, via its `./types` export).
  plugin-assistant does not depend on plugin-projects.

## Plugin

`packages/plugins/plugin-projects` (`"private": true`), standard core-plugin
shape:

- `meta`, `types/` (`ProjectOperation`, capabilities, events), `translations`.
- `capabilities/`: `create-object` (navtree "+ Project": creates a Project with
  owned Instructions + empty artifacts Collection), `app-graph-builder`,
  `navigation-resolver`, `react-surface`, `operation-handler`.
- `containers/ProjectArticle/`: header (name/description), instructions editor
  (Form + markdown text), routines list, artifacts collection section, and a
  toolbar. Storybook story + play test.

### Extension points (seminal-plugin posture)

1. **Artifacts**: any plugin's objects can be project artifacts — the Collection
   accepts `Obj.Unknown`; no coupling required.
2. **Direct use**: types and operations are exported so other plugins can create
   or target projects (`ProjectOperation.Create`, …).
3. **Templates**: a capability for plugins to contribute project templates
   (instructions + skills + starter routines), mirroring `automation-templates`.

## Chat integration

A project's chats reach the model through two distinct channels, and the split
matters: **a ref on the Chat can put text in the prompt but cannot put skills in
the toolkit.**

- **Instructions text and commands** travel via `Chat.instructions`. Whoever
  builds the session resolves the ref and passes it down —
  `AiSession.Options.instructions` → `RunProps` → an explicit `instructions`
  parameter on `formatSystemPrompt`, which renders a `## Instructions` section
  (resolved markdown plus sentinel-command directives).
- **Skills and context objects** travel via `AiContext` bindings.
  `Project.contextBindings` supplies `instructions.skills` and
  `instructions.objects`; bindings persist as `Binding` records in the feed.
- **Commands autocomplete**: a plugin-assistant `ChatPrompt` extension reads
  `commands` from the chat's instructions and offers sentinel completion.
- Context-object stubs in the system prompt carry a `<label>`, so the model
  tool-loads a bound object only for its contents, never to identify it.

### Why instructions are a typed ref, not a binding

Instructions could ride in the context-object bindings, with
`formatSystemPrompt` recovering them by filtering `objects` for
`Obj.instanceOf(Instructions.Instructions, …)`. That dispatches on typename
rather than intent: _any_ bound `Instructions` object would steer the session, so
an Instructions object could never be bound as subject matter (e.g. "help me edit
these"). Two other options were considered and rejected: an `instructions` slot
on the `Binding` feed message (a schema bump on a type written into every
conversation feed, and the ref stays unqueryable), and walking
`Obj.getParent(feed)` to reach the chat (needs a compute-level accessor, since
the session layers may not import `Chat`).

The ref is available at every session-construction site, so nothing has to
resolve it structurally:

| Site                    | Feed from        | Chat in hand                                                                                     |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| `useChatProcessor`      | `chat.feed`      | yes                                                                                              |
| `run-instructions`      | `chat.feed`      | yes (routines pass their own `system` text, so this path is unaffected)                          |
| agent skill `agent.ts`  | `chatFeed`       | yes                                                                                              |
| cli `chat/processor.ts` | chat             | yes                                                                                              |
| `agent-process`         | spawn target DXN | no — but its spawner, `AgentService.getSession`, is called by `processor.ts`, which holds `chat` |

For the durable agent process the ref travels as `GetSessionOptions.instructions`
plus a persisted spawn annotation beside `Process.TargetAnnotation`. Executable
options do not survive re-hydration (`hydrateAgents` rebuilds with a bare
`makeExecutable()`), which is why the feed itself travels as the process target.

**Known staleness**: spawn annotations are the immutable identity plane, so
editing the instructions _text_ reaches a running process (the ref resolves fresh
each turn) but _repointing_ `chat.instructions` at a different object does not,
until the process is terminated — the same behavior a model change already has.
The fix, if it ever bites: compare the ref against the `sessionCache` entry and
terminate/respawn, exactly as the model/provider comparison does.

## Project chats

Goal: start a chat session from a project with the project already in scope, and
see that session in the navtree under its project.

### Ownership: the ECHO parent edge

A project chat is parented to its Project (`Obj.setParent(chat, project)`) and
enumerated with `Query.select(Filter.id(project.id)).children()` narrowed to
`Chat.Chat`. This needs no `Project` schema field, and the parent edge is the
ownership statement.

Rejected alternatives: a `chats: Ref<Collection>` field mirroring `artifacts`
(buys sibling ordering and drag-rearrange, costs a schema version bump); and
reusing `CompanionTo` for owned sessions (that relation is single-current by
construction, via `state.currentChat[objectUri]`, and carries no ownership edge).
`CompanionTo` still links the project's _companion_ chat.

**Risk**: a hierarchy-traversal query driving a graph connector is less exercised
than a ref-array read. If `children()` does not re-emit when a chat is newly
parented, fall back to the Collection field — only the enumeration source moves.

### Creation: `ProjectOperation.CreateChat`

`ProjectOperation.CreateChat({ project })`, handled in plugin-projects:

1. Invoke `AssistantOperation.CreateChat({ db, instructions })` — chat + feed,
   with the assistant's default skills already bound.
2. `Obj.setParent(chat, project)`.
3. Bind `instructions.skills`.
4. Open it with `LayoutOperation.Open` (a plank in the deck).

`SpaceOperation.AddObject` is deliberately **not** called: it would file the chat
in the space's root collection, surfacing it under Collections as well. DB
membership alone (`addToSpace: true`) is what a parented chat needs.

Companion chats take the same instructions path: companion-chat creation sets
`chat.instructions` from the project rather than binding it, so companion and
standalone chats behave identically.

### Navtree: chats as children of the project node

A `projectChats` extension in plugin-projects contributes the children (the
`TypeSection` extension that emits Project nodes makes them leaves):

- `match`: nodes whose `data` is a `Project.Project`.
- `connector`: the `children()` query above → `AppNode.makeObject` per chat.
- `url`: reuses the `chat` key with a data-dependent `path` that resolves the
  chat's parent project. Sharing one key across extensions is supported and
  intended — plugin-space's `object` key spans both collection connectors for
  exactly this reason (`@dxos/app-graph` `path-resolution.ts`) — so a chat is
  addressed the same way wherever it sits.

The Chats type-section query in plugin-assistant excludes both `CompanionTo`
sources and project-parented chats; without the second exclusion every project
chat appears twice, once under its project and once at the space level.

### Toolbar

`ProjectArticle` has a `Panel.Toolbar` (`asChild` + `Toolbar.Root`) whose
`IconButton` invokes `ProjectOperation.CreateChat`. The same action is
contributed to the project's navtree node (`disposition: 'list-item-primary'`)
so `+` works from the tree.

## UI conventions

- **Owned refs resolve reactively in articles**: a sync `.target` read never
  resolves on a cold or deep-link load, leaving the section permanently missing.
  Use `useObject(ref)` + `Obj.getReactiveOrUndefined` (see `ProjectArticle`'s
  instructions).
- **Dev loop**: Projects, Routine, and Outliner are part of the composer-app
  minimal plugin set (`serve-min`); keep the plugin list in sync with the
  `optimizeDeps` brace glob in `vite.config.ts`.

## Testing

- Type tests: `Project`/`Routine` schema round-trip, the `commands` field,
  `Project.contextBindings`.
- Unit: `formatSystemPrompt` renders the explicit `instructions` parameter and
  does not inline a bound `Instructions` object; the `children()`-based chat
  enumeration; `CreateChat` parenting and instructions-ref pass-through.
- Storybook: `ProjectArticle` story + play test (including the toolbar creating a
  chat that appears in the project's chat list); chat-binding story in
  stories-assistant.
- Live: create a project chat in Composer and confirm the project's instructions
  reach the system prompt in a _standalone plank_, not just the companion — the
  end-to-end check that the ref survives the agent-process boundary — and that
  the chat shows under its project in the navtree after a cold deep-link load.

## Open questions

- Move the `Project` type from `@dxos/compute` into this plugin, once its shape
  settles.
- Merge plugin-routine into plugin-projects — the boundary is thin now that
  `Routine` lives in `@dxos/compute`.
- Project-scoped agent roster (relation or parenting), and artifact provenance
  (which routine or agent produced what).
- Remove plugin-sidekick, which this plugin obviates.

Task-level follow-ups live in `./TASKS.md`.
