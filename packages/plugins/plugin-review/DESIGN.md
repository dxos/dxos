# Document Review — Specification

Status: DRAFT for sign-off, 2026-07-25. Supersedes the previous DESIGN.md (see git history), which
accumulated three weeks of phase notes and no longer described one coherent system. This document is
the contract: every invariant here either has an enforcing test (linked) or is marked OPEN.

Three layers, specified separately because they fail separately:

1. **Feature set** — what the user gets.
2. **Infrastructure** — the headless data model and its invariants.
3. **Editor** — how CodeMirror renders and captures it.

---

## 1. Feature set

Google-Docs-parity review, plus private draft branches (which Google does not have).

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
- **Accept** folds one change into main (partial cherry-pick, not a whole-branch merge). **Reject**
  reverts that change on the author's branch. Both are durable operations with undo. When the last
  change is resolved, the branch archives itself.
- Accept/Reject are available from: the inline hover popover, and the companion card. Both surfaces
  and the document share one "current change" selection (click either side to reveal the other).

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
- OPEN: suggesting _against a draft branch_ (a suggestion whose parent is a draft, not main) is out of
  scope for this iteration; the model permits it later (a suggestion branch is just a branch whose
  parent is any Text).

### 1.5 History

- Checkpoints (named, on main or a branch), time travel (read-only snapshots), fork points always
  addressable in the timeline. The timeline is the git-graph companion.
- OPEN: author-coloured lanes (S1.8) — requires a colour input on `Timeline`; not designed here.

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

Each invariant names its enforcing test. **An invariant without a test is a bug report waiting to
happen — G4 existed because I-2 was never written down.**

- **I-1 One branch per author.** `Branch.suggestion(doc, parent, creator)` is find-or-create keyed by
  creator. — `branch.test.ts`
- **I-2 An own suggestion branch is always `main + that author's suggestions`.** Main's progress never
  reads as the author's deletions. Enforced on every Suggesting entry: unedited stale branch ⇒ retire
  and re-fork at current heads; edited stale branch ⇒ `syncBranch` (main folded in) and the anchor
  advances. — `useVersionedEditor.test.tsx` (F1.2, G4)
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
  `applyViewModeSelection`; a contradictory pair (stale readonly into Suggesting — F1.7) is
  unrepresentable. — `review-lifecycle.test.ts` (5-row table)

### 2.4 State placement

| State                                      | Where                               | Why                                       |
| ------------------------------------------ | ----------------------------------- | ----------------------------------------- |
| Suggestion branches, history, checkpoints  | ECHO (replicated)                   | Shared substance.                         |
| Posture, version selection, current change | ViewState aspect (memory, per user) | Session UI state.                         |
| Editor view mode                           | Deck/surface state                  | Pre-existing owner; written only via I-9. |

---

## 3. Editor (CodeMirror)

### 3.1 The problem with the current architecture (honest statement)

Today, entering Suggesting **rebinds the editor to a different document** (the own branch):
`editorKey` changes, CodeMirror tears down and remounts. This is the single cause of the surviving
interactive defects — flicker on switch (G1), comment-layer geometry shifts (G3), caret jumping into
widgets (G5), caret/selection lost across switches (G6), and plausibly the spurious mode toggle (G2).
No state hygiene fixes a teardown. §3.3 is the target that removes it; §3.2 is what holds until then.

### 3.2 Current (shipping) architecture

- One permanently mounted change-bar gutter (contributors reconfigure markers inside it).
- Overlays (foreign suggestions, compare) live in compartments, reconfigured live, never remounted.
- Binding decisions flow through I-8/I-9. Remount happens exactly when the bound document changes:
  entering/leaving Suggesting, selecting a branch/checkpoint.

### 3.3 Target: the capture layer (design, not yet built)

**The editor never leaves main.** One document, one mount, for every ambient posture.

- **Suggesting becomes an input-routing mode**: a CodeMirror transaction filter intercepts the user's
  document-changing transactions, applies them to the **branch binding** (automerge, off-editor), and
  cancels them locally; the suggestions overlay (which already renders every author's branch diff,
  including self as tracked changes) immediately shows the change. The editor document itself is only
  ever changed by main's sync extension and by Accept.
- Mode switches then change _only_ decorations and the filter's enablement — no teardown, which
  retires G1/G3/G5/G6 by construction, and caret/selection survive trivially (G6) because the view
  is never rebuilt.
- **Design obligations before building** (each becomes a test):
  - _Latency & echo_: a routed keystroke must render its overlay update in the same frame batch, or
    typing feels dead. Measure with the existing play harness; budget one frame.
  - _Selection mapping_: the caret sits in main-coordinates; insertions by the overlay at the caret
    must map it forward (CodeMirror `ChangeDesc.mapPos` over the synthesized overlay changes).
  - _IME/composition_: composition sessions must not be intercepted mid-flight (filter defers until
    `compositionend`; CodeMirror exposes `view.composing`).
  - _Undo_: undo in Suggesting undoes the _branch_ change (route `undo` through the binding), not a
    main transaction.
  - _Deletion UX_: deleting over foreign struck text must skip phantoms (map through the overlay's
    range set).
- Advanced paths (draft branch selected, checkpoints) keep the rebind — they genuinely show a
  different document, and a remount there is correct and expected.

### 3.4 The mode dropdown

One control, one event (I-9). Built-ins: Markdown (preview, editing posture), Plain text (source,
editing), Read only (readonly, viewing). Contributed: Suggesting (suggesting posture, keeps an
editable view mode, stepping off readonly). The article does no mode arithmetic.

### 3.5 Verification policy (the lesson of 2026-07-25)

Unit tables and hook harnesses verify the _model_; they proved unable to catch remount-class defects.
Therefore:

- Every interactive defect gets a **failing test at the real-editor layer first** — a storybook play
  driving the actual CodeMirror view (dispatching through `EditorView`, not synthetic DOM events),
  asserting caret position, focus, decoration counts and document content across the exact reported
  sequence.
- The `!test` CI exclusions on the interactive stories are debt, not policy: each excluded play must
  either be made CI-stable or replaced by one that is. A feature whose only coverage is manual is
  treated as uncovered.
- The F1–F6 walkthrough is run by the agent (headless, same numbered steps) before it is ever handed
  to a human.

---

## 4. Open decisions (blocking sign-off)

1. **Adopt §3.3 (capture layer)?** It is the only path that closes G1/G3/G5/G6 rather than sanding
   them. Estimated as a multi-day change with the §3.3 obligations as its test plan. The alternative
   is accepting remount UX on mode switches permanently.
2. **Suggest-against-draft (§1.4)** — defer or include in the §3.3 work (the capture layer makes it
   nearly free: route to a branch whose parent is the draft).
3. **Timeline author colours (S1.8)** — separate `Timeline` API work; prioritize or drop.
