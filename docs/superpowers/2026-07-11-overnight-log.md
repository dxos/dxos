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

## DRAG-TEST CHECKLIST (for the morning — things I could not self-verify)

- _pending._

## Status

- Phase 2: not started.
- Phase 3: not started.
