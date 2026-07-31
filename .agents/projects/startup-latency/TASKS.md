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

## Phase 2 — implementation waves (ordering ratified 2026-07-31)

Target state per family ratified in conversation (translations/schema/pluginAsset/settings stay
eager; per-family verdicts and measured sizing in MAP.md and the target table). Waves in order:

### Wave 1 — activation-event deferral of the four families (~6.1 MB / 431 chunks off eager boot)

Move `operationHandler`, `reactSurface`, `createObject`, `skillDefinition` off startup
(131 chunk-bearing modules of 244 total; combined removal measured at 6.1 MB of the 21.5 MB
boot JS). Substrate per SUBSTRATE.md:

- [ ] `MakerOptions`/`ModuleSpec` declaration field (`roles`, `handles`) next to `activatesOn`
- [ ] operationHandler → on-demand per operation: invoker `NoHandlerError` → pull-then-retry
      hook; un-pin the three `requires` barriers (`ProcessManagerPlugin.ts:16` drop,
      `plugin-routine` RegistrySync + `plugin-deck` NotificationTracker → event-mode on
      SpacesReady); fix the `layer-specs.ts:55` one-shot snapshot
- [ ] reactSurface → activation event per declared role; surface-miss → activate → suspend on
      the existing `placeholder`; `Surface.useIsAvailable` consults declared roles; follow-up:
      `React.lazy` component split (surface chunks statically import containers today)
- [ ] createObject → event on create-flow open; fix the untracked `getAll` in
      `plugin-space/.../extensions/database.ts:346` first
- [ ] skillDefinition → assistant-activation event; headless-routine caveat: toolkit
      materialization must pull (or fire the event) so trigger-fired routines keep skills
- [ ] Validate each flip with the startup harness (cold + warm-cold) and the
      first-interaction-latency probe on the deferred path

### Wave 2 — lightweight operation definitions ([DEFINITIONS-AUDIT.md](./DEFINITIONS-AUDIT.md))

No definition file is lightweight today (~576-file floor; confirmed-shipping leaks ≈ 2–2.5 MB
wire in the eager core). Fix rules 1–5 in the audit doc:

- [ ] Tag/implementation split for services referenced by definitions (pipeline-rdf `FactStore`
      exemplar — the 1.5 MB SPARQL chunk; `@dxos/ai` resolvers unreachable from its type surface)
- [ ] Definitions never import a plugin's main barrel — cross-plugin refs via `/types`
      (`Mailbox.ts` → plugin-connector barrel is the exemplar)
- [ ] Type directories value-free (`ui-editor/src/types/types.ts` value-imports
      `@codemirror/view` — 510 KB of CodeMirror at boot)
- [ ] `Operation` importable without the `@dxos/compute` barrel (subpath, or decouple
      `Header.ts` from `@effect/platform/HttpClient`) — decision owed: subpath vs decouple
- [ ] Drop the static `export { XOperationHandlerSet } from './operations'` from all 97
      `plugin.ts` stubs (sole external consumer is the node CLI — give it its own entry)
- [ ] Promote `audit-opdefs.py` to a CI budget check (fails on new heavy externals / closure
      growth) — prerequisite hardening for the `handles` declaration field

### Wave 3 — eager-core UI laziness audit

Components loaded before `main()` that should be lazy. Known from the chunk graph:

- [ ] `ResetDialog` lazy (`main.tsx:32` static import drags `react-ui-form` → emoji-mart 479 KB,
      motion, mdast/mermaid, ajv/zod — ~2 MB for a fatal-error dialog)
- [ ] Sweep the rest of `main`'s 9 MB / 874-chunk static closure for same-shape offenders
      (audit method: chunk-stats static closure of the entry, biggest facades first)
- [ ] fast-check in production: `@effect/ai`'s `LanguageModel` → `Arbitrary` → fast-check
      (298 KB) — investigate whether the Arbitrary path is test-only upstream, can be
      externalized/stubbed in the build, or needs an upstream issue

### Later / standing

- [ ] Critical-chain membership fixes (MAP.md P0): `observability.ClientReady` async body,
      `ProcessManager` activate audit — can land independently of the waves
- [ ] appGraphBuilder post-shell event — deliberately deferred until wave 1's win is measured
- [ ] Tier-aware per-commit trend line (Phase 1 leftover)
- [ ] Warm-reload race root-cause — still gates any scheduling change (round barriers)
