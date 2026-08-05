# Tasks — startup latency (demand-driven activation)

Spec + phase definitions: [DESIGN.md](./DESIGN.md). Successor to the
app-framework-capability-activation deferral follow-up; implementation starts after that branch's
PR lands.

## Phase 1 — build the map

Instrumentation (build first, keep afterwards):

- [ ] Per-module activation timing in the startup pass, exported from the profiler
- [ ] Byte attribution per module/plugin (count and bytes are separate axes)
- [ ] Per-commit startup trend line — regression signal that fires when a plugin lands

Questions the instrumentation must answer (exit criteria in DESIGN.md):

- [ ] Fan-out concurrency vs per-module weight (the AppGraphBuilder cluster)
- [ ] Client/network-init vs module-work split on real hardware

The map itself — start from [`AUDIT-modules.md`](./AUDIT-modules.md) (the 2026-07-19 per-module
inventory carried over from the capability-activation project: per-capability groupings,
startup-root vs chain-member split, activation-event inventory). Re-probe first; it predates ~28
modules and the sketch/tldraw/illustrator split.

- [ ] Classify all ~460 modules: startup-essential | demand-gated(signal) | signal-needs-substrate
      | unknown — unknowns driven to zero
- [ ] Consumer-kind audit per provided capability (reactive / one-shot snapshot / sync read)
- [ ] Resolve the seed-hypothesis open questions (DESIGN.md table): surface-role declarability;
      operation→module map options; urlKey/PathResolution table static vs derived; ready-space
      type-inventory source
- [ ] Confirm or refute the §12 stay-eager list (Schema, translations, Settings)

## Phase 2 — derive the implementation phases

- [ ] Authored FROM the completed map (family grouping, substrate per family, measured-cost
      ordering) — deliberately not pre-authored; see DESIGN.md for the expected shape and the
      warm-reload-race prerequisite for any scheduling change
