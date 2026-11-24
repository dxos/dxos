# Review-mode lifecycle: one owner for the editor binding

Status: DRAFT — for sign-off. Author: agent session, 2026-07-25.
Context: `.agents/projects/document-revisions/TASKS.md` (F1.1–F1.7); harness in
`packages/plugins/plugin-review/src/hooks/useVersionedEditor.test.tsx`.

## Problem

The Suggesting/Markdown/Plain-text mode switches keep regressing (stale strikes F1.2, read-only endings
F1.7, gutter/decoration flicker F1.1, extra gutter on entry). Each fix has patched a symptom. The cause
is structural: the "what is the editor bound to, and how does it render" decision is split across four
places that each hold part of the state —

1. `useVersioning` — review mode + version selection (view state).
2. `useVersionedEditor` — binding target, own-branch bind effect, `editorKey`, `effectiveViewMode`.
3. `MarkdownArticle` — view-mode dropdown mapping (`preview`/`source` → `editing`, `readonly` →
   `viewing`), `BindingBoundary` remount, `useTextEditor` reconfiguration.
4. The extension layer — overlays added/removed rather than reconfigured (`suggestions()` swaps whole
   extension arrays; the change-bar gutter mounts with them).

Transitions are therefore emergent: each layer reacts to the others' outputs in effect order, so
sequence-dependent bugs (round-trips) cannot be reasoned about or tested in one place.

## Decision (proposed)

**A single reducer-style lifecycle model in plugin-review** — pure function from
`(previous state, event)` to `(binding descriptor)`, with the hooks reduced to adapters:

- **Events:** `set-mode(editing|suggesting|viewing)`, `set-view-mode(preview|source|readonly)`,
  `select-version(...)`, `branch-resolved(text)`, `main-changed`.
- **State:** one record — `{ mode, viewMode, selection, ownBranch?: 'pending'|'bound' }`.
- **Output (binding descriptor):** `{ subject, editorKey, editable, overlays: {...enabled flags} }` —
  computed, never stored, so no layer can hold a stale copy.

Consequences, mapped to the open defects:

- **F1.2** — the model owns own-branch lifecycle: on `set-mode(suggesting)` with an existing unchanged
  own branch, it fast-forwards the branch to main (`Branch.suggestion` gains a fast-forward-if-unedited
  step in `@dxos/versioning`). The harness's expected-fail flips.
- **F1.7** — `editable` is a pure function of `(mode, viewMode, selection)`; a round-trip cannot end in
  a state the model does not enumerate. The harness already proves the current hooks compute this
  correctly, so the fix lands in layer 3: `MarkdownArticle` stops keeping its own copy (the
  `onViewModeChange` + `setReviewMode` pair collapses into one `set-view-mode` event).
- **F1.1 / extra gutter** — overlays become compartment reconfigurations keyed by the descriptor's
  enabled flags; the change-bar gutter mounts once and empties, never unmounts (per the user's
  enable/disable suggestion).

## Testing

- The lifecycle model is a pure function → table-driven unit tests for every transition, no client.
- The existing hook harness keeps covering the async layer (bind resolution, fast-forward).
- One storybook play test per user-reported sequence (the F1.7 repro verbatim).

## Scope / non-goals

- No data-model change beyond the `Branch.suggestion` fast-forward.
- No UI change; the dropdown and companion stay as they are.
- F1.5 (block-deletion grouping) and F1.6 (trailing-suggestion access) are diff-layer concerns, out of
  scope here.

## Plan

1. `Branch.suggestion` fast-forward (+ model test) — fixes F1.2 independently of the refactor.
2. Extract the lifecycle reducer + table tests; wire `useVersionedEditor` through it (no behaviour
   change intended; harness green throughout).
3. Collapse `MarkdownArticle`'s mode mapping into events; overlay compartments for F1.1.
4. Re-run the F1 walkthrough.
