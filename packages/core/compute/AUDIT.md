# AUDIT: Reconciling `Routine` and `Agent` ECHO Types

## Summary

`Routine` and `Agent` are two ECHO types that today live in different packages, model overlapping concerns, and were introduced for different reasons. They share the notion of a _named, instructed unit of LLM-driven work_ with `blueprints` and `context`, but `Agent` adds runtime state (chat, plan, queue, scheduling) while `Routine` keeps the static specification of a callable unit (typed I/O, template instructions).

This document analyzes both types as they exist on `main` and outlines the design space for unification.

---

## 1. Current State

### 1.1 `Routine`

- **File**: [Routine.ts](packages/core/compute/compute/src/Routine.ts)
- **Typename**: `org.dxos.type.routine` (v0.1.0)
- **Package**: `@dxos/compute`
- **Icon**: `ph--scroll--regular` / `sky`
- **Marked**: `@import-as-namespace`

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  input: JsonSchema.JsonSchema, // FormInput: false
  output: JsonSchema.JsonSchema, // FormInput: false
  instructions: Template.Template, // Handlebars template, FormInput: false
  blueprints: Schema.Array(Ref.Ref(Blueprint)),
  context: Schema.Array(Schema.Any), // FormInput: false
});
```

Companion: `Routine.make({...})` factory producing `Obj.make(Routine, {...})` with JsonSchema-coerced I/O defaults and a Template-wrapped instructions string.

**Conceptual role**: a _declarative specification_ of an LLM task — what it consumes, what it produces, what blueprints it may invoke, and the natural-language template that drives it. Roughly analogous to a function signature plus body.

### 1.2 `Agent`

- **File**: [Agent.ts](packages/core/compute/assistant-toolkit/src/types/Agent.ts)
- **Typename**: `org.dxos.type.agent` (v0.1.0)
- **Package**: `@dxos/assistant-toolkit`
- **Icon**: `ph--drone--regular` / `sky`
- **Marked**: `@import-as-namespace`, carries `QueueAnnotation(true)`

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  enabled: Schema.optional(Schema.Boolean),
  instructions: Ref.Ref(Text.Text), // Markdown
  chat: Schema.optional(Ref.Ref(Chat.Chat)), // FormInput: false
  plan: Ref.Ref(Plan.Plan), // FormInput: false
  artifacts: Schema.Array({ name: String, data: Ref<Unknown> }),
  queue: Schema.optional(Ref.Ref(Queue)), // FormInput: false
  subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)), // FormInput: false
  filterEvents: Schema.optional(Schema.Boolean),
  cron: Schema.optional(Schema.String),
});
```

Companions:

- `Agent.makeInitialized(props, blueprint)` — Effect-flavored factory that allocates a `Feed`, a `Chat`, an input `Queue`, an `AiContextBinder` binding `blueprints + objects`, and a `Chat.CompanionTo` relation back to the Agent.
- `Agent.resetChatHistory(agent)` — rebuilds chat/feed while preserving the existing context binder's blueprints and objects.
- `Agent.getFromChatContext` — Effect that resolves the (single) Agent from `AiContextService`.

**Conceptual role**: a _running, stateful entity_. It holds a live conversation (`chat`), a hierarchical work `plan`, accumulated `artifacts`, an input event `queue` with `subscriptions` and an optional `cron`. Triggers are toggled via `enabled`.

### 1.3 Related neighbors

- **`Plan.Plan`** (assistant-toolkit) — hierarchical tasks; lives entirely inside Agent.
- **`Chat.Chat`** (assistant-toolkit) — feed-backed conversation; related to its Agent via `Chat.CompanionTo`.
- **`Memory.Memory`** (assistant-toolkit) — knowledge unit, today space-global, candidate to become an Agent artifact.
- **`Blueprint`** (compute) — the unit both types reference.
- **`Template`** (compute) — handlebars source + inputs, used only by `Routine`.

---

## 2. Overlap Analysis

| Concern               | `Routine`                                     | `Agent`                                                     | Notes                                                                                                                         |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Identity / `name`     | yes (optional string)                         | yes (optional string)                                       | Identical.                                                                                                                    |
| Human description     | `description`                                 | —                                                           | Only Routine. Agents are described via their `instructions` blob.                                                             |
| Natural-language body | `instructions: Template`                      | `instructions: Ref<Text>` (Markdown)                        | **Divergent representation.** Routine = embedded Handlebars template with typed inputs; Agent = referenced Markdown document. |
| Blueprints            | `blueprints: Ref<Blueprint>[]` (schema field) | bound at runtime via `AiContextBinder.bind({ blueprints })` | Routine declares them statically; Agent stores them in its context binder, not in the schema.                                 |
| Context / Knowledge   | `context: any[]` (schema field, untyped)      | `artifacts: {name, data}[]` + `AiContextBinder` `objects`   | Routine has a loose `context` array; Agent splits this between named `artifacts` and the binder's `objects`.                  |
| Typed I/O             | `input` / `output` (JsonSchema)               | —                                                           | Only Routine. Agents are event-driven and don't expose a typed call signature.                                                |
| Conversation state    | —                                             | `chat: Ref<Chat>`                                           | Only Agent.                                                                                                                   |
| Task plan             | —                                             | `plan: Ref<Plan>`                                           | Only Agent.                                                                                                                   |
| Eventing              | —                                             | `queue`, `subscriptions`, `filterEvents`                    | Only Agent.                                                                                                                   |
| Scheduling            | —                                             | `cron`                                                      | Only Agent.                                                                                                                   |
| Enable/disable switch | —                                             | `enabled`                                                   | Only Agent. Routines are invoked on demand; nothing to disable.                                                               |
| Icon                  | scroll                                        | drone                                                       | Reflects the spec/instance distinction.                                                                                       |

### Where they meet in code

- [definitions.ts:71](packages/plugins/plugin-assistant/src/operations/definitions.ts:71) — `AgentPrompt` operation accepts `prompt: string | Ref<Routine>`. This is the single place where a Routine is fed into the Agent runtime.
- [run-prompt-in-new-chat.ts:66](packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.ts:66) — when invoked with a string, the op wraps it in `Routine.make({...})` before handing it to `AgentPrompt`.

So in practice today **Routine is the call-form for Agent**: an Agent's invocation is parameterized by a Routine (or by a string promoted to one).

---

## 3. Conceptual Framing

Two reasonable interpretations of the relationship:

1. **Class vs. instance**. `Routine` is the static specification (function signature + prompt). `Agent` is the live process running it: bound conversation, plan, queue, schedule. Under this framing, an `Agent` _has-a_ `Routine` (or several), not _is-a_ `Routine`.

2. **Convergent siblings**. Both are "named, instructed, blueprint-aware units of LLM work" — Routine is the _one-shot tool-call_ shape, Agent is the _long-running subscriber_ shape. The overlap (`name`, `instructions`, `blueprints`, `context`) is a shared base; the differences are runtime extensions.

Either framing can support reconciliation; they differ in whether the unification happens _by composition_ (Agent references a Routine) or _by inheritance_ (a shared base schema with two specializations).

---

## 4. Friction Points

### 4.1 Two representations of `instructions`

- Routine: embedded `Template` (Handlebars source + typed `inputs`, supports parameter substitution).
- Agent: referenced `Text.Text` (Markdown, no parameter binding).

This means a Routine can be parameterized at call time (`input` schema + Template inputs), but an Agent's instructions are a static document. Reconciling means picking one model — or making `instructions` polymorphic.

### 4.2 Two locations for `blueprints` + `context`

- Routine puts them in the schema, so they are queryable, refable, and can be surfaced.
- Agent puts them in `AiContextBinder` (feed-backed runtime state) and only exposes `artifacts` and `subscriptions` on the schema.

Practical consequences: you cannot statically inspect "what blueprints does this Agent use?" by reading its ECHO object — you must load the binder.

### 4.3 `context: Schema.Array(Schema.Any)` is weak

`Routine.context` is `Schema.Any[]` with no semantics. `Agent.artifacts` is the strongly-typed evolution of the same idea (named `{name, data: Ref}` entries). Any reconciliation should replace `Routine.context` with the artifact shape.

### 4.4 Naming of `queue` vs `feed`

The Agent schema already has an inline comment suggesting a rename to `Feed`. The field is named `queue` solely to satisfy `QueueAnnotation`. This is incidental to the audit but worth fixing on any pass.

### 4.5 Multiple TODOs in `Agent`

- `chat`: "Multiple chats; branching hierarchy."
- `plan`: "Is this used? Should it be an artifact?"
- `artifacts`: "Memory objects are global to the space; make them artifacts?"
- `subscriptions`: "Turn into an array of objects when form-data."

Several of these arguably move Agent's shape closer to Routine's (artifacts as the unified context bag).

---

## 5. Reconciliation Options

### Option A — Compose: Agent references Routine

Add `routine: Ref<Routine>` (or `routines: Ref<Routine>[]`) to `Agent`, and drop `instructions`/`blueprints` accumulation from Agent in favor of resolving them via the Routine.

- **Pros**: clean separation — Routine is the spec, Agent is the runtime; matches today's `AgentPrompt(prompt: string | Ref<Routine>)`; Routines become independently shareable/queryable; eliminates the dual `instructions` representation if Agent adopts Routine's `Template`.
- **Cons**: existing Agents store instructions as Markdown — migration story needed; Agent's `instructions` is currently an editable Markdown doc in the UI, which is a nice authoring affordance and would need to move (or Routine.instructions becomes the same shape).

### Option B — Inherit: shared base, two specializations

Factor out a base schema (e.g. `Instructable`) containing `name`, `description`, `instructions`, `blueprints`, `artifacts`/`context`. Make both `Routine` and `Agent` extend it; Agent adds `chat`, `plan`, `queue`, `subscriptions`, `filterEvents`, `cron`, `enabled`; Routine adds `input`, `output`.

- **Pros**: preserves both types as first-class; UI surfaces (RoutineArticle, AgentArticle) can share form components for the base; no migration of existing Agents' instructions.
- **Cons**: ECHO schemas don't have first-class inheritance — base would be a `Schema.Struct` spread into both, with discipline required to keep them in sync; two typenames continue to exist.

### Option C — Collapse: one type with optional runtime fields

Merge into a single type (likely keep the name `Agent` since it's the broader concept), making `input`/`output` and the runtime fields all optional. A "Routine" becomes "an Agent with `input`/`output` set and no `chat`/`queue`."

- **Pros**: one ECHO type, one set of UI containers; fewer concepts for users.
- **Cons**: a single schema with many optional fields is harder to reason about; loses the helpful semantic distinction between a _spec_ and a _running instance_; the icon/label/listing UX has to handle two visually distinct objects.

### Option D — Keep both, tighten the boundary

Leave both types in place but:

1. Replace `Routine.context: any[]` with `Routine.artifacts: {name, data: Ref}[]` to match Agent.
2. Decide a single representation for `instructions` (recommend: `Template` everywhere, so Agents become parameterizable too — or `Ref<Text>` everywhere if Templates feel like overkill for Agents).
3. Promote `blueprints` onto Agent's schema (or remove from Routine).
4. Document the relationship explicitly: Agent _uses_ Routines via `AgentPrompt`.

- **Pros**: minimal disruption; addresses the real inconsistencies without a model rewrite.
- **Cons**: doesn't eliminate the overlap; still two typenames carrying similar concerns.

---

## 6. Recommendation (for discussion)

Lean toward **Option A (compose) layered on Option D (tighten)**:

1. **Tighten first** — independently of unification, fix the cross-cutting inconsistencies: `instructions` representation, `context`/`artifacts` shape, blueprint location.
2. **Then compose** — make `Agent.routine: Ref<Routine>` the canonical way an Agent gets its instructions/blueprints/I/O contract, with `instructions` on Agent kept transitionally for migration.

Rationale: the class/instance framing matches today's invocation path (`AgentPrompt` takes a Routine), keeps each type focused, and gives users a portable, shareable Routine abstraction that doesn't drag along chat/queue/cron baggage.

The alternative worth seriously considering is **Option B**, if the team prefers explicit two-typename specialization with a shared schema fragment. Option C (collapse) is probably not worth the UX cost; Option D alone leaves the duplication in place.

---

## 7. Open Questions

1. Should `Routine.instructions` (Template) and `Agent.instructions` (Ref<Text>) converge — and which direction? Do Agents need parameter substitution at trigger time?
2. Should `blueprints` live on the ECHO object or stay in the `AiContextBinder` feed? Inspectability vs. binder-as-source-of-truth.
3. Is `Routine.context: any[]` actually used anywhere meaningful, or can it be replaced with `artifacts: {name, data: Ref}[]` without migration cost?
4. Does `AgentPrompt(prompt: string | Ref<Routine>)` represent the intended permanent API, or should `prompt` always be a `Ref<Routine>` (with the string form removed once Routines are easy to author)?
5. Where should the unified type(s) live? Today `Routine` is in `@dxos/compute` and `Agent` is in `@dxos/assistant-toolkit`. If composed, Agent likely stays in assistant-toolkit and depends on compute (it already does).
6. Migration: existing Agents store `instructions: Ref<Text>`. If we shift to `routine: Ref<Routine>`, what does the upgrade path look like?

---

## 8. Inventory: Reference Sites

(For sizing the blast radius of any change.)

**Routine** — 20+ non-test files, concentrated in:

- `plugin-assistant` (capabilities, containers, plugin entrypoints, translations, CLI) — ~14
- `core/compute` (assistant-toolkit, assistant-e2e, functions-runtime) — ~5
- `plugin-script` (Notebook type, containers) — ~2
- `sdk/app-graph` (node-matcher) — 1
- `stories/stories-assistant` — ~2

**Agent** — 22+ non-test files, concentrated in:

- `plugin-assistant` (containers, capabilities, plugin entrypoints, translations, CLI) — ~12
- `core/compute/assistant-toolkit` (blueprints/agent + agent-wizard functions) — ~8
- `plugin-sidekick` (types) — ~2

The two types intersect most tightly in `plugin-assistant/src/operations` (the `AgentPrompt`/`RunPromptInNewChat` operations) and in `plugin-assistant/src/containers/{RoutineArticle, AgentArticle}` (parallel UI surfaces).
