# Document Review — Specification

Status: APPROVED (capture-layer architecture adopted; see §4). This document is the contract: every
invariant either names its enforcing test or is marked OPEN.

Three layers, specified separately because they fail separately:

1. **Specification** — feature set.
2. **Infrastructure** — the headless data model and its invariants.
3. **Editor** — how CodeMirror renders and captures it.

---

## 1. Specification

Google-Docs-parity review (comments + suggestions) plus private draft branches.

### 1.1 Postures (per user, per document)

The default document view is **main** with everyone's suggestions and comments overlaid ("ambient
review"). Each user has one posture at a time:

| Posture               | Bound to              | Typing goes to | Sees suggestions                               | Sees comments | Editable |
| --------------------- | --------------------- | -------------- | ---------------------------------------------- | ------------- | -------- |
| **Editing** (default) | main                  | main           | yes (everyone's)                               | yes           | yes      |
| **Suggesting**        | own suggestion branch | own branch     | yes (everyone's, incl. own as tracked changes) | yes           | yes      |
| **Viewing**           | main                  | —              | no                                             | yes           | no       |

- One dropdown controls posture and editor view mode as a single gesture (§3.4).
- Posture is per-user, per-document, session-local (never replicated).

### 1.2 Suggestions

- **One suggestion branch per author per document**, created on first entry into Suggesting,
  reused thereafter (never a branch per edit).
- A suggestion renders to _other_ users (and to the author outside Suggesting) as: proposed text in
  the author's colour, replaced text struck through, a change-bar in the shared gutter, and a card in
  the review companion.
- **Accept** folds one change into main (partial cherry-pick, not a whole-branch merge).
  **Reject** reverts that change on the author's branch. Both are durable operations with undo.
  When the last change is resolved, the branch archives itself.
- Accept/Reject are available from: the inline hover popover, and the companion card. Both surfaces
  and the document share one "current change" selection (click either side to reveal the other).
- **Per-author visibility**: the user can toggle each author's suggestions on/off (e.g. from the
  companion's author list). Hiding an author removes their overlay decorations, change bars and cards
  for this user only; it never touches the branches themselves. Session-local, per document.

### 1.3 Comments

- Anchored threads on main; visible in every posture; never allowed on suggestion branches (review of
  a suggestion happens on its card).
- Clicking a highlight activates its thread and vice versa. Comment and suggestion click-targets must
  not swallow each other.

### 1.4 Private draft branches (beyond Google)

- Any user may fork a named **draft branch** from any point (current tip or a checkpoint), work on it
  privately, and later merge it back (whole-branch CRDT merge) or discard it.
- Drafts have the full timeline: checkpoints on the branch, fork-point addressability, compare views
  (base / diff / branch), and conflict resolution on merge.
- While a draft is selected the ambient overlay is off — the advanced path shows exactly the branch
  (or its diff), and comments scope to the branch under review.
- Suggesting _against a draft branch_ (a suggestion whose parent is a draft, not main) is in scope
  (Decision 2): a suggestion branch is a branch whose parent is any Text; the capture layer routes to it.

### 1.5 History

- Checkpoints (named, on main or a branch), time travel (read-only snapshots), fork points always
  addressable in the timeline. The timeline is the git-graph companion.
- Author-coloured lanes: planned (Decision 3) — `Timeline` gains a per-branch colour input.

---

## 2. Infrastructure

Built on ECHO core branching: a branch is the same automerge object at diverged heads, sharing fork
ancestry, so merges in either direction are CRDT-well-defined.

### 2.1 Primitives (echo-client; all tested in `branching.test.ts`)

| Primitive           | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| `createBranch`      | Fork the subtree at given heads.                         |
| `bindBranch`        | Caller-owned live binding to one branch of one object.   |
| `mergeBranch`       | Fold branch → main, switch to main, optionally delete.   |
| `syncBranch`        | Fold main → branch, stay put. The reverse merge.         |
| `getObjectOnBranch` | Read a branch's current decoded state without switching. |

### 2.2 The versioning model (`@dxos/versioning`) and its invariants

Each invariant names its enforcing test. An invariant without a test is not an invariant.

- **I-1 One branch per author.** `Branch.suggestion(doc, parent, creator)` is find-or-create keyed by
  creator. — `branch.test.ts`
- **I-2 An own suggestion branch is always `main + that author's suggestions`.** Main's progress never
  reads as the author's deletions. Enforced on every Suggesting entry: unedited stale branch ⇒ retire
  and re-fork at current heads; edited stale branch ⇒ `syncBranch` (main folded in) and the anchor
  advances. — `useVersionedEditor.test.tsx`
- **I-3 A suggestion's rendered diff is computed against its author's anchor** (the revision they
  wrote on), then rebased into the viewing document's coordinates — never diffed raw against a moving
  document. — `suggest.test.ts` (per-source base), `diff.test.ts` (rebase)
- **I-4 A change already present in the document is not a suggestion.** Accepting removes it from
  every surface (overlay and cards), matched by content since offsets shift. — `suggest.test.ts`,
  verified in-story
- **I-5 Accept/Reject act on one hunk**, are anchored by cursor (survives edits), splice at the
  current diff (not a snapshot), and return an undo splice. Pure insertions are acceptable
  (containment fallback in hunk matching). — `diff.test.ts`, `accept-change.test.ts`
- **I-6 Empty branches archive themselves**; the timeline never accumulates spent suggestion
  branches. — `branch.test.ts`
- **I-7 Snapshots are detached.** Checkpoint/fork/base views render historical content read-only from
  `contentAt`, never by binding the live doc to old heads. — `model.test.ts`, lifecycle table

### 2.3 Review lifecycle (plugin-review)

- **I-8 The editor binding is a pure derivation** — `deriveBinding(inputs)`: posture, selection and
  async-resolution flags in; subject, key, editability, loading out. Stateless, so sequences cannot
  leak history. — `review-lifecycle.test.ts` (13-row table)
- **I-9 One dropdown gesture writes the whole (posture, view-mode) pair** via
  `applyViewModeSelection`; a contradictory pair (a stale readonly view mode surviving into
  Suggesting) is unrepresentable. — `review-lifecycle.test.ts` (5-row table)

### 2.4 State placement

| State                                      | Where                               | Why                                       |
| ------------------------------------------ | ----------------------------------- | ----------------------------------------- |
| Suggestion branches, history, checkpoints  | ECHO (replicated)                   | Shared substance.                         |
| Posture, version selection, current change | ViewState aspect (memory, per user) | Session UI state.                         |
| Hidden suggestion authors                  | ViewState aspect (memory, per user) | A view filter, never data.                |
| Editor view mode                           | Deck/surface state                  | Pre-existing owner; written only via I-9. |

---

## 3. Editor (CodeMirror)

### 3.1 The structural constraint

Entering Suggesting **rebinds the editor to a different document** (the own branch): the editor key
changes and CodeMirror tears down and remounts. A remount inherently loses caret, selection and
focus, flashes decorations, and recomputes overlay geometry — so any mode switch that crosses a
rebind can only approximate continuity. §3.3 is the target architecture that removes the rebind from
the ambient path; §3.2 is what holds until then.

### 3.2 Current (shipping) architecture

- One permanently mounted change-bar gutter (contributors reconfigure markers inside it).
- Overlays (foreign suggestions, compare) live in compartments, reconfigured live, never remounted.
- The suggestion overlay and the companion filter their sources by the hidden-authors set before
  rendering; hiding is a source filter, not a decoration hack, so counts, cards and gutter bars stay
  consistent.
- Binding decisions flow through I-8/I-9. Remount happens exactly when the bound document changes:
  entering/leaving Suggesting, selecting a branch/checkpoint.

### 3.3 Target: same-view branch swap (design, not yet built)

**One `EditorView`, forever, on the ambient path.** The invariant is that ambient mode switches never
tear down the view — continuity of caret, selection, focus, scroll and overlay geometry follows from
that single fact.

- The editor's sync source (the automerge binding backing the document) lives in a **compartment**.
  Entering Suggesting reconfigures it to the user's own-branch binding and applies the content delta
  between the two documents as one ordinary transaction (a splice, with the caret and selection
  mapped through it). Leaving Suggesting reverses it. No React remount, no CodeMirror teardown.
- The editor document in Suggesting **is the branch**, so typing, deletion, IME composition, undo and
  selection behave natively — no input interception layer exists.
- Others' suggestions rebase into the current document exactly as in every posture (I-2/I-3 keep the
  branch equal to `main + own suggestions`, so the delta applied on entry is precisely the user's own
  pending suggestions). The user's own pending edits render as tracked changes against main.
- While the own-branch binding is still resolving on first entry, the editor stays on main read-only
  (never editable against the wrong document); the swap applies when the binding is ready.
- **Design obligations** (each becomes a test):
  - _Same view instance_ across every ambient mode switch (the DOM node and CodeMirror view persist).
  - _Splice mapping_: caret/selection/scroll map correctly through the entry/exit delta.
  - _No cross-writes_: edits made in Suggesting land only on the branch; edits in Editing only on
    main — including around the moment of the swap.
- Advanced paths (draft branch selected, checkpoints) keep the remount — they genuinely show a
  different document and continuity is not expected.

### 3.4 The mode dropdown

One control, one event (I-9). Built-ins: Markdown (preview, editing posture), Plain text (source,
editing), Read only (readonly, viewing). Contributed: Suggesting (suggesting posture, keeps an
editable view mode, stepping off readonly). The article does no mode arithmetic.

### 3.5 Verification policy

Unit tables and hook harnesses verify the _model_; they cannot catch remount-class defects.
Therefore:

- Every interactive defect gets a **failing test at the real-editor layer first** — a storybook play
  driving the actual CodeMirror view (dispatching through `EditorView`, not synthetic DOM events),
  asserting caret position, focus, decoration counts and document content across the exact reported
  sequence.
- The `!test` CI exclusions on the interactive stories are debt, not policy: each excluded play must
  either be made CI-stable or replaced by one that is. A feature whose only coverage is manual is
  treated as uncovered.
- The walkthrough scripts live in [TEST-PLAN.md](./TEST-PLAN.md) (F1–F6); the agent runs them
  headlessly before they are ever handed to a human.

---

## 4. Decisions

1. **Capture layer (§3.3): ADOPTED.** The remount class of defects is removed structurally, not
   sanded. The §3.3 obligations are the test plan; ambient mode switches must not tear down the view.
2. **Suggest-against-draft (§1.4): IN SCOPE**, delivered with the capture-layer work (routing to a
   branch whose parent is the draft).
3. **Timeline author colours (§1.5): PLANNED** — `Timeline` gains a per-branch colour input; the
   review timeline passes author hues.

---

## 5. Known risks

Standing engineering concerns — each names its containment and, where one exists, the structural fix.

1. **Heuristic accumulation in the diff pipeline.** The rendering path (word diff → applied-change
   filter → delimiter pairing → grouping → rebase → decorations) carries several targeted rules:
   hunk minimization, markdown delimiter pairing, edge-anchored rebase mapping, widget newline
   splitting, block-vs-gutter change bars. Each is unit-tested; the risk is their interaction over
   the full input space (many authors' overlapping edits × live main edits). Containment: the shared
   scenarios (TEST-PLAN.md, "Shared scenarios") grow adversarially with every reported defect.
   Direction: invariant/property tests over the pipeline (e.g. applying every hunk reconstructs the
   proposal; no hunk strikes text common to both sides) to cover the space between examples.
2. **The attach-reconcile is a patch on a racy handoff.** Swapping the automerge source through the
   compartment leaves a window where the view's content is not the bound document's; the microtask
   reconcile shrinks the window to near-zero but does not remove it. Structural fix (§3.3 endgame):
   perform the swap as ONE CodeMirror transaction — reconfigure and content replace computed
   together — so no gap can exist.
3. **Whitespace residue keeps branches alive.** Bare paragraph-break hunks are hidden from cards and
   unmarked in the overlay, so accepting every visible change can leave a whitespace-only diff on
   the suggestion branch — which then never satisfies I-6's auto-archive. Direction: fold
   whitespace-only hunks into the acceptance of their adjacent content hunk, or treat a
   whitespace-only branch diff as empty for archiving.
4. **Automated plays type by dispatch, not by key.** The CI storybook runner cannot produce real
   keystrokes/IME, so defects in the DOM input path (composition, focus, frame scheduling) are
   invisible to every automated tier and surface only under a real browser. Direction: a small
   Playwright smoke test driving genuine typing against the storybook.
5. **Focus restore polls.** After a view-mode selection the editor reclaims focus by bounded retry
   (the menu returns focus to its trigger asynchronously after close). Cleaner fix: a menu-level
   `onCloseAutoFocus` opt-out in the shared menu component, at the cost of touching menu machinery
   shared by every dropdown.
