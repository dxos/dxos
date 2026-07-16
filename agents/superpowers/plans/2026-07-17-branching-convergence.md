# Branching Convergence Plan — PR #11829 × PR #12237

Two overlapping implementations of document branching exist. This plan reconciles them.

- **[#11829](https://github.com/dxos/dxos/pull/11829)** (wittjosiah, 2026-06-15, draft): ECHO-core
  per-object branching. Status: open, unreviewed, **conflicting with main**, ~17% patch coverage.
- **[#12237](https://github.com/dxos/dxos/pull/12237)** (this branch): app-level revisions &
  branches for markdown. Status: green (pending e2e fixtures), reviewed, tested.

## Model comparison

| Dimension         | #11829 (core)                                                                                                                      | #12237 (app-level)                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fork              | `A.save`/change-replay → `repo.import`; **shared history, same object ids**                                                        | New `Text` seeded with content string (fresh history)                                      |
| Merge             | `A.merge` — automatic, character-level, anchors survive, no conflicts                                                              | Textual 3-way (`merge3`) with git-style markers + inline resolution UI                     |
| Branch registry   | Synced `branches` map on the **space root** (name → member doc urls)                                                               | `Branch` records in `document.history` (`@dxos/versioning`)                                |
| Selection         | **Device-local, per object** — `switchBranch` rebinds the live object for every surface on the device (localStorage `BranchStore`) | **Session-local, per document per user** — canonical object never switched                 |
| Scope             | Generic object subtrees (markdown + sheets shipped)                                                                                | Text-backed documents                                                                      |
| Time travel       | Proxy-level pinning (`setTimeTravel`): live object reads the past, writes throw                                                    | Static content snapshot swapped into the editor                                            |
| Named checkpoints | None (history scrubber over raw edit history)                                                                                      | `Version` records — named, zero-copy automerge heads                                       |
| Review workflow   | Branch-aware comments, per-hunk cherry-pick (`AcceptChange`), editable merge-view diff                                             | Timeline git-graph, three diffView variants, conflict-marker resolution buttons            |
| Agent surface     | None; `getObjectOnBranch` is read-only — a device-global switch means agents write whatever branch the device selected             | Operations (`createBranch`/`mergeBranch`/`getHistory`); agents write branch Texts directly |

**Key insight:** #11829 solved the identity problem #12237's design deferred — the branch doc keeps
the _same_ object ids and lives outside the normal object index, in a space-root registry;
`switchBranch` swaps which doc backs the object. That makes true CRDT merge-back work. Its gaps are
the inverse of #12237's strengths: no named checkpoints, no timeline visualization, no agent
surface, no per-surface (non-global) branch selection, low test coverage, stale vs. main.

## Plan (staged; each stage shippable)

### Stage 0 — Land #12237 now

Ships user value with a self-contained model. Its records, Timeline UI, popover UX, agent
operations, and conflict-resolution editor survive the convergence as the product layer.
Coordinate stages 1–3 with @wittjosiah before touching core (it is their draft).

### Stage 1 — Revive #11829's core layers as a fresh PR

Extract commits 1–3 only, rebased on current main:

- Time travel (`setTimeTravel`/`clearTimeTravel`, dual `updates`/`displayUpdates` channels).
- Core branching (`core-db/branching.ts`, registry on space root, fork/switch/merge/delete).
- `BranchStore` persistence (device-local selection).
  Drop its UI/comments/sheets layers for stage 3. Required hardening before merge:
- Real test coverage (17% → suite comparable to `@dxos/versioning`'s model tests).
- **Writable per-surface branch access** (see decision (a)) — the agent-draft use case needs an
  agent to edit a branch while the user stays on main; `getObjectOnBranch` is read-only today.
- Inline-object promotion gap (`cannot branch an inline object`) — at minimum a clear error path.
- Replication/storage review: full `A.save` copy per member per branch; subduction policy
  interaction for branch docs.

### Stage 2 — Rewire `@dxos/versioning` onto the core API

- `Branch.create/merge/discard` delegate to `db.createBranch/mergeBranch/deleteBranch`; the
  `Branch` record becomes product metadata (name/label/status/creator/anchor) keyed by the core
  registry's branch name. Core registry owns doc urls; records own presentation.
- `Version` checkpoints stay as-is (core has no named-checkpoint concept; they complement the
  scrubber) and checkpoint viewing switches from snapshot-swap to `setTimeTravel` pinning.
- `merge3`/conflict markers retained only until stage 4 (new branches merge via CRDT and cannot
  produce marker conflicts; the marker editor remains useful for external/imported conflicts).

### Stage 3 — UI and review-workflow convergence

- One generic Branches/History companion: #12237's git-graph Timeline as the visualization inside
  #11829's generic `BranchesCompanion` slot (plugin-space), with per-type diff providers.
- Markdown diff `sideBySide` upgrades to #11829's **editable** merge overlay; sheets re-enabled.
- Adopt branch-aware comments + `AcceptChange` per-hunk cherry-pick as the review workflow.

### Stage 4 — Cleanup

Remove the textual fork path from `Branch.create`, migrate existing `history` records (content-copy
branches stay mergeable via `merge3` until archived), fold `HistoryScrubber` vs Timeline overlap,
update `DESIGN.md`.

## Decisions (resolved 2026-07-16 with @richburdon)

1. **(a) Branch selection scope: per-surface/session.** Each surface (plank, agent session) binds
   to its own branch independently; the canonical object is never globally switched. Stage 1 adds
   writable per-surface branch bindings to the core; device-global `switchBranch` remains a
   lower-level capability.
2. **(b) Source of truth: split registry + records.** The space-root registry owns the
   replication-critical facts (doc urls, membership); `@dxos/versioning` records own product
   metadata (label, status, creator, anchor heads) referencing registry branch ids.
3. **(c) Ownership: Claude drafts stage 1, @wittjosiah reviews.** Extract #11829 commits 1–3 onto
   a fresh branch (new session/worktree), add coverage + writable bindings, open a PR tagging
   @wittjosiah as reviewer/co-author.
4. **Sequencing: stage 1 starts after #12237 lands** (npm bootstrap of `@dxos/versioning` and the
   assistant-e2e fixtures are the only remaining blockers).
5. **Merge UX: keep both paths.** Instant CRDT merge by default, with an opt-in review mode
   (editable merge overlay + per-hunk `AcceptChange`) per document or per branch.
6. **Stage-3 UI scope: markdown only, in the generic slot.** Move the companion to plugin-space's
   generic slot with per-type providers; markdown ships first, sheets re-enable when their diff
   provider is ported.
