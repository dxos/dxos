# Phase 4 — Suggestions review layer (comment-style cards)

Status: draft (2026-07-20). Implements DESIGN.md Phase 4 + folds in the deferred Phase 2 wiring.
Depends on: #12286 (Phase 3 `suggestions`/`groupHunks`) landed.

## Goal

Move the suggestion review surface into **plugin-comments**: for a document and its
`kind:'suggestion'` branches, overlay the Phase-3 multi-author `suggestions` extension in the editor
and render **one anchored card per grouped change** (author, before→after, Accept/Reject, optional
reply thread) in a companion — reusing the comments anchoring + thread-card UI. Collapse the
`suggest` diff-view mode out of plugin-markdown.

## What already exists (leverage)

- Phase 3: `suggestions({ sources })` + `groupHunks` in `@dxos/ui-editor` (#12286).
- Phase 1: durable `CollaborationOperation.AcceptChange` / `RejectChange` (+ undo).
- Phase 2 core: `Branch.suggestion` (find-or-create per author), `archiveIfEmpty`, `Branch.label`.
- plugin-comments review plumbing: `AnchoredTo.branch`, `reviewBranch` threading
  (VersioningState → editor → branch-scoped anchor filters), `CommentsArticle` companion,
  `CommentThread` card on `@dxos/react-ui-thread`, `handleAcceptChange` already cherry-picking via
  `CollaborationOperation.AcceptChange` using `anchor.branch ?? reviewBranch`.
- The comments extension provider (`markdown-extension.ts`) already mounts a per-branch review
  extension via `MarkdownCapabilities.ExtensionProvider`.

## Architecture

Suggestions are **derived from branch diffs**, not a second persisted annotation store. The source of
truth for a suggestion is the author's `kind:'suggestion'` branch content; a card is a rendered view
of `groupHunks(diffHunks(main, branchContent))`. Accept/Reject act on the branch via the durable ops,
which changes the diff so the card re-renders or vanishes. Only an **optional reply thread** is a
persisted `AnchoredTo` + `Thread` (reusing comments), attached to the group's anchor.

### A. `@dxos/ui-editor` (primitives — mostly done)

- `suggestions({ sources })` already composes N author diffs. Add nothing structural; possibly expose
  a helper to build `sources` from branch records.

### B. `@dxos/plugin-comments` (the review layer — most of the work)

1. **Suggestion sources** — enumerate a document's active `kind:'suggestion'` branches
   (`doc.history.branches`), bind each (`Branch.bind`) to read content, map to
   `SuggestionSource { author: branch.creator, colour, content }`. Colour from the awareness palette
   keyed by `creator` DID (matches cursor colour). → `hooks/useSuggestionSources.ts`.
2. **Editor extension** — a new `MarkdownCapabilities.ExtensionProvider` that mounts
   `suggestions({ sources, group })` with `onAccept/onReject` routed to `CollaborationOperation.
AcceptChange/RejectChange` (`subject = doc`, `branch = author branch key`). Generalizes the
   single-branch `suggest` overlay that currently lives in plugin-markdown.
3. **Suggestions companion** — a dedicated `'suggestions'` companion surface (sibling to `'comments'`):
   `react-surface.tsx` literal + `app-graph-builder.ts` companion node. Renders one **SuggestionCard**
   per group.
4. **SuggestionCard** — reuse `@dxos/react-ui-thread` primitives + the `ObjectTile`/`components`
   injection from `CommentsArticle`. Shows author (name/avatar via `getMessageMetadata`/`Actor`),
   before→after (from the group's `removed`/`inserted`), Accept/Reject buttons (durable ops), and an
   optional reply `Thread` (create-on-first-reply via `CommentOperation` reusing `AnchoredTo`).
5. **Grouping** — `groupHunks(hunks, base, policy)` with a card per group; accept/reject-all with
   optional per-hunk controls (v1: whole-group accept/reject).

### C. `@dxos/plugin-markdown` (collapse `suggest`)

- Remove `'suggest'` from `Markdown.Settings.DiffViewMode`; `diffView` reverts to
  `inline | sideBySide | gutter`.
- Remove the `suggestActive` / parent-binding / `compareCompartment` suggest path from
  `MarkdownArticle`; the `[Base|Diff|Branch]` selector's Diff shows the read-only diff variants.
- The suggestion overlay now comes from plugin-comments' extension provider (works for any
  text-bearing object, not just markdown).

### D. Phase 2 wiring (folded in — lifecycle resolved here)

1. **Authoring entry** — a "Suggest edit" affordance that routes a user's edit to their suggestion
   branch: `Branch.suggestion(doc, parent, creatorDID)` (lazy find-or-create) then apply the edit to
   the bound branch. `creatorDID` from `useIdentity()`. Minimal v1: a per-surface "suggesting" toggle
   that binds the editor to the caller's suggestion branch (reusing the existing branch-binding path).
2. **Archive lifecycle** — reconcile `archiveIfEmpty` with undoable reject: do NOT archive
   synchronously inside the reject op (breaks its undo). Instead sweep empty suggestion branches
   lazily — on document open and after a debounce following accept/reject — so in-session undo still
   works. Accept-side "fully absorbed by main" archival needs a re-diff vs current main (small
   `archiveIfEmpty` variant or a `pruneAbsorbedSuggestions` helper in `@dxos/versioning`).

## Decisions (resolved 2026-07-20)

1. **Unified 'review' companion.** Comment threads and suggestion cards render together in one
   companion (extend `CommentsArticle`), not a separate surface.
2. **Include minimal authoring.** Phase 4 is end-to-end: a "suggest edit" toggle routes typed edits
   to the user's lazy-created `kind:'suggestion'` branch, then review/accept/reject.
3. **Archive timing — lazy sweep.** Never archive synchronously in the reject op (breaks undo); sweep
   empty suggestion branches on document open + debounced after accept/reject.

## Task breakdown (each independently green)

1. `useSuggestionSources` + colour-from-awareness helper (+ test). — plugin-comments
2. Suggestions editor-extension provider routing accept/reject to durable ops (+ story). — plugin-comments
3. `'suggestions'` companion surface + app-graph node. — plugin-comments
4. `SuggestionCard` component (author/before-after/accept-reject; reply thread optional) (+ story). — plugin-comments
5. Collapse `suggest` in plugin-markdown (DiffViewMode + MarkdownArticle). — plugin-markdown
6. Phase 2 authoring toggle (lazy-create suggestion branch) (+ op/test). — plugin-markdown/comments
7. Archive lifecycle (lazy sweep + accept-absorbed prune) (+ versioning test). — versioning + wiring
8. Changeset + PR.

## Test/verify

Per step: unit tests (sources, grouping, ops), react-ui-editor/plugin-comments stories (multi-author
cards, accept/reject re-diff), and storybook render checks. End-to-end in the DocumentVersioning
integrated story.
