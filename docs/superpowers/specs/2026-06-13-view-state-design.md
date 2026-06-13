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
caret position through a *separate* mechanism (`EditorStateStore` /
`createEditorStateStore` in `packages/ui/ui-editor/src/extensions/selection.ts`), which is
exactly the kind of per-context, device-local state this design should own. Selection itself
is purely in-memory and unpersisted.

## Goals

- One generic mechanism — **`ViewState`** — for per-context UI state, of which selection is a
  slice.
- Persistence backend is a property of the **slice type**, declared once.
- Backend contract is **reactive and async-tolerant** so a future ECHO/personal-space backend
  slots in without rework.
- No parallel mechanisms: subsume the editor's existing `EditorStateStore`.

## Non-goals (this iteration)

- The personal-space (ECHO) backend. Designed-for via the contract; not implemented.
- New slices for caret-only, deck config, etc. (only selection + editor-state are migrated).
- Server-side persistence.

## Concepts

- **Slice** — a named kind of per-context state, declared once:
  `defineViewState({ key, backend, schema, defaultValue })`.
  - `key: string` — unique slice id (e.g. `'selection'`, `'editor'`).
  - `backend: 'memory' | 'local'` — (`'personal'` reserved for future).
  - `schema: Schema.Schema<T>` — Effect Schema; validates and (de)serializes persisted values.
  - `defaultValue: () => T`.
- **Context** — a string id scoping the state (object URI, article id, document id) — the same
  notion as today's `contextId`. Persisted storage key is `${slice.key}:${contextId}`.

## Backend contract (reactive, async-tolerant)

```ts
interface ViewStateBackend {
  // Returns a reactive, writable atom for (slice, contextId).
  // May hydrate asynchronously; yields slice.defaultValue() until loaded.
  atom<T>(slice: SliceDef<T>, contextId: string): Atom.Writable<T>;
}
```

Backends:

- **`memory`** — `Map<string, Atom.Writable<T>>` keyed by `${slice.key}:${contextId}`.
  Reproduces today's `SelectionManager` behavior. Resolves synchronously.
- **`local`** — atom synced to `localStorage`:
  - read + Schema-decode on first access (default on miss/parse failure),
  - Schema-encode + write on set,
  - `storage` event listener for cross-tab sync,
  - resolves synchronously (localStorage is sync).
- **`personal`** *(future)* — atom backed by an ECHO query in the personal space; hydrates
  asynchronously, updates from other devices. The contract already permits async hydration, so
  no interface change is required.

## Manager + provider

- **`ViewStateManager`** — owns the slice registry and a backend-by-name map, constructed from
  the effect-atom `Registry`. API:
  - `atom<T>(slice, contextId): Atom.Writable<T>`
  - `get<T>(slice, contextId): T`
  - `set<T>(slice, contextId, value: T): void`
  - `subscribe(slice, contextId, cb): () => void`
- **`ViewStateProvider`** — supplies the manager via React context. Replaces
  `SelectionProvider`. Per the repo "no shims" rule, `SelectionProvider` is removed and call
  sites updated, not aliased.

## Hooks (generic; replace selection hooks)

- `useViewState<T>(slice, contextId?): T` — reactive read; returns `defaultValue` when
  `contextId` is undefined or unhydrated.
- `useViewStateActions<T>(slice, contextId): { set, update, clear }` where
  `update: (fn: (prev: T) => T) => void`.

The previous `useSelected` / `useSelectionActions` / `useSelectionManager` are removed.

## Selection as a slice

Selection becomes:

```ts
const Selection = defineViewState({
  key: 'selection',
  backend: 'memory',
  schema: SelectionSchema, // existing union: single | multi | range | multi-range
  defaultValue: () => ({ mode: 'multi', ids: [] }),
});
```

Selection **modes** and rich operations (`toggle`, `rangeSelect`, `multiSelect`,
`resolve(value, mode)`) are genuine selection domain logic, not generic. They become small pure
helpers exported alongside the slice (e.g. a `Selection` namespace: `Selection.toggle`,
`Selection.resolve`), applied by call sites via `useViewStateActions`.

### Call-site migration

All current `useSelected` / `useSelectionActions` consumers migrate:

- `useSelected(id, 'single')` → `Selection.resolve(useViewState(Selection, id), 'single')`
  (or a thin convenience helper if the pattern is ubiquitous — decided during planning).
- Action sites use `useViewStateActions(Selection, id)` plus the selection helpers.

Known consumers include: `react-ui-table` (`useTableModel`), plugin-trip, plugin-map,
plugin-feed, plugin-inbox (mailbox/calendar/drafts), plus the `SelectionProvider` mount points.

## Exemplar: migrate `EditorStateStore` to a ViewState slice

Replace the editor's bespoke localStorage store with a `local`-backed slice:

```ts
const EditorViewState = defineViewState({
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
  `MarkdownEditorContent` reads initial `{ scrollTo, selection }` from the ViewState slice
  keyed by document id, and the editor extension persists via the same slice.
- Preserve the existing key namespace (`org.dxos.plugin.markdown.editor/{docId}`) so existing
  users' stored positions survive: the `local` backend's storage key for this slice must map to
  the same string. The slice/backend may need an optional key-mapping override to honor a legacy
  prefix; otherwise a one-time read-through migration on first access.
- Delete `createEditorStateStore`; update all references.

## Placement

Everything lives in `react-ui-attention` (selection/attention already co-locate here). New
files (suggested):

- `src/view-state.ts` — `defineViewState`, `SliceDef`, `ViewStateManager`, backend
  implementations (or split backends into `src/view-state/`).
- `src/selection.ts` — reduced to the `Selection` slice + helpers, re-using `SelectionSchema`.
- `src/components/ViewStateProvider/` — replaces `SelectionProvider`.

The package's UI-free `./types` entry point continues to re-export the non-DOM pieces
(`defineViewState`, schemas, `SelectionSchema`, helpers).

## Testing

- Unit tests (vitest, `describe`/`test`, `test('…', ({ expect }) => …)`):
  - `ViewStateManager`: registration, get/set/subscribe, atom identity per `(slice, context)`.
  - `memory` backend: isolation across contexts; default values.
  - `local` backend: persistence round-trip via an injected fake `Storage`; Schema
    encode/decode; cross-tab `storage` event; default on parse failure.
  - Selection helpers (`toggle`, `resolve`, `rangeSelect`) as pure-function tests.
  - Editor-state slice: legacy-key compatibility (reads a value written under the old prefix).
- Extend the existing selection test suite rather than forking a new one where applicable.
- Backends are injected (Storage, Registry) so no real localStorage/DOM is required.

## Risks / open items

- **Selection call-site churn (largest blast radius).** Each `useSelected` site now resolves
  the mode via a helper; semantics must not drift. Planning will decide whether a thin
  convenience helper reduces churn without re-introducing the old hook.
- **Legacy localStorage key compatibility** for editor state — must not silently lose users'
  saved scroll/caret positions.
- **Schema for `EditorSelectionState`** is new; ensure it matches the existing serialized shape
  exactly.
