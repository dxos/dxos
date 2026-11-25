# Nested branch-of-branch — design & estimate

Follow-up to the branching convergence (PR #12246). Today a branch can only fork
from **main** (or a main revision). Forking a sub-branch off another branch is
blocked in the UI because the core would silently derive it from main. This spec
covers making true nesting work.

## Problem

The core branch registry is **flat**:

```ts
// packages/core/echo/echo-protocol/src/document-structure.ts
type SpaceBranchRegistry = { [rootObjectId: string]: { [branchName: string]: BranchRecord } };
type BranchRecord = { members: { [objectId: string]: url }; baseHeads?: string[]; createdAt?: number };
```

Two operations hardwire **main** as the source/target:

- `EntityManager.createBranch` forks each member from its **current core doc**
  (main when the device is on main) — `forkDump(member.getDoc(), fromHeads)`.
- `EntityManager.mergeBranch` always merges into `_mainDocHandle(memberId)`.

So there is no notion of a branch whose parent is another branch, and a fork at a
sub-branch's frontier would either derive from main (wrong content) or throw
"fork frontier not reachable" (the sub-branch's changes aren't in main).

Everything else is already nesting-agnostic and reusable:

- `switchBranch`, `bindCoreToBranch`, `listBranches`, `_findBranchRootFor`
  resolve a branch by `(rootObjectId, name)` directly — a nested branch is just
  another named branch under the same root namespace.
- Replication (`getAllBranchDocUrls`), import remap (`DatabaseRoot.mapLinks`),
  and `BranchStore` persistence iterate all records regardless of parentage.

## Model choice

**Chosen: parent pointer (a branch tree in one flat namespace).** Add an optional
`parent` (parent branch name; absent = main) to `BranchRecord`. Branches stay
keyed by `(rootObjectId, name)`; the `parent` field forms a tree. Fork source and
merge target resolve through `parent`.

Rejected alternatives:

- **Nested registry** (`branches[root][parent][name]`) — invasive to every
  registry read/write, replication, and import remap for no added expressiveness.
- **Separate root per branch** — breaks shared-ancestry CRDT merge (the whole
  point of core branches) and the single-registry replication model.

Why the parent pointer is safe for merges: a child shares the parent branch's
automerge ancestry, which shares main's. `A.merge` is order-independent for
shared-history CRDTs, so child→parent→main and any interleaving converge.

## Changes

### 1. Protocol (`echo-protocol/document-structure.ts`) — trivial

- `BranchRecord.parent?: string` — parent branch name; absent = main.
- Doc comment: `baseHeads` becomes "heads of the parent branch's root doc at
  fork time" (was "main doc").
- No migration: existing records omit `parent` ⇒ read as main.

### 2. `EntityManager` (`core-db/entity-manager.ts`) — the core work

- `createBranch(rootObjectId, name, { fromHeads?, parent? })`:
  - When `parent` set, resolve each member's **source doc from the parent branch**
    (`registry[parent].members[memberId]`), not the member's current core doc, and
    `forkDump(parentBranchDoc, fromHeads)`.
  - `baseHeads` = parent branch root-doc heads at fork; store `parent` on the record.
  - Validate: parent exists; `name !== parent`; membership matches the parent's.
- `mergeBranch(rootObjectId, name, opts)`:
  - Merge target = parent branch's member docs when `record.parent` set, else main.
    New helper `_branchOrMainDocHandle(memberId, parentName?)`. Merge
    `A.merge(targetDoc, branchDoc)`.
  - After merge, switch the device back to the **parent branch** (not always main).
  - v1: **block** merge/delete of a branch that has live children ("merge children
    first"). Re-parenting children to the grandparent is a clean stretch (ancestry
    still holds) but adds cases; defer.
- `deleteBranch`: orphaned members fall back to `record.parent ?? 'main'` (today
  always 'main').
- `switchBranch` / `bindCoreToBranch` / `listBranches`: **unchanged**.

### 3. `@dxos/versioning` (`internal/model.ts`, `internal/types.ts`) — small

- `Branch.parentBranch?: string` — parent branch **key** (the `Branch.parent` Ref
  can't distinguish, since all core branches share the root Text's object id).
- `Branch.create({ parent, heads, parentBranch? })` threads `parent: parentBranchKey`
  to `db.createBranch`.
- `Branch.merge`: core `db.mergeBranch` now targets the parent branch automatically;
  the `merge: <label>` auto-checkpoint must record the **parent branch's** heads
  (bind the parent branch) rather than the root's when `parentBranch` is set.
- `Branch.bind`, `Version.*`: unchanged (bind by key; heads live in the branch doc).

### 4. Plugin (`plugin-space`, `plugin-markdown`) — moderate; timeline is the crux

- `ObjectHistory.handleCreate` (branch case): **remove the guard**; when on a
  branch (`activeBranch`) or a branch revision (`activeVersion.branch`), pass
  `parentBranch` (that branch's key) + `heads`; a main revision keeps `parentBranch`
  undefined. Re-enable the "New branch" button (drop the `disabled` added in
  95a3a1a34d).
- `MarkdownArticle.handleBranchFrom`: allow branch-from on a branch revision,
  threading `parentBranch`; restore the banner's "Branch from" for branch revisions.
- `useVersioning`: `branchBaseContent` (compare/merge base) must resolve against the
  **parent branch** at the anchor, not the root Text, for a nested branch.
- **`timeline.ts` (model)** — the trickiest piece:
  - Lane a nested branch's fork node under its **parent branch's** lane (via
    `parentBranch`), ordered after the parent-branch commit at the anchor (not main).
  - A nested `merge:` commit joins the child tip and the **parent branch's** last
    commit (two parents), not main.
  - `emitBranch` currently derives the parent lane from `branch.parent.target?.id`
    (always root/main or a legacy Text); switch to `parentBranch` when set.
- **`Timeline.tsx` (component)**: the lane allocator and parent-based connectors
  already handle N lanes and arbitrary `parents`, so depth-2 should render from a
  correct model. The `// Assumes can only branch to the right` connector path is a
  known visual-polish risk at depth ≥2 — budget a little for it.

### 5. Tests & stories

- `branching.test.ts` (echo-client): nested create / merge-into-parent / switch /
  delete-with-children-blocked / two-peer replication of a nested branch. ~6–8.
- `model.test.ts` (versioning): nested create + merge folds child→parent, then
  parent→main. ~3–4.
- `timeline.test.ts` (plugin-markdown): nested fork lanes under parent; nested merge
  parents. ~2–3.
- Storybook: a `SubBranch` story — fork off a branch, edit, merge child→parent→main,
  through the real UI. 1–2.

## Migration / compatibility

None required. `parent` is additive and optional; absent = main (current behaviour).
Replication, import remap, and persistence already iterate all records.

## Risks

1. **Timeline rendering at depth ≥2** — connector "branch to the right" assumption.
   Low-moderate; model correctness first, polish the SVG if needed.
2. **Delete/merge of a parent with live children** — v1 blocks it; re-parent is a
   deferred stretch.
3. **Frontier reachability** — a nested fork's `fromHeads` must exist in the parent
   branch doc; guaranteed when forking from the parent's tip or a revision taken on
   it. `forkDump` already throws on an unreachable frontier (good failure mode).

## Estimate

Contained because the switch/bind/registry/replication infra is reused; the net-new
is fork-source + merge-target resolution plus one protocol field, then plumbing.

| Area                                                                 | Effort                   | Notes                                                     |
| -------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------- |
| Protocol field                                                       | ~0.25d                   | One optional field + docs.                                |
| EntityManager (fork src, merge target, delete fallback) + core tests | 1.5–2d                   | Medium; well-contained.                                   |
| `@dxos/versioning` (parentBranch plumbing, merge checkpoint) + tests | ~1d                      | Small.                                                    |
| Plugin (un-guard, handleCreate/handleBranchFrom, useVersioning base) | ~1d                      | Mechanical once model lands.                              |
| Timeline model + tests (+ possible SVG polish)                       | 1–1.5d                   | Highest-risk UI piece.                                    |
| Storybook + review buffer                                            | 0.5–1d                   |                                                           |
| **Total**                                                            | **~5–6.5 engineer-days** | Ship as a 3-part PR: core → versioning → plugin/timeline. |

Sequencing: land core (1–2) behind the existing UI guard, then versioning (3),
then remove the guard in the plugin PR (4–5) so `main` never exposes a half-wired
sub-branch.
