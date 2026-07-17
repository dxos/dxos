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

## Next stages

- [ ] Stage 3: companion to plugin-space generic slot (markdown provider first); editable merge
      overlay; branch-aware comments + AcceptChange; branch-aware agent update operation.
- [ ] Stage 4: retire the textual fork path; migrate legacy content-copy branches.
- [ ] Keep the textual merge logic (`merge3` + conflict markers) for non-automerge cases —
      external/imported content and any text without shared CRDT history — even after stage 4
      retires it as the branch-merge path.
