# Document Revisions & Branches

Design for checkpointing, time travel, branching, and merge-back of markdown documents,
built on automerge's native versioning primitives.

Status: approved 2026-07-16. Phase 1 scope (this document) targets plugin-markdown;
see [Phase 2](#phase-2-upstreaming) for the planned generalization.

## Motivation

- A human or agent collaborator drafts changes to a document without disturbing the
  canonical copy, then proposes them for review and merge.
- Users create named checkpoints ("v2 outline") and time-travel between them.
- Users restore a document to an earlier checkpoint without losing history.

## Background: storage model

`Markdown.Document.content` is a `Ref(Text.Text)`; `Text.content` is a string held in the
Text object's own automerge leaf document (`packages/sdk/schema/src/types/Text.ts`).
CodeMirror syncs bidirectionally with the automerge doc via
`packages/ui/ui-editor/src/extensions/automerge/`.

Automerge primitives used (installed build `@automerge/automerge@3.3.0-fragments.2`):

| Primitive                    | Use                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `A.getHeads(doc)` → `Hash[]` | Checkpoint identity. Content-addressed change hashes, stable across peers.        |
| `A.view(doc, heads)`         | Cheap read-only time travel (shared memory, no copy).                             |
| `A.diff(doc, before, after)` | Patches between two checkpoints of the same doc.                                  |
| `handle.changeAt(heads, fn)` | Used internally by the editor sync; not used for branches (see constraint below). |

ECHO already wraps these: `getVersion` (heads), `checkoutVersion` (view at heads),
`getEditHistory` (`packages/core/echo/echo-client/src/echo-handler/{version,edit-history}.ts`).

### Constraint: drafts cannot hide inside one automerge doc

The tip of an automerge doc is the merge of _all_ lineages, and ECHO materializes objects
at tip. A draft made with `changeAt` therefore leaks into the canonical `Text.content`
immediately. Consequently **branches are separate `Text` objects** (their own leaf docs),
anchored to the parent by `(parent ref, parent heads)`. Merge-back is a textual 3-way
merge rather than a CRDT merge — acceptable for the draft/review use case. True
shared-history forks are phase 2 (requires core ECHO work).

## Data model

The `Version`/`Branch`/`History` schemas and the checkpoint/branch/merge model live in the
dedicated **`@dxos/versioning`** package (`packages/sdk/versioning`) — generic over any ECHO
object carrying a `history` field; only the Timeline mapping and UI wiring are plugin-local.

```ts
/** Named pointer to a state of a Text's automerge doc. Zero-copy. */
const Version = Schema.Struct({
  id: Schema.String, // Unique id; stable row identity for UI/ops.
  name: Schema.String,
  target: Ref.Ref(Text.Text), // Which Text this checkpoint addresses.
  heads: Schema.Array(Schema.String), // A.getHeads at checkpoint time.
  createdAt: Schema.String, // ISO timestamp.
  creator: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
});

/** A draft Text forked from a parent Text at a specific revision. */
const Branch = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  content: Ref.Ref(Text.Text), // The branch's own Text (own leaf doc).
  parent: Ref.Ref(Text.Text), // Root Text or another branch's Text (tree).
  anchor: Schema.Array(Schema.String), // Parent doc heads at fork point.
  status: Schema.Literal('active', 'merged', 'archived'),
  createdAt: Schema.String,
  creator: Schema.optional(Schema.String),
  mergedAt: Schema.optional(Schema.String),
});
```

`Markdown.Document` gains an optional embedded struct:

```ts
history: Schema.optional(Schema.Struct({
  branches: Schema.mutable(Schema.Array(Branch)),
  versions: Schema.mutable(Schema.Array(Version)),
})),
```

- `Document.content` remains the canonical root ("main").
- The branch **tree** is formed by `Branch.parent` references; branch-of-branch works
  without extra machinery. (Superseded by the ECHO-core model below, whose flat registry does
  **not** yet support true nested branch-of-branch — see the "landed" section's Remaining.)
- Branch Texts are children of the Document (`Obj.setParent`) so they load and delete
  with it.
- **Selection is local state.** Which branch/checkpoint a user is viewing is per-user UI
  state (React state keyed by document id), never replicated. Collaborators each view
  their own version; agents simply edit the branch's Text.

## Core operations

Plain UI-free module `src/model/versioning.ts`, unit-testable against real ECHO objects.

- `createCheckpoint(doc, { target?, name, message? })` — `getVersion(text).heads` →
  append a `Version`. Automatic checkpoints are created at branch-fork and post-merge
  points so every anchor is addressable by name.
- `createBranch(doc, { name, from?: { target, heads? } })` — resolve parent content at
  the anchor (`checkoutVersion`), create a new `Text` seeded with it, append a `Branch`,
  auto-checkpoint the parent at the anchor.
- `contentAt(text, heads)` — read-only content string at a historical point (`A.view`).
- `restore(doc, version)` — apply the historical content to the tip as a _new_ change via
  `Text.apply`/`updateText`. History is never rewritten.
- `diffVersions(a, b)` — produces a shared diff-span format (`{ from, to, kind, text }`)
  consumed by all three diff renderings. Same-doc comparisons use `A.diff`; cross-doc
  (branch vs. parent) use a text diff (diff-match-patch).
- `mergeBranch(doc, branch)` — 3-way merge: base = parent@anchor (`A.view`), ours =
  parent tip, theirs = branch tip. Non-conflicting hunks merge automatically;
  conflicting hunks resolve deterministically to the branch side with conflict-marked
  hunks left in the document for manual cleanup. Applied to the parent as a single
  `updateText` change; branch → `merged`; auto-checkpoint the parent after merge.
- `discardBranch(doc, branch)` — status `archived`; the Text is retained for recovery.
  Hard delete only via an explicit destructive action.

## UI

Validated via brainstorm mocks (`.superpowers/brainstorm/`, session 2026-07-15).

1. **History companion tab** (own companion, plugin-thread pattern; icon
   `ph--git-branch--regular`): graph companion node + Article-role surface. Layout:
   Branches section (tree-indented under main) above a checkpoint timeline of the
   selected branch; `Panel.Toolbar` with checkpoint/branch/merge actions. Clicking a
   checkpoint time-travels the editor; clicking a branch switches the editor to it.
2. **ObjectProperties extension** (plugin-script pattern): a surface registered for
   `AppSurface.ObjectProperties` filtered on `Markdown.Document`, rendering a compact
   "Versions" summary (current branch, branch/checkpoint counts) with quick actions
   (new checkpoint, open history).
3. **Editor chrome**: a slim banner between toolbar and content, shown only when off
   "main @ now". Checkpoint mode = read-only banner with Restore / Branch-from-here /
   close; branch mode = editable banner with Merge / Compare / close. The editor toolbar
   gains a branch-switcher menu.
4. **Diff view** — variants selected by a plugin setting
   `diffView: 'inline' | 'sideBySide' | 'gutter' | 'suggest'` (default `inline`):
   - `inline` — unified suggestion-style decorations (green insert, red strikethrough
     delete) over the branch text.
   - `sideBySide` — `@codemirror/merge` MergeView (new catalog dependency).
   - `gutter` — colored change bars with popovers showing base text.
   - `suggest` — the editor binds to the **parent** and overlays the branch's changes as
     Google-Docs-style suggestions with inline per-change Accept/Reject controls
     (`suggestChanges` in `@dxos/ui-editor`, `AcceptChange` cherry-pick). Transitional: the N=1
     precursor to the multi-user model below, slated to fold into the plugin-comments suggestion
     layer and be removed from `diffView` (see Decisions).
     All decoration variants consume the shared diff-span format. The compare overlay is
     reconfigured on a CodeMirror `Compartment` so toggling it does not remount the editor
     (rebinding automerge / losing selection); binding changes still remount via the editor key.

Every new component ships with a storybook story.

## Agent surface

Operations (see `operations` skill) so agents can draft and propose changes:

- `create-checkpoint`, `create-branch`, `merge-branch`, `get-history`.
- Agent drafting flow: `create-branch` → existing `update-markdown` targeting the branch
  Text → human reviews diff in the editor → merge.

## Testing

- Vitest unit tests for `model/versioning.ts`: checkpoint identity, time travel,
  branch fork content, restore, 3-way merge (clean, conflicting, concurrent parent
  edits), discard/archive.
- Storybook stories rendered + console-checked for all new components.
- `moon run plugin-markdown:build` / `:test` / `:lint` + `pnpm format` gates.

## Convergence with ECHO-core branching (landed)

The staged convergence with PR #11829's ECHO-core branching
([`agents/superpowers/plans/2026-07-17-branching-convergence.md`](../../../agents/superpowers/plans/2026-07-17-branching-convergence.md))
has landed. The content-copy fork described above is superseded; the current model:

- **True CRDT forks.** `Branch.create` forks the parent Text as an ECHO-core branch (same object
  id, shared automerge history) via `db.createBranch`; the `Branch` record is product metadata
  keyed into the space-root branch registry by `Branch.key`. `mergeBranch` is a conflict-free CRDT
  merge (`db.mergeBranch`) — no marker conflicts between core branches.
- **Per-surface bindings.** `db.branch(obj, name)` returns a caller-owned writable binding, so an
  agent (or a second plank) edits a branch while the user stays on main; the editor and the
  branch-scoped `Update`/`AcceptChange` operations write through it.
- **Checkpoints** view via `setTimeTravel` pinning (not snapshot-swap); a checkpoint taken on a
  branch carries `Version.branch` (its heads live in the branch doc) and resolves against it.
- **Generic history companion.** The git-graph companion lives in plugin-space, gated per-type by
  `SpaceCapabilities.HistoryProvider`; markdown contributes the provider. Each lane ends in a
  synthetic tip node — `Now` on main, `Tip` on each active branch — that reselects the editable
  present of that lane; selecting a branch checkpoint pins the branch-bound Text and closing the
  banner returns to the branch tip (not main).
- **Review workflow.** Branch-aware comments (`AnchoredTo.branch`, scoped to the review branch) +
  per-hunk `AcceptChange` cherry-pick; the editable unified merge overlay backs the sideBySide
  compare. Instant CRDT merge is the default.

`merge3` and the conflict-marker editor are retained for **external/imported** content (and any
legacy content-copy `Branch` record — `key` unset, `content` set — which stays mergeable via
`merge3` until it drains); they are no longer the branch-merge path.

Remaining: generalize record refs over `Ref(Obj.Any)` so non-Text objects (sketches, sheets) can be
versioned; branch-level access control (draft visible only to its author); alignment with subduction
fragments (`FragmentMeta.checkpoints`) for history compaction. **True nested branch-of-branch** (a
branch forked off another branch's tip, kept live, merged child→parent→main) is not yet supported:
the core registry (`DatabaseDirectory.branches`) is flat, keyed by the root object id, and forks
always derive from the root doc, so forking at a sub-branch's frontier hits an unreachable frontier.
Chained fork→merge→fork→merge sequences work today (`ChainedBranches` story); true nesting needs a
nested/parent-aware registry key.

## Multi-user suggestions (Google-Docs model) — planned

Today's review is **one draft, one reviewer**: a single branch (agent- or user-authored) is
diffed against main and its hunks accepted/rejected via `suggestChanges` + `AcceptChange`. The
next step generalizes this to a **multi-user suggestion mode** modelled on Google Docs
"Suggesting".

### Target behaviour (Google Docs)

- Editing in _suggesting_ mode records each change as an attributed **suggestion** instead of
  mutating the document; the base document is the "accepted" state.
- **Every** collaborator's suggestions are visible at once, inline, attributed per author
  (insertions in the author's colour, deletions struck through).
- Each suggestion has a **margin card** (comment-style) showing author, the proposed change, and
  **Accept / Reject** — and **any** editor may accept or reject **any** author's suggestion, not
  only their own. Accept applies it to the document; Reject drops it.
- Suggestions are anchored to text and survive concurrent edits; overlapping suggestions from
  different authors coexist.

### Mapping onto the branch model

The per-user suggestion buffer is naturally a **per-user branch** off main, so the existing
ECHO-core branch/registry/merge machinery carries most of the weight:

- **One suggestion branch per user per document.** Auto-created lazily on the first suggested
  edit and keyed by author identity (`Branch.creator` = identity DID), distinct from explicit
  named "draft" branches. Add a `Branch.kind: 'suggestion' | 'draft'` discriminator (suggestion
  branches are unnamed — labelled by author — and **space-visible** by default, unlike private
  drafts). The flat root-keyed registry already allows many branches per object, so N users → N
  sibling branches with no new registry work.
- **Aggregated overlay.** The editor binds to **main** and overlays the union of every active
  suggestion branch's diff against main: `diffHunks(main, branchContent)` per branch, each hunk an
  independently-acceptable suggestion tagged with its branch's author. This generalizes the
  single-branch `suggestChanges` overlay (see `diffView: 'suggest'`) to N branches with per-hunk
  attribution (author colour + name). The new primitive is an **overlay compositor** that renders
  several base-aligned author-diffs together and interleaves overlapping hunks.
- **Accept / reject anyone's.** Accept a hunk = cherry-pick it from _that author's_ branch into
  main (`AcceptChange`, `subject = main`, `branch = authorBranchKey`); Reject = splice the base back
  into the author's branch at that hunk. Both are single edits that make the hunk vanish from the
  re-diff, both are open to any writer (no author restriction), and both are Operations with
  registered `UndoMapping` inverses so they undo cleanly. See decision 4.
- **Comment-style bubbles.** Each suggestion renders as an **anchored card** (author, the change,
  Accept/Reject, optional reply thread) in the margin/companion, reusing the comment anchoring +
  thread UI rather than a parallel one.

### Move the review layer to plugin-comments

Suggestions and comments are the same shape — **anchored, attributed annotations over text with a
margin card** — so the review surface belongs with comments, not markdown:

- **plugin-comments already owns** `Cursor`-based anchoring (`AnchoredTo`), `Thread`/`Message`
  cards, author attribution, editor decorations, and the `CommentsArticle` companion; it is already
  branch-aware (`CommentOperation … branch` / `AnchoredTo.branch`). A suggestion is a specialized
  anchored annotation whose card carries a diff + Accept/Reject instead of a message body.
- **Move** the review orchestration there: the aggregated overlay wiring, the suggestion cards, and
  the accept/reject actions. The diff/merge **primitives stay put** — `diffHunks` /
  `versionDiff` / `suggestChanges` / `cherryPickHunk` in `@dxos/ui-editor`, branch/merge in
  `@dxos/versioning`. plugin-comments composes them into a "suggestions" layer over any text
  object, keyed by the space branch registry.
- **plugin-markdown** keeps only the document-specific glue (contributing the extension provider +
  `diffView` setting), matching how the history companion already lives in plugin-space gated per
  type by `SpaceCapabilities.HistoryProvider`. This makes suggestions reusable for any text-bearing
  object, not just markdown.

### Decisions (resolved 2026-07-19)

1. **Overlay compositor — stack + re-diff.** Overlapping suggestions from different authors render
   as independent stacked cards (not a merged conflict block). Accepting one cherry-picks it into
   main and re-diffs every branch, so the others re-express against the new main (may shrink or
   vanish). Colour per author from the identity/awareness palette (matches their cursor colour);
   hunks ordered by main offset then author, with same-offset inserts/deletes stacked in a
   deterministic author order.
2. **Lifecycle — lazy create, auto-archive when empty.** A user's suggestion branch is created on
   their first suggested edit and auto-archived (`status='archived'`, Text retained) as soon as its
   diff vs main is empty (every hunk accepted or rejected). A cheap re-diff after each accept/reject
   drives the emptiness check; a later edit re-forks a fresh branch.
3. **Access control — decoupled.** Suggestion branches are space-visible/writable by kind
   (`Branch.kind='suggestion'`); the feature ships **without** branch-level ACL. Private drafts
   remain the separate ACL follow-up (see Remaining).
4. **Accept / reject — durable + undoable.** Accept splices the author's hunk into main; Reject
   splices the base back into the author's branch. Both are single edits that make the hunk vanish
   from the re-diff (no rejected-marker or stable-hunk-id machinery). Both are Operations
   (`AcceptChange`, new `RejectChange`) that register `UndoMapping` inverses
   (`app-framework/.../plugin-process-manager/history`), so the standard undo reverses them — the
   suggested text is recoverable (recorded by the op / present in the branch's automerge history),
   so durable ≠ lost.
5. **Card granularity — grouped, adjustable.** An author's hunks are coalesced into cards by a
   configurable `groupHunks(hunks, policy)` — defaults: coalesce across short unchanged gaps
   (word-closeness), do not cross paragraph/block boundaries. A card offers accept/reject-all with
   optional per-hunk controls. Attribution is `Branch.creator`, resolved to name/avatar via the same
   `Actor`/`Person` mechanism comment threads use. Co-authoring a single suggestion is out of scope
   (overlapping edits become separate stacked suggestions per decision 1).
6. **`suggest` collapses into the multi-user layer.** The single-user `suggest` overlay is the N=1
   case of the compositor; it moves into the plugin-comments suggestion layer as one code path, and
   `diffView` reverts to the three branch-vs-parent compare variants
   (`inline`/`sideBySide`/`gutter`).

### Implementation plan

Each phase is independently shippable and leaves the tree green. File paths are the intended homes;
"→ test/story" names the coverage each step must add.

#### Phase 1 — durable, undoable Accept/Reject (no new UI)

Foundation: make the existing single-branch accept flow durable-symmetric and undoable.

- **`RejectChange` operation.** Add the definition next to `AcceptChange` in
  `packages/sdk/app-toolkit/src/operations/CollaborationOperation.ts` — same input shape
  `{ subject, anchor, branch }`. Handler `packages/plugins/plugin-markdown/src/operations/reject-change.ts`
  (mirror `accept-change.ts`): resolve the subject's content, `getRangeFromCursor(anchor)`, read the
  compare `branch`'s text (`getObjectOnBranch`), and `cherryPickHunk(branchContent, base, range)` to
  splice the **base** back into the **branch** at that hunk (revert). Register in
  `operations/index.ts` (`MarkdownOperationHandlerSet`). → `reject-change.test.ts`.
- **Undo mappings.** Register `AppCapabilities.UndoMapping` for both ops (mirror plugin-comments'
  registration in `capabilities/`): each `UndoMapping` supplies an `inverse` op + `deriveContext`
  that reconstructs the inverse input from the forward input/output (the op returns the replaced
  text so the inverse can restore it). Accept's inverse re-splices the original into main; Reject's
  inverse re-applies the suggested text. → extend `versioning.test.ts` round-trip with accept→undo,
  reject→undo.

#### Phase 2 — per-user suggestion branches (`Branch.kind` + lifecycle)

- **Schema.** Add `kind: Schema.optional(Schema.Literal('suggestion', 'draft'))` to `Branch`
  (`packages/sdk/versioning/src/internal/types.ts`); existing/explicit branches read as `draft`.
- **Helpers** in `@dxos/versioning` `Branch.ts`: `suggestionBranch(doc, creator)` — find-or-create
  the caller's `kind:'suggestion'` branch keyed by `creator` (identity DID), idempotent;
  `archiveIfEmpty(doc, branch)` — re-diff the branch vs its parent-at-anchor and `discard` (archive)
  when zero hunks. `Branch.label` resolves a suggestion branch to its author (DID → `Person`).
- **Wiring.** Lazy-create on the first suggested edit; call `archiveIfEmpty` after each accept/reject
  (Phase 1). → `branch.test.ts`: find-or-create idempotency, archive-when-empty.

#### Phase 3 — multi-source overlay compositor + grouping (`@dxos/ui-editor/review`)

- **`suggestions({ base, sources })` extension** generalizing `suggestChanges`: `sources:
Array<{ author, colour, content }>`. Per source compute `diffHunks(base, content)`, tag each hunk
  with author/colour, and compose one decoration set — overlapping hunks stack deterministically
  (offset, then author). `suggestChanges` becomes the `sources.length === 1` wrapper.
- **`groupHunks(hunks, policy)`** pure fn (`review/diff.ts`): coalesce an author's adjacent hunks;
  `policy` = `{ maxGap, respectBlockBoundaries }` with defaults. → `diff.test.ts` (grouping cases).
- **Author colour** from the editor's collaboration awareness palette
  (`ui-editor/src/extensions/collab/awareness`) so a suggestion matches the author's cursor colour.
- → `Suggestions.stories.tsx` (react-ui-editor): 2–3 authors incl. an overlap; accept re-diffs.

#### Phase 4 — comment-style cards; move the review layer to plugin-comments

- **Suggestions review layer in plugin-comments.** A companion/overlay that, for a document + its
  `kind:'suggestion'` branches, mounts the `suggestions` overlay (Phase 3) and renders one **anchored
  card per group** (author, before/after, Accept/Reject → the Phase-1 ops with the author's branch
  key), reusing `AnchoredTo` anchoring + the `Thread`/`Message` card UI and the `CommentsArticle`
  companion. Cards carry an optional reply thread.
- **Collapse `suggest`.** Remove `'suggest'` from `Markdown.Settings.DiffViewMode`
  (`types/Settings.ts`) and the `suggestActive`/parent-binding branch + its compartment handling in
  `MarkdownArticle`; `diffView` reverts to `inline | sideBySide | gutter`. plugin-markdown keeps only
  the extension-provider + settings contribution.
- **Deps.** plugin-comments → `@dxos/ui-editor` (suggestions) + `@dxos/versioning` (branch/merge) —
  both are lower layers, no cycle. → plugin-comments multi-author suggestions story + accept/reject.

#### Phase 5 — branch-level ACL (separate track)

Out of scope here; suggestion branches stay space-visible until the echo-core branch ACL lands
(see `@dxos/echo-client` VERSIONING.md). Then: model private drafts as author-only, and re-express
Reject (a non-author writing the author's branch) as a permitted op under that ACL.

### Ambient review model (spec — brainstormed 2026-07-21)

The 2026-07-19 plan built the review **substrate** (per-user `kind:'suggestion'` branches,
durable/undoable `AcceptChange`/`RejectChange`, the multi-source `suggestions({ sources })`
overlay, and the comment-style card review layer in plugin-comments). That substrate is reached
today only by **explicitly selecting a branch** and viewing its diff — the user actively manages
branches. This subsection specs the **ambient** surface that makes multi-user review the default,
Google-Docs-style: _the user does not manage branches; by default they see main + comments + all
users' suggestions at once._

This **supersedes decision 6** of the 2026-07-19 plan ("collapse `suggest` / remove the branch
switcher"): the explicit version UI is **retained as an advanced/history path**, and the ambient
overlay is layered as the new default. Nothing is removed.

#### Interaction model

- **Three per-user modes**, a local UI preference persisted per document alongside the existing
  `VersioningState.selection`/`view` (each collaborator has their own; not stored on the object):
  - **Editing** — typing edits **main**; all suggestions overlaid read-only; comments visible.
  - **Suggesting** — typing accrues to the current user's `kind:'suggestion'` branch (find-or-create
    via `Branch.suggestion`); all suggestions overlaid with the user's own highlighted; comments
    visible.
  - **Viewing** — read-only; suggestions hidden (clean read); comments still visible.
- **Default mode**: Editing for users with write access to main; Viewing for read-only users. Mode
  _availability_ hardens under Keyhive ACLs later (see Phase 5); open for all today.
- **Rendering is a product-level policy**, not hardwired. A `ReviewRenderPolicy` config object maps
  `mode → { showSuggestions, showComments, editable }`; the shipped default is the GDocs-parity
  mapping above. A deployment can retune it (e.g. always-show suggestions, or decouple comment
  visibility from mode).
- **Accept/reject**: any editor may accept/reject **any** author's suggestion (authors may withdraw
  their own), surfaced **both inline** on the hovered/selected change **and** on the companion card.
  Routes to the existing `AcceptChange`/`RejectChange` ops (decision 4). Authority is open now,
  hardens under ACLs later.

#### Architecture

- **Mode state.** Extend `SpaceCapabilities.VersioningState` with per-doc
  `mode: 'editing' | 'suggesting' | 'viewing'`; `useVersioning` exposes `mode`/`setMode`. A toolbar
  control sets it (sits with the advanced version affordances).
- **`useSuggestionSources(doc)`.** Extract the active-`kind:'suggestion'`-branch enumeration +
  per-branch bind/probe/read that currently lives inside the plugin-comments `Suggestions`
  companion into a shared hook, so the editor overlay and the companion consume **one** enumeration
  and **one** set of bindings (no duplicate probes). Returns `ResolvedSuggestionBranch[]`, fed to the
  existing `buildSuggestionSources` → `suggestions({ sources })`.
- **`ReviewRenderPolicy`.** A capability (product config) with a GDocs-parity default export;
  MarkdownArticle reads it to gate overlay/comment visibility and editability by mode.
- **MarkdownArticle coexistence rule.** When `selection.kind === 'current'` (no explicit version
  selected) → the **ambient path**: editor bound to main (Editing/Viewing) or the user's suggestion
  branch (Suggesting), with the multi-source overlay + comment layer gated by the policy. Any
  explicit `selection` (branch / checkpoint / fork) → **today's advanced path, unchanged.** The
  ambient overlay _is_ the default `current` experience; the branch switcher, Base/Diff/Branch
  selector, and `VersionBanner` remain the advanced surface.
- **Reuse.** No new diff/merge/overlay primitives — Phase 3's `suggestions({ sources })`, Phase 1's
  ops, and the Phase 4 cards are the building blocks; this layer is composition + the mode control.

#### Implementation risk (spike first)

**Suggesting mode** needs the editor bound to the user's own suggestion branch (so typing accrues)
**while** rendering the user's edits as tracked changes vs main **and** overlaying other authors'
suggestions on the same buffer. Composing live editing + self-diff overlay + foreign-source overlays
on one CodeMirror buffer is the one genuinely hard part; spike it before committing the rest of the
plan (options: self-source injection into `suggestions({ sources })` vs a dedicated own-changes
compartment).

#### Testing

- **Unit**: `ReviewRenderPolicy` default mapping (mode → visibility/editable); `useSuggestionSources`
  (N authors, binding disposal, dedup); `VersioningState.mode` set/persist round-trip.
- **Storybook play** (extend `DocumentVersioning` / `CommentsArticle` — the primary integration
  coverage, since the full-stack `CommentsArticle` boot times out in-pane): Editing overlays all
  suggestions + comments; Viewing hides suggestions but keeps comments; Suggesting routes typing to
  the user's branch and renders it as a tracked change; inline accept removes a change and updates
  main; multi-author colours.
- **Focused ui-editor test** for the Suggesting-mode composition (the risk above).

#### Scope

One cohesive plan — mode toggle + render policy + ambient default overlay — layered on the untouched
advanced path, with the Suggesting-mode composition as a spike-first sub-milestone.

#### Status (2026-07-21)

**Milestone A landed** (per-doc `mode`, `ReviewRenderPolicy`, ambient Editing/Viewing overlay + review):
`VersioningState.mode` + `useVersioning` mode/setMode; `SpaceCapabilities.ReviewRenderPolicy`
(GDocs-parity default); `SuggestionSources` headless enumerator (render-prop, synchronous on doc
swap) + `MarkdownCapabilities.SuggestionSourcesProvider` slot (contributed by plugin-comments,
consumed by markdown — no dependency cycle); `suggestionsOverlay` compartment factory in
`@dxos/ui-editor`; MarkdownArticle ambient wiring (Editing overlays all suggestions + comments;
Viewing hides suggestions, read-only, comments retained). Comment visibility is policy-threaded
(`showComments`, default true — not yet consumed to hide comments; tracked). Build/lint/unit +
`AmbientReview` and `DocumentVersioning` play tests green.

**Milestone B (Suggesting-mode authoring) landed** — bind-to-branch (A1), chosen via a two-approach
B0 spike and ratified by felt-eval:

- `trackChanges({ main, colour })` (`@dxos/ui-editor`) renders the branch-vs-main self-diff on the live
  buffer — **character-level** (`computeCharHunks`) insertions as marks, deletions as phantom
  strikethrough widgets, with an atomic-caret Backspace guard.
- `suggestions({ base })` + `rebaseHunks` decouple a foreign author's diff base from the editor doc, so
  every author's suggestion renders against **main** even over a diverged branch; accept/reject live in
  a non-clipped `hoverTooltip` popover.
- `MarkdownArticle` Suggesting mode binds the editor to the current user's own `kind:'suggestion'`
  branch (find-or-create), self via `trackChanges`, others via the rebased overlay (self excluded);
  the mount is guarded so edits never touch main. Suggesting toolbar option enabled.

**Deferred (own PRs):** author-side accept/reject/un-delete of one's own inline draft (B4); perf —
incremental diff + hoist `computeCharHunks` (B6); multi-line/block deletions + copy semantics (B6);
full-stack `CommentsArticle` composition test (in-pane boot timeout); `showComments` consumption.

## Risks / notes

- Anchors depend on parent history retention; automerge retains full history today, but
  phase-2 fragment compaction must preserve checkpointed heads (`FragmentMeta.checkpoints`
  suggests this is already a first-class concept).
- `Text` objects >300k chars degrade to `RawString` (no CRDT); versioning follows the
  same limit.
- Restore/merge are plain edits, so they interleave safely with concurrent collaborator
  edits under normal CRDT semantics.

## Status

Current risk in the product/UI layer (plugin-markdown, plugin-space, plugin-comments, ui-editor).
Echo-core-layer risk is tracked separately in
[`@dxos/echo-client` VERSIONING.md § Status](../../core/echo/echo-client/docs/VERSIONING.md#status).

- **Shared `Timeline` component change.** The `currentBranch`-effect guard (keep the highlight on an
  explicitly selected commit) also affects plugin-assistant's `TracePanel`. Reasoned safe — it only
  skips a redundant jump — and the Timeline's own stories pass, but `TracePanel` was not re-verified
  end to end.
- **Nested branch-of-branch is guarded, not solved.** "New branch" is disabled on a branch / branch
  revision and the checkpoint banner's "Branch from" is hidden for branch revisions, so a fork can
  never silently derive from main; true sub-branching is unavailable (see the ECHO-core
  [nested-branches design](../../core/echo/echo-client/docs/VERSIONING.md#nested-branches-planned)).
- **Merged-branch revision viewing** reads read-only against the root document after merge, relying
  on the echo-core head-reachability guarantee; the UI never binds the deleted branch.
- **Memoized LLM fixtures** regenerated for this change (assistant-toolkit, assistant-e2e,
  crm-mailbox) are brittle and a plausible CI-failure source.
- **Verification.** Only affected-package build/lint/tests were run locally; the full CI "Check" was
  still pending at authoring time.
- **`Branch` record type** does not yet enforce the core/legacy invariant (exactly one of
  `key`/`content`); only the runtime `Branch.isCore` guard distinguishes them, pending the stage-4
  legacy drain.
