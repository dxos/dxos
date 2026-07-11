# Overnight run — 2026-07-11 (universal DnD core, Phases 2–3)

Running log of autonomous work + decisions taken on best judgment (user offline until morning).
Landing PR #12165 stays with the user; everything here is pushed to the same branch.

## ⚠️ MORNING: PR #12165 is in the MERGE QUEUE (branch locked, can't push)

You queued #12165 (Phase 1) for merge, so the remote branch is locked — all Phase 2/3 work below is
**LOCAL COMMITS ONLY** on this branch, stacked on top of the Phase-1 commits. The remote branch will
likely auto-delete on merge; the local worktree + commits survive.

**Recovery (after #12165 merges to main):** the Phase 2/3 commits are all NEW files under
`packages/ui/react-ui-board/src/components/Grid/` (+ docs), zero overlap with Phase 1 — so:
`git fetch origin && git switch -c <new-branch> origin/main && git cherry-pick <sha>..<sha>` (SHAs
listed under Status below), then open a Phase 2/3 PR. I cannot create branches or push, so this last
step is yours.

## Standing constraints

- Grow PR #12165 on this branch; do NOT merge.
- Verify headless only (unit tests / build / lint / story render + console). Interactive drag is NOT
  self-verifiable (native HTML5 drag doesn't synthesize) → collected into a morning DRAG-TEST CHECKLIST below.
- Proceed on best-judgment defaults; hard-stop only on unfixable build or a cascading design fork.

## Decisions log

(chronological; each also reflected in the relevant commit message)

1. **Reduced Phase 2 to additive-only for the unattended run.** The spec's Phase 2 also migrates
   Mosaic's Container/Tile onto the new hooks and consolidates the 3 drop-indicators into one. Both
   change drag behavior / visuals that I cannot self-verify (native drag doesn't synthesize in
   automation). To avoid shipping unverified behavior changes on a working system, I'm building only
   the **additive** primitives Grid needs — opaque `DndLocation`, `LayoutModel` interface,
   `useDndContainer`/`useDndTile` as NEW standalone hooks — and **deferring** the Mosaic migration +
   indicator consolidation to a phase you can drag-test. Mosaic/List keep their current working wiring
   untouched. Rationale: maximizes verified value overnight, zero risk to the working Stack/Kanban DnD.
2. **Grid engine is the priority + fully headless-tested.** The collision/push/compact/resize/float
   engine is pure functions → exhaustive unit tests → real verified value by morning. The React
   interaction layer (drag/resize gestures) is the only part gated on your morning drag-test.
3. **Fixed a resize edge case in the engine:** growing a tile's width at the right edge now caps `w`
   and keeps `x` fixed (was shifting `x` left via the shared clamp). Added a test. (commit amended.)
4. **Grid component wires `Dnd.Root` directly (mirrors existing `Board.tsx`), engine drives onDrop/resize.**
   So the generic `useDndContainer`/`useDndTile` hooks (Phase 2.3) are NOT needed for a working Grid —
   deferred as an ergonomics refinement. The Grid still consumes the shared core (Dnd.Root monitor +
   handler + payload). LayoutModel interface (2.2) also deferred (Grid uses the engine directly).

## DRAG-TEST CHECKLIST (for the morning — things I could not self-verify)

Storybook: `moon run storybook-react:serve` from THIS worktree (or `pnpm exec storybook dev --port=9010`
in tools/storybook-react). Grid story id: `ui-react-ui-board-grid--default` (once built).

- [ ] Grid renders: tiles at correct cells, empty cells show `+` buttons.
- [ ] Drag a tile onto an occupied cell → occupant pushes down (float) / layout compacts (pack).
- [ ] Drag near right edge → tile clamps within columns.
- [ ] Resize a tile (drag handle) → snaps to whole cells, pushes neighbours, respects min/max.
- [ ] No console errors during drag/resize.

## Status — OVERNIGHT RUN COMPLETE

- Engine (3.1): **DONE + fully verified** — 30 unit tests (collision/push/cascade/compact/resize/
  clamp/pack-vs-float/purity/determinism). commit `b2afc8e382`.
- Grid component (3.2) + story (3.3): **DONE + render-verified** — story `ui-react-ui-board-grid--default`
  mounts cleanly (tiles positioned on grid, dashed empty-cell backdrop, drag handles; only console error
  is a harmless favicon 404). Drag/resize gestures NOT self-verifiable → see DRAG-TEST CHECKLIST.
  commit `570c6f1133`.
- Phase 2 hooks (`useDndContainer`/`useDndTile`) + `LayoutModel`: **deferred** (decision #4) — not needed
  for a working Grid; ergonomics refinement for a later drag-testable phase.

### Local commits to integrate (all NEW files, cherry-pick cleanly onto post-merge main)

`b2afc8e382` engine · `570c6f1133` Grid component+story · (+ docs `f8a82343ac`, `10a4f3c2bb`, this log).
None pushed (branch locked by merge queue). See the MERGE QUEUE recovery note at top.

### CodeRabbit review on #12165 (addressed locally, commit `0286fc821d`)

Branch is merge-queue-locked so I could NOT push to #12165 or reply on its threads. Fixed locally
(rides along with the Phase 2/3 integration): plan `Root.test.tsx`→`.ts`; spec Phase-1 scope drops the
deferred hooks; Thread.tsx "Mosaic registry"→"DnD registry" comment; types.test.ts `as any`→typed
`ElementDragPayload` helper. Skipped (nitpick): `ObjectCardStack` → `useContainerId` adoption (low value,
kept diff focused). **Morning: reply/resolve the 4 threads once these land, or note them as follow-ups.**
The nits are all Minor/Trivial and do NOT block the queue — Phase 1 can merge without them.

### Grid drag-test findings + fixes (morning, live with user)

- ✅ Tiles overflowed cells → Card min/max inline-size neutralized (`a2d1cd4173`).
- ✅ Title moved into header row next to drag handle (`e5773f4ce9`).
- ✅ Drag preview kept ballooning → custom preview sized to source (`a2d1cd4173`).
- ✅ Couldn't drop a tile onto its own footprint / onto occupied cells (no push) → all tiles
  `pointer-events:none` during any drag so backdrop cells beneath receive the drag (`e5773f4ce9`, `17bf144b81`).
- ✅ Container didn't scroll → story viewport wrapped in `overflow-auto` (`17bf144b81`).
- ✅ `+` add buttons work.

- ✅ Grid hugged top-left with a margin only bottom-right → `cellRect` given a leading gap so the
  gutter is symmetric on all edges (verified 16px on all four) (`<pending commit>`).

### FOLLOW-UP — Grid interaction enhancements (need interactive drag-testing with user)

1. Resize from **any corner or side** (8 handles, not just bottom-right); top/left handles must move
   x/y as well as w/h — extend `engine.resizeItem` to take a new `{x,y,w,h}` (keep pure + unit-tested).
2. **Magnetic** resize ghost: snap to the nearest cell boundary when within ~⅓ cell, else move freely;
   commit snapped size on release. (Current ghost is raw-follow + snap-only-on-release.)
3. **Directional push:** collisions currently always push occupants DOWN. Decide push axis
   (right vs down) from the drag direction / dominant overlap axis (gridstack-style). Engine change in
   `resolveCollisions` + needs drag-tuning for feel.
   All live in `GridCell.tsx` + `engine.ts`. Couldn't spawn a task chip (MCP offline).

### Suggested next (morning, after #12165 merges)

1. Integrate the local Grid commits (recovery note) → Phase 2/3 PR.
2. Drag-test the Grid (checklist above); fix any gesture wiring (resize delta→cells is the least-certain bit).
3. Then Phase 2 proper (migrate Mosaic/List onto the hooks + one DropIndicator) and Phase 4/5 — all
   drag-testable-with-you.
