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

## Next stages

- [ ] Stage 2: rewire `@dxos/versioning` onto the core API (registry=docs, records=metadata;
      checkpoint viewing via `setTimeTravel`; restore clears pin first).
- [ ] Stage 3: companion to plugin-space generic slot (markdown provider first); editable merge
      overlay; branch-aware comments + AcceptChange.
- [ ] Stage 4: retire the textual fork path; migrate legacy content-copy branches.
