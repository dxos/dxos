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

### Phasing (implementation order)

1. `RejectChange` operation + `UndoMapping` inverses for accept/reject (durable, undoable) —
   extends today's single-branch flow with no new UI.
2. `Branch.kind` discriminator + lazy per-user suggestion-branch create / auto-archive-when-empty.
3. Multi-source **overlay compositor** (stack + re-diff, per-author colour) + `groupHunks` grouping
   — the core new UI primitive.
4. **Comment-style cards** reusing plugin-comments anchoring/threads; move the review layer (overlay
   wiring + cards + accept/reject) into plugin-comments; collapse `suggest` into it and drop it from
   `diffView`.
5. _(Later, separate track)_ branch-level ACL for private drafts.

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
