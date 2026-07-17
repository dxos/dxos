# Document Revisions & Branches — Tasks

Design: [`packages/plugins/plugin-markdown/DESIGN.md`](../../../packages/plugins/plugin-markdown/DESIGN.md).
Convergence plan (+ resolved decisions):
[`agents/superpowers/plans/2026-07-17-branching-convergence.md`](../../../agents/superpowers/plans/2026-07-17-branching-convergence.md).
PRs: [#12237](https://github.com/dxos/dxos/pull/12237) (landed 2026-07-16); stage 1 on branch
`claude/document-revisions-a2994d`.

## Done (phase 1 / stage 0, in PR #12237)

- [x] `@dxos/versioning` package (namespace layout: Version/Branch/History over internal/) —
      checkpoints (named heads), content-copy branches, textual 3-way merge, diff utils; 29 tests.
- [x] plugin-markdown surface: Timeline git-graph companion, editor banner + branch switcher,
      three diffView variants, merge-conflict editor extension (Accept branch/current/both),
      NamePopover UX (optional names → date-time labels), agent operations, storybook play tests.
- [x] ui-editor: only a single leading '>' decorates as blockquote.
- [x] All CodeRabbit review rounds addressed and resolved.

## Landing blockers (PR #12237)

- [x] `@dxos/versioning` first npm publish (0.10.0) + public flip — done (user).
- [x] Regenerate stale `assistant-e2e` memoized fixtures — done; pass on CI.
- [x] Fix `@dxos/versioning` exports map for the vite build output (CLI tests failed at runtime
      resolution) — done (05571b25a5). Awaiting green Check.

## Stage 1 (this branch) — revive #11829 core layers

Ported onto the post-#11796 architecture (EntityManager split; CoreDatabase is gone), core layers
only — the HistoryCompanion/plugin UI stays with stage 3.

- [x] Time travel (commit 1): ObjectCore pin + displayUpdates/LatestEventId dual channels,
      latestOnly subscriptions/atoms, Entity.isTimeTraveling/timeTravelAtom,
      setTimeTravel/clearTimeTravel, getEditHistoryWithDiffs. 7 tests.
- [x] Core branching (commit 2 + scrubbed-position fix): DatabaseDirectory.branches registry,
      host replication via getAllLinkedDocuments, EntityManager
      create/switch/merge/delete/list/current, EchoDatabase delegates, object-first API. 13 tests
      (incl. two-peer replication + guards: duplicate/unknown/inline-object errors).
- [x] BranchStore persistence (commit 3, core parts): hydrate on open, persist on switch,
      threaded EchoClient→DatabaseImpl→EntityManager; per-peer store in test harness. Reload test.
- [x] Writable per-surface `BranchBinding` API (new; plan decision (a)):
      `db.branch(obj, name)` — caller-owned ephemeral binding; reads/writes land on the branch
      doc only; coexisting bindings; 'main' returns live object. 7 tests.
- [x] Hardening: inline-object clear error path; storage/replication review documented on
      createBranch JSDoc (full A.save per member per branch; branch docs join the space document
      list via the registry so they replicate/export like linked docs).
- [ ] Open stage-1 PR tagging @wittjosiah (reviewer; original author of #11829 commits).

## Stage 2 (this branch) — rewire `@dxos/versioning` onto the core API

- [x] Core `Database.Database` interface gains the branching surface + `BranchBinding` (so
      `Obj.getDatabase` suffices for versioning; echo-client re-exports).
- [x] `Branch.create` forks a core branch (record.id = registry key; `key` field discriminates
      core vs legacy); `Branch.bind` returns a writable per-surface binding; `Branch.merge` is
      CRDT for core branches (registry entry removed) with the `merge3` marker fallback for
      legacy content-copy records (until stage 4); `discard` keeps the registry entry for
      recovery. `content` ref is now optional (legacy only).
- [x] Checkpoint viewing via `setTimeTravel` pinning (`Version.view`/`clearView`);
      `Version.restore` clears any active pin first (restore-while-pinned covered).
- [x] `forkDump` hardening: unreachable fork frontier throws instead of silently forking at tip.
- [x] plugin-markdown: `useVersioning` manages the branch binding + checkpoint pin; editor binds
      `activeText`; async create/merge handlers; timeline tolerates core records (per-branch diff
      stats deferred to stage 3); ConflictResolution story exercises the marker editor on seeded
      conflicts (core merges cannot produce markers).
- [x] Tests: versioning 31 (CRDT merge, same-line no-markers, legacy fallback, view/restore
      pinning), plugin-markdown 23 + 15 storybook play tests (Time Travel / Branch Merge /
      Conflict Resolution) green.

Deferred to stage 3: branch-scoped agent edits (CreateBranch op returns the canonical content
DXN; a generic update against it writes main), per-branch timeline diff stats, checkpoints of
branch state / branch-of-branch, deployed-app BranchStore backend.

Deferred from the CodeRabbit round (stage 3/4):

- `DatabaseRoot.mapLinks` import-time doc-id remapping does not rewrite `branches` registry urls;
  review index/reindex document enumeration for branch docs.
- Ref atom families: return `undefined` when the initially resolved target is already deleted
  (consistency change to the shared `loadRefTarget` contract, both `refFamily` variants).
- Encode the core/legacy Branch record invariant as a discriminated union once the stage-4
  migration converts legacy records (runtime guards cover it until then).

## Stage 3 (this branch) — UI + review-workflow convergence

- [x] 3a: branch-scoped agent edits (MarkdownOperation.Update branchId) + deployed device-local
      BranchStore (localStorage in space-proxy).
- [x] 3b: generic version-history companion in plugin-space (SpaceCapabilities.HistoryProvider
      gate; markdown contributes the provider); ObjectHistory + moved timeline model/NamePopover.
- [x] 3c: editable unified merge overlay (ui-editor diffView) for the sideBySide compare, on the
      live branch editor; read-only DiffView removed.
- [x] 3d: branch-aware comments (AnchoredTo.branch, scoped to the review branch from the shared
      version selection) + AcceptChange per-hunk cherry-pick (CollaborationOperation.AcceptChange + cherryPickHunk); getObjectOnBranch read helper. Memoized fixtures regenerated.

## Stage 4 (this branch) — cleanup

- [x] Textual-fork CREATION path already retired in stage 2 (`Branch.create` is core-only); no
      residual code creates content-copy branches. No `HistoryScrubber` exists (nothing to fold).
- [x] `merge3` + conflict-marker editor retained for external/imported content and legacy
      content-copy records (which stay mergeable via `merge3` until they drain) — NOT a destructive
      migration (no real persisted content-copy data; format shipped <2 days ago).
- [x] `DatabaseRoot.mapLinks` remaps the `branches` registry doc urls on space import/copy.
- [x] Ref atom families resolve to `undefined` on the initial read of an already-deleted target.
- [x] DESIGN.md updated to the landed converged model.
- [ ] Deferred (needs legacy records gone first): encode core/legacy `Branch` as a discriminated
      union / make `key` required. Left optional so legacy records still load.

## Post-merge fixes on the stage-1..3 PR (#12246)

- [x] Merge with origin/main: resolved plugin-comments threads.ts (branch-review scoping +
      main's selection-style highlights) + lockfile.
- [x] Branch-checkpoint bug: revisions on a branch record the branch's heads and lane on the
      branch (Version.branch); view/restore resolve the branch doc. Multi-revision BranchMerge
      storybook play test.
- [x] Flaky concurrent-siblings forkDump test: relaxed the environment-dependent head-count
      assertion.

## Future

- Generalize `@dxos/versioning` record refs over `Ref(Obj.Any)` so non-Text objects (sketches,
  sheets) can be versioned; branch-level access control; subduction fragment compaction alignment.
