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
  without extra machinery.
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
4. **Diff view** — all three variants, selected by a new plugin setting
   `diffView: 'inline' | 'sideBySide' | 'gutter'` (default `inline`):
   - `inline` — unified suggestion-style decorations (green insert, red strikethrough
     delete) over the branch text.
   - `sideBySide` — `@codemirror/merge` MergeView (new catalog dependency).
   - `gutter` — colored change bars with popovers showing base text.
     All variants consume the shared diff-span format. The same view doubles as the
     merge-review step (banner with Merge action).

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

## Phase 2: upstreaming

See [`agents/superpowers/plans/2026-07-17-branching-convergence.md`](../../../agents/superpowers/plans/2026-07-17-branching-convergence.md)
for the staged convergence with PR #11829's ECHO-core branching (true CRDT forks).

Not built now; the phase-1 shapes are chosen to make this a lift, not a migration:

- DONE: `Version`/`Branch` and the model now live in `@dxos/versioning`. Remaining: generalize
  record refs over `Ref(Obj.Any)` targets so non-Text objects (sketches, sheets) can be versioned.
- True CRDT forks: core ECHO API to fork a leaf doc with shared history (object-id
  rewrite or fragment surgery) enabling `A.merge`-quality merge-back; replaces the
  textual 3-way merge behind the same `mergeBranch` signature.
- Alignment with subduction fragments (`FragmentMeta.checkpoints`) for history
  compaction; branch-level access control (draft visible only to its author).
- Generic history companion usable by any plugin.

## Risks / notes

- Anchors depend on parent history retention; automerge retains full history today, but
  phase-2 fragment compaction must preserve checkpointed heads (`FragmentMeta.checkpoints`
  suggests this is already a first-class concept).
- `Text` objects >300k chars degrade to `RawString` (no CRDT); versioning follows the
  same limit.
- Restore/merge are plain edits, so they interleave safely with concurrent collaborator
  edits under normal CRDT semantics.
