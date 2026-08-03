# Phase 1 map — measured startup structure and per-module classification (2026-07-31)

The [DESIGN.md](./DESIGN.md) Phase 1 deliverable. Companion artifact: [`map.json`](./map.json)
(the generating pipeline — `scripts/analyze-startup.mjs` and the `DX_CHUNK_STATS` vite plugin —
was removed once the map was complete; recover it from git history if it needs regenerating)
(all 456 modules classified, with per-module timings and byte attribution),
[`CONSUMERS.md`](./CONSUMERS.md) (consumer-kind audit), [`SUBSTRATE.md`](./SUBSTRATE.md)
(demand-signal substrate answers). Supersedes [`AUDIT-modules.md`](./AUDIT-modules.md) (2026-07-19)
wherever they disagree.

## Method

Production preview build (`vite build` + `vite preview`, PWA off), driven by
`composer-app/src/playwright/startup.spec.ts` on chromium headless — 5 cold runs and 5 warm-cold
runs for timing, 2 further cold runs for complete per-URL byte accounting. New instrumentation
(kept): per-module `wait`/`run`/`import` split in the module loader, `plugin-load:` measures for
plugin-definition chunks, full-population export (was top-10), static `getModules()` inventory in
the report, node-side per-URL byte accounting (the browser resource-timing buffer silently caps at
250 entries — do not use it for byte totals), and a `DX_CHUNK_STATS=1` build emitting per-chunk ×
per-package byte attribution joined by the (since-removed) `scripts/analyze-startup.mjs`.

**Environment caveat.** Runs are from a 4-vCPU container. With ~395 modules activating
concurrently, per-module durations sit on a contention plateau (~3.2 s each in round 1
regardless of actual work — value-only modules with no chunk "cost" 1.5 s by the same measure).
Absolute per-module numbers are ordering signals only; the structural findings (round barriers,
population, bytes, critical chain) are hardware-independent. Real-hardware confirmation of the
client-init split is an explicit open item below.

## Headline numbers (median of 5)

| scenario  | profilerTotal | navToReady | firstInteractive |    fcp |   bytes | modules |
| --------- | ------------: | ---------: | ---------------: | -----: | ------: | ------: |
| cold      |     13,613 ms |  18,481 ms |        17,732 ms | 324 ms | 38.1 MB |     452 |
| warm-cold |     14,406 ms |  18,868 ms |        18,181 ms | 396 ms |       — |     451 |

Warm-cold ≈ cold in the container: persisted identity saves nothing because bundle parse and the
module fan-out dominate, and neither is cached across browser launches. (On real hardware the
2026-04 ledger showed warm ≈ 3.5 s vs cold ≈ 5.5 s — the split is environment-dependent.)

## The measured critical path (cold)

The dependency pass runs in **rounds that are barriers**: round N+1 (modules unlocked by round
N's contributions) starts only after ALL of round N finishes — so the slowest module of each
round gates everything downstream, related or not.

|           t (ms) | segment                                                                               | gate                                                                |
| ---------------: | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
|        0 → 3,600 | fetch/parse/eval of `main`'s static import closure — 874 chunks, 9 MB                 | bytes                                                               |
|    3,600 → 3,950 | main phases: dynamic-imports 285, config 40, services 2, plugins-init 6               | —                                                                   |
|    3,950 → 5,340 | 58 plugin-definition chunk loads (`plugin-load:`, Σ1.3 s)                             | serialized-ish                                                      |
|   5,400 → ~9,650 | **round 1**: 395-module fan-out (unbounded concurrency)                               | `client.Client` 4.7 s (import 2.75 s)                               |
|  9,650 → ~11,750 | **round 2**: 30 modules requiring `Client`                                            | `processManager.ProcessManager` 1.9 s → provides `operationInvoker` |
| 11,750 → ~15,960 | **round 3**: 16 modules requiring `operationInvoker`                                  | **`observability.ClientReady` 4.2 s**                               |
|  15,960 → 16,100 | **round 4**: 5 modules (`deck.UrlHandler`, `OAuthRedirect`, …) + SpacesReady wave (6) | ~150 ms                                                             |
|           16,100 | `Startup` activated (profilerTotal ends)                                              | —                                                                   |
|        → ~18,500 | identity/onboarding + first React commit → user-account visible                       | cold-only tail                                                      |

Two immediate consequences:

1. **`observability.ClientReady` is a round barrier on the critical path.** `deck.UrlHandler`
   (URL restoration!) waits ~4 s for observability to finish. Its work is not something later
   rounds consume — making its body async (activate fast, do the work in a forked fiber) cuts the
   chain by roughly its full duration. This is a membership-neutral change, not a scheduler
   change (the AUDIT.md Phase 4 revert hazard does not apply).
2. Same shape one level up: everything requiring `operationInvoker` waits for the whole of round
   2, and everything in round 2 waits for the whole of round 1 — deferral that shrinks round 1's
   membership also de-noises the barrier, but the barrier structure itself is worth revisiting
   in Phase 2 (with the warm-reload race root-caused first, per the standing hazard).

## Exit criterion: concurrency vs weight — **concurrency (fan-out population), decisively**

- Round 1 launches 395 modules at once; Σmodule-duration is 81× the module-phase wall clock.
- Per-module durations cluster at a uniform plateau (~3.2 s) independent of actual work;
  value-only families (translations 53, pluginAsset 40, schema 37 — zero chunks) still "cost"
  ~1.5 s each by wall-clock measure. Individual module weight is not the driver; the number of
  concurrent activations (each with a chunk fetch + parse + eval + fiber overhead) is.
- The §12 hypothesis (the AppGraphBuilder cluster's 1.1 s was fan-out, not per-module cost) is
  confirmed and generalizes to the whole population.
- Therefore: **deferral pays through population reduction and byte reduction**, not through
  removing any individual slow module — with the three exceptions on the critical chain
  (`Client`, `ProcessManager`, `ClientReady`), where per-module weight is real.

## Exit criterion: client/network-init vs module-work split

In-container, on the critical chain: `client.Client` run 4.7 s of which 2.75 s is chunk import →
~1.9 s true client init (worker boot, OPFS SQLite, halo); `ClientReady` ~1.4 s ex-import;
`ProcessManager` ~1.9 s incl. import. The rest of profilerTotal is bundle parse (3.6 s),
plugin-definition loads (1.4 s), and fan-out contention. Client init is **material but not
dominant**: even zeroing it leaves ~10 s of module/bundle work in-container. The container
finding from DESIGN.md ("client init dominates") does **not** reproduce under the production
preview — those 7.8 s ClientReady numbers were dev-server profiles. **Real-hardware confirmation
still owed** (the 2026-04 ledger suggests Client ≈ 1.7 s of a 5.4 s cold profilerTotal ≈ 30% —
consistent with "material, not dominant"). Module deferral is not second-order; the plan keeps
its shape.

## Byte attribution (cold startup fetches 38.1 MB, 1,937 URLs)

Top offenders, each traced to its importer chain:

| package                                | startup bytes | how it gets loaded                                                                                                                                |
| -------------------------------------- | ------------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript                             |        7.7 MB | statically imported by plugin-code's operations chain (`build-project.ts` → `compiler`) — loads because code's OperationHandler is a startup root |
| react-dom                              |        1.8 MB | legitimate (entry)                                                                                                                                |
| effect                                 |        1.5 MB | legitimate (entry)                                                                                                                                |
| defuddle                               |        950 KB | plugin-magazine `create-object` chunk (startup root)                                                                                              |
| onnxruntime-web + @xenova/transformers |        1.0 MB | plugin-transcription `enrich-message` operations chunk (startup root)                                                                             |
| viem                                   |        687 KB | plugin-payments react-surface chunk (startup root, labs)                                                                                          |
| @emoji-mart/data                       |        479 KB | static closure via ClientPlugin chunk chain                                                                                                       |
| @ngneat/falso                          |        394 KB | plugin-sample `randomize` operations chunk (dev-only plugin)                                                                                      |
| fast-check                             |        298 KB | `@effect/ai`'s `Arbitrary` module, pulled by `LanguageModel` — in `main`'s static closure                                                         |
| @traqula/* + @comunica (SPARQL)        |       ~640 KB | fact-store → contact-extractor chain in `main`'s static closure                                                                                   |
| codemirror-lang-mermaid                |        204 KB | statically imported in ui-editor's `decorate` bundle                                                                                              |
| bip39                                  |        207 KB | halo profile-state-machine (worker + main closure)                                                                                                |

The pattern is systemic: **a startup-root module's chunk statically imports the plugin's heaviest
dependency**, so the module families below carry most of the deferrable bytes. `main`'s static
import closure alone is 9 MB / 874 chunks and deserves its own hygiene pass (fast-check, SPARQL
stack, emoji data, bip39 are all suspect there).

## Population tiers (the growth axis)

| tier                                             | plugins | modules |
| ------------------------------------------------ | ------: | ------: |
| core (always enabled)                            |      15 |     106 |
| default content (prod default)                   |      12 |     129 |
| dev-only (debug, devtools, sample)               |       3 |      21 |
| labs/other (enabled because `isDev \|\| isLabs`) |      31 |     200 |

**44% of the measured boot population is labs-tier.** Production-default users boot ~235 modules
plus dependency closure, not 456. The June→July "+60 modules" drift measured on dev machines is
substantially labs growth; the per-commit trend line must track both populations separately or it
will keep conflating them.

## Classification (all 456 modules — full detail in map.json)

| classification               | count | meaning                                                                                                                                                       |
| ---------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| demand-gated                 |   174 | has an identifiable demand signal; needs the Phase 2 substrate to declare it                                                                                  |
| stay-eager                   |   132 | value-only (no chunk observed): translations, schema, pluginAsset + small inline bodies — nothing to win                                                      |
| cluster-with-plugin          |    96 | non-core service/side-effect modules that defer with their plugin's cluster (incl. sync-read Settings singletons, which must never load after their surfaces) |
| startup-essential            |    43 | core service chain (client, space, graph, deck shell, theme, process manager, …)                                                                              |
| demand-gated(existing-event) |    11 | already event-mode today                                                                                                                                      |

Per-family demand signals (population; measured Σrun is contention-inflated — use bytes for
priority): the signal definitions and their substrate are in [SUBSTRATE.md](./SUBSTRATE.md).

| family                              | modules | chunks                             | demand signal                             | substrate needed                                             |
| ----------------------------------- | ------: | ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| reactSurface                        |      50 | yes (Σimport largest)              | declared role first rendered              | `roles` spec field + surface-miss hook                       |
| operationHandler                    |      37 | yes — carries typescript/onnx/etc. | operation first invoked                   | `handles` spec field + invoker miss hook + un-pin 3 requires |
| appGraphBuilder                     |      32 | yes                                | node under declared urlKey first resolved | `urlKeys` spec field + parse-then-load                       |
| createObject                        |      27 | yes                                | create dialog opened / schema actions     | fix snapshot-in-callback consumer, then event or pull        |
| skillDefinition                     |      19 | yes                                | first toolkit materialization             | un-pin RegistrySync require; signal needs decision           |
| settings                            |      21 | yes                                | with plugin cluster                       | none (policy) — sync-read hazard binds them to the cluster   |
| translations / schema / pluginAsset |     130 | no                                 | —                                         | stay eager; zero byte win                                    |
| content-type clusters (~26 plugins) |       — | yes                                | `TypePresent(type)` per ready space       | type-presence watcher (one TypeSelector query/space)         |

## Phase 2 priorities (derived from the map, highest measured leverage first)

1. **Critical-chain membership fixes (no scheduler change, no substrate):** make
   `observability.ClientReady`'s body async (~4 s of round-3 barrier in-container; ~0.9-1.3 s on
   the 2026-04 real-hw ledger); audit `ProcessManager`'s activate for the same; drop its
   `OperationHandler` require (feeds a reactive set — CONSUMERS.md).
2. **Byte hygiene, no framework work:** typescript out of plugin-code's startup chain (7.7 MB),
   transcription's onnx chain (1 MB), magazine/defuddle (950 KB), fast-check via `@effect/ai`
   Arbitrary (298 KB), SPARQL fact-store chain and @emoji-mart/data out of the static closure.
   These are ordinary lazy-import fixes inside module bodies, shippable one PR each.
3. **The substrate + family flips (the demand-gated 174):** one `MakerOptions` declaration field
   (`roles`/`handles`/`urlKeys`), two miss hooks (surface, invoker), the TypePresent watcher, and
   un-pinning the three `OperationHandler` requires — then flip families in byte order:
   operationHandler → reactSurface → createObject → appGraphBuilder → skillDefinition.
4. **Population truth in measurement:** record the enabled-plugin tier in every benchmark row and
   trend both the prod-default and dev populations; 44% of today's measured cost is labs-tier.

## Open items

- Real-hardware run of this same harness (one command:
  `DX_PWA=false pnpm exec playwright test --config=src/playwright/playwright.config.ts src/playwright/startup.spec.ts`
  after a `DX_CHUNK_STATS=1` bundle) to confirm the client-init split and de-contend the
  per-module ordering.
- Per-commit trend line: BENCHMARKS.md appends locally; CI wiring (one row per merge on a fixed
  runner) still to be designed.
- Warm-reload race root-cause — still the standing precondition for any activation-_scheduling_
  change (round-barrier restructuring), per AUDIT.md Phase 4.
- `unknown` count is zero by construction (family rules cover the population), but two judgment
  buckets deserve spot-checks during Phase 2 flips: the 96 cluster-with-plugin service modules
  (each flip audits its plugin's internal requires) and skillDefinition's signal decision.
