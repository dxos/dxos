# Overnight run — 2026-07-11 (universal DnD core, Phases 2–3)

Running log of autonomous work + decisions taken on best judgment (user offline until morning).
Landing PR #12165 stays with the user; everything here is pushed to the same branch.

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

## Status

- Engine (3.1): DONE + verified (30 unit tests). commit b2afc8e382.
- Grid component (3.2) + story (3.3): in progress.
- Phase 2 hooks/LayoutModel: deferred (see decision #4).
