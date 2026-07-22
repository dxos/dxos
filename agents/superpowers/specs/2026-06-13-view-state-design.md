# ViewState: generalized per-context UI state with pluggable persistence

Date: 2026-06-13
Status: Approved (design)

## Problem

`react-ui-attention` exposes selection state (`useSelected`, `useSelectionActions`,
`useSelectionManager`, `SelectionManager`) stored only in memory via effect-atoms. We want:

1. Optional **device-local** persistence (localStorage) for device-specific state.
2. (Future) **personal-space** persistence (ECHO) for user-specific, cross-device state.
3. To **generalize beyond selection** — scroll position, caret range, selected item(s),
   deck configuration, etc.

Today these concerns are fragmented. Notably, the markdown editor already persists scroll +
caret position through a _separate_ mechanism (`EditorStateStore` /
`createEditorStateStore` in `packages/ui/ui-editor/src/extensions/selection.ts`), which is
exactly the kind of per-context, device-local state this design should own. Selection itself
is purely in-memory and unpersisted.

## Goals

- One generic mechanism — **`ViewState`** — for per-context UI state, of which selection is an
  aspect.
- Persistence backend is a property of the **aspect type**, declared once.
- Backend contract is **reactive and async-tolerant** so a future ECHO/personal-space backend
  slots in without rework.
- No parallel mechanisms: subsume the editor's existing `EditorStateStore`.

## Non-goals (this iteration)

- The personal-space (ECHO) backend. Designed-for via the contract; not implemented.
- New aspects for caret-only, deck config, etc. (only selection + editor-state are migrated).
- Server-side persistence.

## Concepts

- **Aspect** — a named kind of per-context state, declared once:
  `defineViewState({ key, backend, schema, defaultValue })`.
  - `key: string` — unique aspect id (e.g. `'selection'`, `'editor'`).
  - `backend: 'memory' | 'local'` — (`'personal'` reserved for future).
  - `schema: Schema.Schema<T>` — Effect Schema; validates and (de)serializes persisted values.
  - `defaultValue: () => T`.
- **Context** — a string id scoping the state (object URI, article id, document id) — the same
  notion as today's `contextId`. Persisted storage keys use the canonical `local`-backend form
  `dxos:view-state:${aspect.key}:${contextId}` (see the Backend contract below).

## Backend contract (reactive, async-tolerant)

```ts
interface ViewStateBackend {
  // Returns a reactive, writable atom for (aspect, contextId).
  // May hydrate asynchronously; yields aspect.defaultValue() until loaded.
  atom<T>(aspect: AspectDef<T>, contextId: string): Atom.Writable<T>;
}
```

Backends:

- **`memory`** — `Map<string, Atom.Writable<T>>` keyed by `${aspect.key}:${contextId}`.
  Reproduces today's `SelectionManager` behavior. Resolves synchronously.
- **`local`** — atom synced to `localStorage`:
  - read + Schema-decode on first access (default on miss/parse failure),
  - Schema-encode + write on set,
  - `storage` event listener for cross-tab sync,
  - resolves synchronously (localStorage is sync).

  Storage keys are derived uniformly by the `local` backend (no per-aspect overrides):

  ```text
  dxos:view-state:${aspect.key}:${contextId}
  ```

  - Fixed `dxos:view-state:` namespace prefix → one greppable, clearable family.
  - `aspect.key` is the aspect's declared id (`'editor'`, …); `contextId` is the consumer's
    scoping id (for the editor, the document id → `dxos:view-state:editor:<docId>`).
  - Value is `JSON.stringify(Schema.encodeSync(aspect.schema)(value))`; decode validates on read
    and falls back to `defaultValue()` on miss/parse/validation failure.

- **`personal`** _(future)_ — atom backed by an ECHO query in the personal space; hydrates
  asynchronously, updates from other devices. The contract already permits async hydration, so
  no interface change is required.

## Manager + provider

- **`ViewStateManager`** — owns the aspect registry and a backend-by-name map, constructed from
  the effect-atom `Registry`. API:
  - `atom<T>(aspect, contextId): Atom.Writable<T>`
  - `get<T>(aspect, contextId): T`
  - `set<T>(aspect, contextId, value: T): void`
  - `subscribe(aspect, contextId, cb): () => void`
- **`ViewStateProvider`** — supplies the manager via React context. Replaces
  `SelectionProvider`. Per the repo "no shims" rule, `SelectionProvider` is removed and call
  sites updated, not aliased.

## Hooks (generic; replace selection hooks)

- `useViewState<T>(aspect, contextId?): T` — reactive read; returns `defaultValue` when
  `contextId` is undefined or unhydrated.
- `useViewStateActions<T>(aspect, contextId): { set, update, clear }` where
  `update: (fn: (prev: T) => T) => void`.

`useSelected` and `useSelectionManager` are removed; `useSelectionActions` is re-defined (see
the Selection section) as a thin wrapper over these generic hooks.

## Selection as an aspect

Selection becomes:

```ts
const selectionAspect = defineViewState({
  key: 'selection',
  backend: 'memory',
  schema: Selection, // existing union: single | multi | range | multi-range
  defaultValue: () => ({ mode: 'multi', ids: [] }),
});
```

Selection lives in a `Selection.ts` `@import-as-namespace` module holding the aspect plus pure
helpers (`Selection.aspect`, `Selection.resolve(value, mode)`, `Selection.toggle(value, id)`,
`Selection.single(id)`, `Selection.empty(mode)`, `Selection.range(from, to)`). Modes and rich
operations are genuine selection domain logic, kept out of the generic core.

### Selection hooks (thin wrappers over the generic core — option B)

To keep the 40+ call sites ergonomic and near-identical to today, selection retains a thin
hook layer built directly on `useViewState` / `useViewStateActions` (not a parallel manager):

```ts
// returns the resolved value for the requested mode
export const useSelection = <T extends SelectionMode>(contextId?: string, mode?: T): SelectionResult<T> =>
  Selection.resolve(useViewState(selectionAspect, contextId), mode);

// wraps update() with the selection helpers
export const useSelectionActions = (contextId: string) => {
  const { update, clear } = useViewStateActions(selectionAspect, contextId);
  return {
    single: (id: string) => update((prev) => Selection.single(id)),
    multi: (ids: string[]) => update(() => ({ mode: 'multi', ids })),
    range: (from: string, to: string) => update(() => Selection.range(from, to)),
    toggle: (id: string) => update((prev) => Selection.toggle(prev, id)),
    clear,
  };
};
```

These wrappers hide `selectionAspect` so consumers never name it.

### Call-site migration

All current consumers migrate:

- `useSelected(id, 'single')` → `useSelection(id, 'single')`.
- `useSelectionActions([id])` → `useSelectionActions(id)` (single `contextId`, not an array),
  with method names `single` / `multi` / `range` / `toggle` / `clear`.
- `useSelectionManager()` is removed; nothing should reach the manager directly — uses route
  through the hooks. If a non-React consumer needs raw access, it takes the
  `ViewStateManager` explicitly.

Known consumers include: `react-ui-table` (`useTableModel`), plugin-trip, plugin-map,
plugin-feed, plugin-inbox (mailbox/calendar/drafts), plus the `SelectionProvider` mount points.

## Exemplar: migrate `EditorStateStore` to a ViewState aspect

Replace the editor's bespoke localStorage store with a `local`-backed aspect:

```ts
const editorViewStateAspect = defineViewState({
  key: 'editor',
  backend: 'local',
  schema: EditorSelectionStateSchema, // { scrollTo?: number; selection?: { anchor; head? } }
  defaultValue: () => ({}),
});
```

- Add an Effect Schema for `EditorSelectionState` (currently a plain TS type).
- `packages/ui/ui-editor/src/extensions/selection.ts`: the `selectionState()` extension reads
  and writes through the `ViewStateManager` instead of `EditorStateStore`.
- `plugin-markdown`: `createEditorStateStore` and the `EditorState` capability are removed;
  `MarkdownEditorContent` reads initial `{ scrollTo, selection }` from the ViewState aspect
  keyed by document id, and the editor extension persists via the same aspect.
- No legacy-key migration. Editor state moves to the uniform key
  `dxos:view-state:editor:<docId>`; old `org.dxos.plugin.markdown.editor/*` entries are
  abandoned and users re-establish scroll/caret on next open.
- Delete `createEditorStateStore`; update all references.

## Placement

Everything lives in `react-ui-attention` (selection/attention already co-locate here). New
files (suggested):

- `src/view-state/ViewState.ts` — `defineViewState`, `Aspect`, `ViewStateManager`, with backend
  implementations in `src/view-state/backends.ts`.
- `src/view-state/Selection.ts` — reduced to the `selectionAspect` + helpers, re-using `Selection`.
- `src/components/ViewStateProvider/` — replaces `SelectionProvider`.

The package's UI-free `./types` entry point continues to re-export the non-DOM pieces
(`defineViewState`, schemas, `Selection`, helpers).

## Testing

- Unit tests (vitest, `describe`/`test`, `test('…', ({ expect }) => …)`):
  - `ViewStateManager`: registration, get/set/subscribe, atom identity per `(aspect, context)`.
  - `memory` backend: isolation across contexts; default values.
  - `local` backend: persistence round-trip via an injected fake `Storage`; Schema
    encode/decode; cross-tab `storage` event; default on parse failure.
  - Selection helpers (`toggle`, `resolve`, `range`, `single`) as pure-function tests.
  - Editor-state aspect: encode/decode round-trip matches the existing serialized shape.
- Extend the existing selection test suite rather than forking a new one where applicable.
- Backends are injected (Storage, Registry) so no real localStorage/DOM is required.

## Risks / open items

- **Selection call-site churn (largest blast radius).** Sites move to the new
  `useSelection` / `useSelectionActions` wrappers; signatures are near-identical to today, but
  `useSelectionActions` now takes a single `contextId` (not an array) and exposes
  `single`/`multi`/`range`/`toggle`/`clear`. Semantics must not drift.
- **Schema for `EditorSelectionState`** is new; ensure it matches the existing serialized shape
  exactly (no migration safety net, so the encode/decode round-trip must be correct).
