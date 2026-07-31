# Tasks — startup latency (demand-driven activation)

Spec + phase definitions: [DESIGN.md](./DESIGN.md). Successor to the
app-framework-capability-activation deferral follow-up; implementation starts after that branch's
PR lands.

## Phase 1 — build the map

Instrumentation (build first, keep afterwards):

- [x] Per-module activation timing in the startup pass, exported from the profiler — wait/run/
      import split in `module-loader.ts` + `capability.ts` (`CurrentModuleId` FiberRef),
      `plugin-load:` measures in `plugin-manager.ts`, full-population export in the harness
- [x] Byte attribution per module/plugin (count and bytes are separate axes) — `DX_CHUNK_STATS=1`
      build emits per-chunk × per-package stats; node-side per-URL accounting in `trackNetwork`
      (the browser resource-timing buffer caps at 250 entries — never use it for totals);
      joined by `composer-app/scripts/analyze-startup.mjs`
- [ ] Per-commit startup trend line — BENCHMARKS.md appends per local run; CI wiring (one row per
      merge, fixed runner, **enabled-tier recorded per row**) still to be designed

Questions the instrumentation must answer (exit criteria in DESIGN.md):

- [x] Fan-out concurrency vs per-module weight — **concurrency, decisively** ([MAP.md](./MAP.md)):
      395-module round-1 fan-out, 81× overlap, per-module durations are a contention plateau;
      weight matters only on the critical chain (Client / ProcessManager / ClientReady)
- [x] Client/network-init vs module-work split — measured in-container (client init material,
      not dominant; the "client init dominates" container finding was a dev-server artifact);
      **real-hardware confirmation still owed** (open item in MAP.md)

The map itself — probed live from `manager.getModules()` on the production preview build
(456 modules); supersedes [`AUDIT-modules.md`](./AUDIT-modules.md):

- [x] Classify all 456 modules ([map.json](./map.json)): demand-gated 174 / stay-eager 132
      (value-only) / cluster-with-plugin 96 / startup-essential 43 / existing-event 11;
      `unknown` = 0 by family-rule construction (spot-check buckets noted in MAP.md)
- [x] Consumer-kind audit per provided capability → [CONSUMERS.md](./CONSUMERS.md)
- [x] Seed-hypothesis open questions resolved → [SUBSTRATE.md](./SUBSTRATE.md): surface roles
      statically extractable (need `roles` spec field + miss hook); operation→module map needs
      `handles` field + invoker miss hook (the key-embeds-plugin naming convention is
      demonstrably unsound); urlKey table derived-not-static but every key is a literal
      (hoistable); TypeAdded cannot cover pre-existing data → `TypePresent` watcher (one
      TypeSelector query per ready space)
- [x] Confirm or refute the §12 stay-eager list — **confirmed** (Schema, translations,
      PluginAsset value-only; Settings bound to their plugin cluster by sync-read consumers)

New findings beyond the planned questions (details in [MAP.md](./MAP.md)):

- Dependency-pass **rounds are barriers** — `observability.ClientReady` (4.2 s in-container)
  gates `deck.UrlHandler` and all of round 4; async-ifying its body is a membership-neutral
  critical-path cut
- Startup-root chunks statically pull their plugin's heaviest deps: typescript 7.7 MB via
  plugin-code operations, onnx+transformers 1 MB via transcription, defuddle/viem/falso
  likewise; `main`'s static closure is 9 MB / 874 chunks with fast-check (via `@effect/ai`
  Arbitrary), the SPARQL stack, emoji-data, and bip39 as suspects
- 44% of the measured population (200/456 modules) is labs-tier — production boots ~235 + deps;
  trend lines must separate the two populations

## Phase 2 — derive the implementation phases

- [ ] Authored FROM the completed map — priority ordering drafted in MAP.md §"Phase 2
      priorities": (1) critical-chain membership fixes (ClientReady async, ProcessManager audit,
      drop its OperationHandler require), (2) byte hygiene (typescript/onnx/defuddle/fast-check/
      SPARQL/emoji), (3) the MakerOptions declaration substrate (`roles`/`handles`/`urlKeys`) +
      two miss hooks + TypePresent watcher, then family flips in byte order, (4) tier-aware
      trend line. The warm-reload-race prerequisite still applies to any scheduling change
      (round-barrier restructuring).
