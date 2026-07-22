# ViewState — durable UI state (audit)

**Status:** proposed canonical mechanism. This document is the single reference for how
per-context, durable UI state is read and written across the app, and how it differs from the
plugin **Settings** store. Tracked by PR #12304.

> **Durable UI state** = state that describes _how a particular surface/object/context is being
> viewed_ and should survive reloads and navigation — e.g. which companion tab is selected, an
> editor's scroll/caret, a split ratio, a selection set, a message body's view mode. It is keyed by
> **context** (what you are looking at), not by the plugin.

---

## The one mechanism

One `ViewStateManager` is created once and shared everywhere. It routes each `(aspect, contextId)`
pair to the backend the aspect declares, through the effect-atom registry so React hooks and Effect
code observe the same values.

- **Aspect** — a typed kind of UI state, defined once with
  [`defineViewState`](../../view-state/view-state.ts): `{ key, backend, schema, defaultValue }`.
- **Backends** ([`createDefaultBackends`](../../view-state/backends.ts)): `memory` (ephemeral) and
  `local` (localStorage — seeds from storage, persists on set, syncs across tabs, degrades to memory
  when storage is blocked). `personal` (ECHO / cross-device) is reserved.
- **Manager** ([`ViewStateManager`](../../view-state/view-state.ts)): `atom` / `get` / `set` /
  `update` / `subscribe` / `contexts`.

### The bridge (why every caller sees the same state)

`plugin-attention` constructs exactly one manager and exposes it on **both** sides of the capability
boundary:

- **As a capability** — [`AttentionPlugin.ts`](../../../../../plugins/plugin-attention/src/AttentionPlugin.ts)
  `new ViewStateManager(...)` → `Capability.contributes(AttentionCapabilities.ViewState, …)`.
- **As a React context** — [`react-context.tsx`](../../../../../plugins/plugin-attention/src/capabilities/react-context.tsx)
  mounts `<ViewStateProvider manager={useCapability(AttentionCapabilities.ViewState)}>` — the _same_
  instance.

So the two access patterns below are two doors into one store: a value written through the capability
is read through the hooks, and vice-versa.

---

## The two canonical patterns

### Pattern A — React: the context hooks (components **and** containers)

The path React code uses today. It is the **only** path available to presentation components (they
must not resolve capabilities — they throw without a `PluginManager` and must render in isolated
stories), and containers use it too. Reads fall back to the aspect default when no provider is
present, so stories work without wiring.

```ts
// Define the aspect once (co-located with the feature).
export const companionVariantAspect = defineViewState<CompanionSelection>({
  key: 'deck-companion-variant',
  backend: 'local',
  schema: CompanionSelectionSchema,
  defaultValue: () => ({}),
});

// Read (reactive):
const variant = useViewState(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT).variant;

// Write:
const { set, update, clear } = useViewStateActions(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT);
```

- Hooks: [`useViewState`](./ViewStateProvider.tsx), [`useViewStateActions`](./ViewStateProvider.tsx)
  (`{ set, update, clear }`), [`useViewStateManagerOptional`](./ViewStateProvider.tsx) for direct
  access, and the selection helpers [`useSelection`](./ViewStateProvider.tsx) /
  [`useSelectionActions`](./ViewStateProvider.tsx) built on top.
- Live examples:
  [`plugin-deck/hooks/useSelectedCompanionVariant.ts`](../../../../../plugins/plugin-deck/src/hooks/useSelectedCompanionVariant.ts),
  [`plugin-deck/hooks/useCompanionSplit.ts`](../../../../../plugins/plugin-deck/src/hooks/useCompanionSplit.ts).

### Pattern B — Non-React: the capability (operations, capability modules, app-graph builders)

For Effect / non-React code that **cannot** call hooks but can resolve capabilities and must read or
write the same state.

```ts
// In a capability module or operation (Effect):
const manager = yield* Capability.get(AttentionCapabilities.ViewState);
const value = manager.get(aspect, contextId);
manager.set(aspect, contextId, next);

// Imperative seam wrapped as a store (adapts the manager onto a getState/setState interface):
export const createEditorViewStateStore = (manager: ViewStateManager): EditorStateStore => ({
  getState: (id) => manager.get(editorViewStateAspect, id),
  setState: (id, state) => manager.set(editorViewStateAspect, id, state),
});
```

- Live examples:
  [`plugin-markdown/capabilities/state.ts`](../../../../../plugins/plugin-markdown/src/capabilities/state.ts)
  + [`editor-view-state.ts`](../../../../../plugins/plugin-markdown/src/capabilities/editor-view-state.ts),
  [`plugin-attention/operations/select.ts`](../../../../../plugins/plugin-attention/src/operations/select.ts),
  [`plugin-inbox/capabilities/app-graph-builder.ts`](../../../../../plugins/plugin-inbox/src/capabilities/app-graph-builder.ts).

**In practice today:** React code (components _and_ containers) uses Pattern A; non-React code
(operations, capability modules, app-graph builders) uses Pattern B. The two often appear in the same
feature — a container reads an aspect through the hooks while that feature's graph-builder writes the
same aspect through the capability.

---

## ViewState vs. the Settings store — the distinction

These are **different mechanisms** and must not be conflated.

|                | **ViewState**                                        | **Settings store**                                             |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| Purpose        | per-context, durable **UI state**                    | plugin-wide **configuration / user preferences**               |
| Keyed by       | `(aspect, contextId)` — the object/surface           | plugin id (`meta.profile.key`)                                 |
| Granularity    | one value per context (per document, tab, selection) | one settings blob per plugin                                   |
| Built with     | `defineViewState` + `ViewStateManager`               | [`createKvsStore`](../../../../../common/effect/src/atom-kvs.ts) |
| Accessed via   | Pattern A hooks / Pattern B capability               | `useAtomCapabilityState(XCapabilities.Settings)`               |
| Surfaced in UI | no                                                   | yes — `AppCapabilities.Settings` renders it in Settings        |
| Example        | companion tab, editor caret, view mode               | `loadRemoteImages`, `conversations`                            |

**Decision rule (sharpened):**

- **Settings store** — a **user preference, set infrequently**, that applies globally and is
  surfaced in the Settings UI (e.g. `loadRemoteImages`, `conversations`).
- **ViewState** — the **current, sticky UI state that must persist across navigation** (and reloads):
  which tab/variant is selected, scroll/caret position, a split ratio, a selection set, the view mode
  of the surface you're on. Changes constantly as the user works; keyed by context, not shown in
  Settings.

The tell: if the user _configures_ it once and forgets it → Settings; if it _tracks what they are
currently doing_ and should still be there when they come back → ViewState.

**Consolidation:** a plugin should keep its persisted state in **one Settings object** (the plugin's
settings schema) and **one ViewState object per aspect** — group related variables into a single
struct rather than scattering many one-field atoms/aspects. Prefer widening an existing schema (add a
field) over introducing a parallel store. This keeps a plugin's durable state auditable at a glance
and matches how both stores serialize (one blob per plugin for settings; one value per
`(aspect, contextId)` for view state).

---

## Passing durable UI state to low-level components

A presentation/low-level component must not touch capabilities (it throws without a `PluginManager`
and must render in isolated stories). The container resolves the state and hands it down. Three
shapes are possible:

- **Atom** — the container passes a writable atom down; the component reads/writes via
  `useAtomValue` / `useAtomSet`. _(e.g. `plugin-inbox`'s `ConversationStack` takes an `options` atom.)_
- **Callback** — the container passes plain `value` + `onChange` props.
- **Context hook** — the component calls `useViewState` itself, baking an app-specific aspect into a
  component that should be generic (and requiring a `ViewStateProvider` ancestor).

**Decision — prefer the atom for mutable state.** Reasons:

1. **Simpler** — one atom instead of a `value` + `onChange` pair to thread and keep in sync.
2. **No context requirement** — the atom is self-contained; the component works wherever it's
   rendered without a `ViewStateProvider` (or any provider) ancestor, so it stays generic and
   trivially storybook-able.

Targeted re-renders (only atom subscribers update) come for free. Use `value` + callback only for a
single read-mostly leaf where an atom would be overkill.

**Caveat — a ViewState `local` atom does not self-persist.** `manager.atom(aspect, id)` is a plain
seeded atom; persistence to localStorage happens in `manager.set` → `backend.persist`, **not** on a
direct `ctx.set`/`useAtomSet` of that atom. (A `createKvsStore` settings atom, by contrast, _does_
self-persist on set.) So you cannot hand a raw ViewState atom to a component and expect its writes to
stick. Two correct shapes:

- Write through the manager (`useViewStateActions().set`, or `manager.set` in a container).
- Or expose a **writable derived atom** whose read tracks `manager.atom(...)` and whose write calls
  `manager.set(...)`. This is how `plugin-inbox`'s `MessageArticle` hands `ConversationStack` one
  `options` atom that spans a ViewState field (`viewMode`, persisted via `manager.set`) and a settings
  field (`loadRemoteImages`, persisted via its self-persisting atom).

---

## The `@idiom` markers

Each store is named by one idiom (NSID slug), pinned to its canonical artifact:

- **`org.dxos.react-ui-attention.viewState`** → on `defineViewState` (`view-state/view-state.ts`).
- **`org.dxos.effect.kvsStore`** → on `createKvsStore` (`common/effect/src/atom-kvs.ts`), the Settings
  store, cross-referenced as `related`.

The composer-ui skill's **State management** section references both.

---

## Consistency inventory (2026-07-22)

**Pattern A (hooks) — correct:** `plugin-deck` (companion variant, split), `plugin-map`, `plugin-trip`,
`plugin-commerce`, `plugin-space` (object-card-stack, type-article), `plugin-ibkr`, `plugin-video`,
`plugin-magazine`, `plugin-inbox` (mailbox, calendar), `react-ui-table`, `react-ui-form`.

**Pattern B (capability) — correct:** `plugin-markdown` (editor state), `plugin-attention` (select),
`plugin-deck` (update-companion), and the `*/capabilities/app-graph-builder.ts` of `plugin-inbox`,
`plugin-trip`, `plugin-comments`, `plugin-ibkr`, `plugin-magazine`, `plugin-assistant`.

**Gaps to resolve (this PR):**

1. ✅ **`plugin-inbox` message view mode** — moved from the Settings store to a ViewState aspect
   (`messageViewModeAspect`, keyed by attendable); `MessageArticle` projects it + `loadRemoteImages`
   into one writable derived atom for `ConversationStack`.
2. **No `@idiom` marker yet** — add the single marker above.
3. **Confirm no other per-context UI state is misfiled in a Settings store** across plugins.

---

## Next steps

1. ✅ Document the two patterns + the Settings distinction (this file).
2. ✅ Move the inbox message view mode from the Settings store to a ViewState aspect (Pattern A).
3. ✅ Add the `@idiom` markers (`viewState` on `defineViewState`, `kvsStore` on `createKvsStore`).
4. Sweep for other misfiled per-context state and align it.
