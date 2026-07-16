# Document Revisions & Branches — Tasks

Design: [`packages/plugins/plugin-markdown/DESIGN.md`](../../../packages/plugins/plugin-markdown/DESIGN.md).
Convergence plan (+ resolved decisions):
[`agents/superpowers/plans/2026-07-17-branching-convergence.md`](../../../agents/superpowers/plans/2026-07-17-branching-convergence.md).
PR: [#12237](https://github.com/dxos/dxos/pull/12237) (branch `claude/document-revisions-branches-f7dc8e`).

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

## Next (after landing — fresh session)

- [ ] Stage 1: revive PR #11829 commits 1–3 (time travel, core branching, BranchStore) rebased on
      main; add coverage + writable per-surface `BranchBinding` API (spec in the convergence plan);
      wittjosiah reviews.
- [ ] Stage 2: rewire `@dxos/versioning` onto the core API (registry=docs, records=metadata;
      checkpoint viewing via `setTimeTravel`; restore clears pin first).
- [ ] Stage 3: companion to plugin-space generic slot (markdown provider first); editable merge
      overlay; branch-aware comments + AcceptChange.
- [ ] Stage 4: retire the textual fork path; migrate legacy content-copy branches.
