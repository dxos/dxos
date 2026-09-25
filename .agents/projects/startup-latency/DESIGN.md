# Startup latency — demand-driven activation

Scoping document. Two phases: **build the map, then derive the plan from the map.** The
implementation phases are deliberately not authored here — they are the output of Phase 1, not an
input to it.

## Context

The capability-dependency activation refactor is **perf-neutral vs `main`** (branch-vs-main profiles
taken 2026-07-30 on real hardware: deltas of −7%/+2%/+8% across dev-cold/cold/warm-cold, module
count 460 vs 459, bundle bytes ~identical — all inside single-sample noise). It is not the cause of
any regression and is green to land.

The real regression is growth: both branch and `main` are **~20–24% slower on cold `navToReady`**
than the 2026-06-16 baseline, explained by **~60 more modules and ~2–3 MB more transferred bytes**
from plugins that landed on `main` over six weeks. That is a structural trend, not a bug — it recurs
every time a plugin is added, and it will keep recurring.

The refactor is what makes this tractable. The module population is now uniform and auditable in one
probe (`globalThis.composer.manager.getModules()`), every module declares `requires`/`provides`
statically, and event-mode activation already exists as a deferral mechanism.

Prior art: [`composer-app/AUDIT.md` §12](../../../packages/apps/composer-app/AUDIT.md) (2026-07-19
module audit, per-capability counts) with full per-module lists in
the 2026-07-19 starting inventory (dropped; see git history). Useful starting
inventory; superseded by the Phase 1 map wherever they disagree.

## Principle: two tiers, no middle

Every module is one of exactly two things:

1. **Startup-essential** — genuinely needed to reach a workable app. Loads at startup, eagerly, no
   apology.
2. **Demand-gated** — has an identifiable moment when it becomes needed. Loads exactly then, and
   never before.

**Explicitly rejected: post-paint / idle batches** (§12 tier 1's `AfterStartup` event). A deferred
batch still loads everything unconditionally — it answers "when is this needed?" with "later"
instead of with a demand signal, improves the first metric you look at, and permanently blurs the
question this whole effort exists to answer. If something is needed at startup, load it at startup;
otherwise load it when it's actually needed. Do not reintroduce this tier.

The per-module question is therefore: **what is this module's demand signal?** And the recurring
design constraint is:

> **The demand signal must be declared statically, in the module spec, so the framework can pull the
> one chunk it needs without loading all of them to find out which one it needs.**

Today most "what does this module handle" information lives _inside_ the module body's contributed
value — the surface's role, the operation a handler serves, the graph paths a builder owns. That is
precisely backwards for lazy loading: you must load the chunk to discover you didn't need it. Much
of the eventual implementation work will be hoisting that declaration from body to spec.

## Phase 1 — build the map

One artifact: a complete per-module inventory of the ~460-module population, answering for **every**
module:

- **What it provides, and who consumes it how** — reactive collection (late contributions pop in),
  one-shot snapshot (late contributions are lost — LayerStack is the known case), or synchronous
  read (late contributions are a crash or a miss).
- **When it is first genuinely needed** in a real session — first paint, first render of a given
  surface role, first invocation of an operation, first document of a type, never in most sessions.
- **Its demand signal** — the observable moment that precedes that need, and whether the signal is
  **statically declarable today** or requires substrate (a spec field, a new event, a build-time
  map) to exist first.
- **Its cost** — chunk bytes, measured activation time, transitive imports. A module with no chunk
  (value-only: translations, schema) has nothing to win from deferral regardless of its signal.
- **Classification**: `startup-essential` | `demand-gated(signal)` | `signal-needs-substrate` |
  `unknown` — with `unknown` driven to zero before Phase 2.

### Instrumentation the map needs (build first, keep afterwards)

- Per-module activation timing in the startup pass, exported from the profiler.
- Byte attribution per module/plugin — count and bytes are different axes; the June regression moved
  both.
- Concurrency vs weight: §12's 1,128–1,141 ms `AppGraphBuilder` cluster suggests fan-out
  concurrency, not per-module cost, may dominate — if so, deferral buys less than counts imply and
  the map must say so.
- Two metrics per candidate: `navToReady`/TTI **and** first-interaction latency on the deferred
  path. Deferral moves cost; it does not delete it.
- A per-commit trend line. The 6-week drift accumulated invisibly; a regression signal that fires
  when a plugin lands is the durable win independent of everything else.

### Seed hypotheses (watch for these; do not stop at them)

Known demand-signal families going in — from prior discussion and §12. They orient the
investigation; the map decides, and should expect to find families not on this list:

| Family                                                                  | Signal                                                   | Known open question                                                                                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface providers (46)                                                  | surface with role X first rendered                       | is role statically declarable for every surface module, or is some role computed? needs a surface-miss placeholder path                                                                         |
| Operation handlers (38)                                                 | operation X first invoked                                | needs a static operation→module map; three eager barrier consumers (`routine.RegistrySync`, `deck.NotificationTracker`, `processManager.ProcessManager`) currently pin all providers to startup |
| Graph builders (20)                                                     | graph node under builder's paths first resolved          | does `5585ec89`'s `urlKey`/`PathResolution.buildUrlKeyTable` give a static owner map, or is it derived from already-registered extensions (which wouldn't avoid the load)?                      |
| Content-type plugin clusters (~26 plugins)                              | document of type X exists in a ready space, or is opened | `SpaceEvents.TypeAdded` only fires on add, not for pre-existing data; where does a ready space's type inventory come from and how early is it trustworthy?                                      |
| Skills (17), CreateObjectEntry (26), PluginAsset (38), Settings (17), … | to be determined per family                              | the map's job                                                                                                                                                                                   |

§12 argued Schema, translations, and Settings stay eager (materialization ordering, no chunk,
sibling reads). Treat those as hypotheses the map confirms or refutes, not inherited decisions.

### Exit criteria

- Every module classified; `unknown` count is zero.
- Every demand-gated module names its signal and whether the signal needs substrate.
- Cost is measured, not estimated, for at least the top families by aggregate weight.
- The concurrency-vs-weight question has an answer.
- The client/network-init vs module-work split is confirmed on real hardware (container profiling
  showed `observability.ClientReady` ~7.8 s and `client.Client` ~5.9 s dominating there — if client
  init dominates on real hardware too, module deferral is second-order and the plan changes shape).

## Phase 2 — derive the implementation phases

Authored **from the map**, not before it. Expected shape: group demand-gated modules by signal
family; for each family, one phase that (a) builds the missing substrate — usually hoisting the
demand declaration into the module spec, plus any new event or resolver-miss path — and (b) flips
that family's modules; ordered by measured aggregate cost per unit of substrate work. Each phase
brief records the family's consumers-audit (no one-shot snapshot readers) and its
first-interaction-latency budget.

Until the map exists, resist sizing beyond §12's rough upper bound (tiers 2–3 there put ~100+ of the
234 chunk-bearing startup activations in play).

## Prior art and hazards (read before implementing anything)

1. **AUDIT.md Phase 4 was attempted and reverted** (`c0e35cd1d2`). Bounded concurrency +
   `Effect.yieldNow()` in the activation graph showed a ~1.3 s win that turned out to be run-to-run
   noise, while the yields **amplified a pre-existing warm-reload race** (System Error dialog in
   60–90% of warm reloads). Standing lesson: any change to activation _scheduling_ (as opposed to
   activation _membership_) must land alongside a root-cause fix for that race. It is still
   un-root-caused.
2. **One-shot multi snapshots break under deferral.** Any consumer that snapshots a multi capability
   misses late contributions. The map's consumer-audit column exists to catch every one of these
   before a flip, not after.
3. **Deferral converts startup latency into interaction latency.** Budgeted per family in Phase 2;
   measured per candidate in Phase 1.
4. **Warm and cold diverge.** The warm path has its own flake profile; no flip is validated on cold
   alone.

## Non-module axes

Module activation is not the only thing that regressed, and the map should not pretend otherwise:

- **Bundle bytes** (~2–3 MB since June). Deferring a value-only module saves nothing; §12 counted
  ~122 value-only of 359 startup roots. Byte attribution tells us where the 2–3 MB actually lives.
- **Client/network init** — see the exit criterion above; if it dominates, it becomes its own
  workstream and module deferral is demoted.

## Ratified: per-plugin start events (2026-08-01)

Supersedes the FeatureRequested proposal below (user: no keyed family — each plugin exports a
named event namespace, `<Name>Events.Start`, id by convention `<pluginKey>.event.start` via
`ActivationEvent.pluginStart`). Rules:

- A plugin's own off-critical-path modules ride its own `Start`.
- Cross-plugin contributions ride the CONSUMER's event: skills → assistant's Start (maker
  default; `AppCapability.AssistantStart` names it by key to avoid package cycles), markdown
  extensions → `MarkdownEvents.Start`, game variants → `GameEvents.Start`, routine templates →
  `RoutineEvents.Start`, connectors → `ConnectorEvents.Start`.
- DeferredStartup and SkillsRequested are deleted. Fire sites: composer idle hook trickles
  every core+enabled plugin's Start sequentially (`activateAllPluginStartEvents`); catalog
  fires a plugin's Start on post-boot enable; deck URL parse-miss fires all; chat surfaces /
  toolkit materialization / routine editor fire assistant's Start; test harness +
  withPluginManager fire all after Startup.
- Next refinement (not yet built): prune plugins from the idle trickle once precise demand
  sites (object-open typename map, data-presence scan, settings-open) cover them.

## Superseded proposal: feature-scoped activation events (2026-08-01, for review)

Replaces the coarse `DeferredStartup` gate module-by-module. Principle (user-ratified framing):
one event per **application feature**, not per concern — a module activates during startup only
if the feature starting up is the one it belongs to. Example: no dedicated skills event; an
assistant event carries skills AND every other assistant-related capability.

### The event family

`FeatureRequested(pluginKey)` — one keyed event family (`org.dxos.app-framework.event.
featureRequested`, specifier = plugin key), using the existing `OWN_PLUGIN_SPECIFIER` mechanism
so a module declares `activatesOn: FeatureRequested(OWN_PLUGIN)` without naming its plugin.
Feature ≈ plugin: sheet, markdown, kanban, calls, transcription, each integration (github,
linear, slack, …). No new manager machinery — plain events, like DeferredStartup.

Cross-feature integrations compose with `allOf`: transcription's MarkdownExtension activates on
`allOf(FeatureRequested(markdown), FeatureRequested(transcription))` — loaded only when both
features are live. Same pattern for CommentConfig, AnchorSort, skills contributed by feature
plugins, and Markdown bindings.

### Fire sites (when a feature "starts up")

1. **Object open** (immediate): a plank/surface resolves an object whose typename maps to a
   plugin — the typename→plugin map comes from the eager schema modules. Covers editors,
   boards, sheets, maps, drawings.
2. **Data presence** (idle-batched): the navtree/space scan sees objects of a plugin's types in
   the workspace — fire at idle so sidebar items get their graph builders/actions without the
   user opening one. A feature absent from the user's data never loads.
3. **Headless operation invocation** (immediate): the invoker, on a keyed-handler miss, resolves
   the operation's owning plugin from the registry, fires its event, retries once. Covers
   triggers/routines invoking runInstructions-class ops.
4. **Settings section open**: opening a plugin's settings panel fires its event (Settings
   modules ride the feature event).
5. **Toolkit materialization**: `OpaqueToolkitSpec.getToolkit` fires `FeatureRequested(assistant)`
   — replaces and retires `SkillsRequested`.
6. Existing gates stay and compose: `SurfacesRequested(role)`, `CreateObjectRequested`.

### Migration

- Mechanical sweep (same shape as the DeferredStartup sweep): per plugin, replace
  `activatesOn: DeferredStartup` with the own-feature event; cross-feature modules get `allOf`.
- `DeferredStartup` remains as the safety-net gate for genuinely app-wide modules (e.g. crx page
  actions, preview popover) and fires from the same paint-anchored composer hook; the test
  harness fires Startup → DeferredStartup → (per test) feature events.
- The eager keyed handler-set DEFINITIONS stay eager per the ratified decision only for keep-set
  plugins; feature plugins' handler sets ride their feature event, with fire site 3 as the
  headless safety net.
- Assistant becomes the exemplar (per the user's example): its 12 deferred modules +
  SkillDefinition (all plugins' skills via allOf) + Toolkit move onto
  `FeatureRequested(assistant)`, fired by chat surfaces, toolkit materialization, and the
  trigger path.

### What this buys over the idle wave

The DeferredStartup wave loads ~180 modules unconditionally at idle (~5 s of background
saturation). Feature events load only what the session's data and actions actually touch —
a fresh document-editing session loads markdown and nothing else; the burst disappears
entirely, replaced by small per-feature waves at interaction time (budgeted per the map's
interaction-latency column).

## Suspenseful client (2026-08-01, user-directed)

Client init leaves the startup critical path: the Client module contributes the uninitialized
client and forks `initialize()`; Startup completes and the shell renders; client-dependent
hooks suspend (per-Surface Suspense boundaries already exist).

- `@dxos/client`: `waitUntilInitialized()` — stable promise resolving on initialize.
- `@dxos/react-client`: `useClient` suspends while `!client.initialized`; `ClientProvider`
  gains a `suspend` prop — provides context immediately instead of rendering the fallback
  subtree-wide (legacy blocking behavior unchanged for other apps).
- `@dxos/halo-adapter-client`: adapters become construction-safe pre-init — streams open after
  init; `getSnapshot` pre-init is "unknown", NOT "no identity" (a none reading pre-init would
  flash onboarding on reload — identity gates must suspend or wait for the first emission).
- plugin-client: fork init with milestones + post-init continuation (callback, reload/reconnect
  wiring, SpacesReady subscription); failure surfaces via log.error + plugin failure record.
- Audit: startup-pass module bodies that call initialized-only client APIs; headless paths
  (harness initializeIdentity, operations) explicitly await init.
- Metrics shift: profilerTotal stops covering client init; navToReady/first-editor keep it.

---

# Appendices — Phase 1 deliverables

Each section below was authored as its own file and folded in here so the project keeps the
conventional `TASKS.md` + `DESIGN.md` pair. Content is verbatim; headings are demoted one
level. the 2026-07-19 starting inventory (the 2026-07-19 starting inventory) is not carried over — it
declared itself superseded by Appendix A; recover it from git history if needed.

## Appendix A — Phase 1 map — measured startup structure and per-module classification

The [DESIGN.md](./DESIGN.md) Phase 1 deliverable. Companion artifact: [`map.json`](./map.json)
(the generating pipeline — `scripts/analyze-startup.mjs` and the `DX_CHUNK_STATS` vite plugin —
was removed once the map was complete; recover it from git history if it needs regenerating)
(all 456 modules classified, with per-module timings and byte attribution),
[`DESIGN.md` appendix](./DESIGN.md#appendix-c--consumer-kind-audit--multi-arity-capabilities) (consumer-kind audit), [`DESIGN.md` appendix](./DESIGN.md#appendix-b--demand-signal-substrate--seed-hypothesis-answers)
(demand-signal substrate answers). Supersedes the 2026-07-19 starting inventory (dropped; see git history) (2026-07-19)
wherever they disagree.

### Method

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

### Headline numbers (median of 5)

| scenario  | profilerTotal | navToReady | firstInteractive |    fcp |   bytes | modules |
| --------- | ------------: | ---------: | ---------------: | -----: | ------: | ------: |
| cold      |     13,613 ms |  18,481 ms |        17,732 ms | 324 ms | 38.1 MB |     452 |
| warm-cold |     14,406 ms |  18,868 ms |        18,181 ms | 396 ms |       — |     451 |

Warm-cold ≈ cold in the container: persisted identity saves nothing because bundle parse and the
module fan-out dominate, and neither is cached across browser launches. (On real hardware the
2026-04 ledger showed warm ≈ 3.5 s vs cold ≈ 5.5 s — the split is environment-dependent.)

### The measured critical path (cold)

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

### Exit criterion: concurrency vs weight — **concurrency (fan-out population), decisively**

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

### Exit criterion: client/network-init vs module-work split

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

### Byte attribution (cold startup fetches 38.1 MB, 1,937 URLs)

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

### Population tiers (the growth axis)

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

### Classification (all 456 modules — full detail in map.json)

| classification               | count | meaning                                                                                                                                                       |
| ---------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| demand-gated                 |   174 | has an identifiable demand signal; needs the Phase 2 substrate to declare it                                                                                  |
| stay-eager                   |   132 | value-only (no chunk observed): translations, schema, pluginAsset + small inline bodies — nothing to win                                                      |
| cluster-with-plugin          |    96 | non-core service/side-effect modules that defer with their plugin's cluster (incl. sync-read Settings singletons, which must never load after their surfaces) |
| startup-essential            |    43 | core service chain (client, space, graph, deck shell, theme, process manager, …)                                                                              |
| demand-gated(existing-event) |    11 | already event-mode today                                                                                                                                      |

Per-family demand signals (population; measured Σrun is contention-inflated — use bytes for
priority): the signal definitions and their substrate are in [DESIGN.md appendix B](./DESIGN.md#appendix-b--demand-signal-substrate--seed-hypothesis-answers).

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

### Phase 2 priorities (derived from the map, highest measured leverage first)

1. **Critical-chain membership fixes (no scheduler change, no substrate):** make
   `observability.ClientReady`'s body async (~4 s of round-3 barrier in-container; ~0.9-1.3 s on
   the 2026-04 real-hw ledger); audit `ProcessManager`'s activate for the same; drop its
   `OperationHandler` require (feeds a reactive set — DESIGN.md appendix C).
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

### Open items

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

## Appendix B — Demand-signal substrate — seed-hypothesis answers

Phase 1 deliverable ([DESIGN.md](./DESIGN.md) seed-hypothesis table): for each family, whether the
demand signal is statically declarable today or needs substrate, with the minimal substrate named.
Verified against source on this branch (post capability-activation refactor).

### Q1 — Surface role declarability: statically declarable (extractable), not yet declared; no miss path exists

- Role is never computed from body state. `Surface.create` derives `role` from the filter's
  bindings (`app-framework/src/ui/components/Surface/types.ts:218-254`); every filter combinator
  takes a `Role.Role` token as first argument, and a sweep of all 70
  `plugins/*/src/capabilities/react-surface.tsx` files finds zero runtime-computed roles.
  The one dynamic factory (`AppSurface.deckCompanion(variant)`, `app-surface.ts:595-602`) is
  passed a string literal at all 8 producer sites — only consumers are dynamic.
- Prior art for build-time extraction exists but is broken: `reflect/introspect`'s
  `readRoleProperty` (`indexer/plugins.ts:475-499`) still reads the pre-refactor literal `role:`
  property, so `list_surfaces` returns empty roles.
- **Miss path: none.** `SurfaceComponent.tsx:229-231` returns `null` (dev) or renders an empty
  candidate list — the `placeholder` is only a `React.lazy` Suspense fallback and never renders on
  a role miss. `Surface.useIsAvailable` (`:311`) gives false negatives for unloaded modules.
- **Minimal substrate:** (1) `roles?: readonly Role.Role<any>[]` on `MakerOptions`
  (`core/capability.ts:592-607`) threaded to `ModuleSpec`/`Module`; (2) repair the introspect
  extractor as a drift guard; (3) a miss hook in the renderer: role→modules lookup from specs,
  activate, throw the pending promise into the existing `placeholder`/Suspense.

### Q2 — Operation→module map: needs substrate; a miss is an immediate hard failure

- `OperationInvoker._resolveHandler` is a linear `findLast` over registered handlers
  (`operation/src/OperationInvoker.ts:200-224`); a miss fails with `NoHandlerError` immediately —
  no wait, no resolution hook. The handler set itself is reactive
  (`process-manager-capability.ts:109`), so late contributions are visible.
- No static operation→module declaration exists (checked `Operation.Definition.meta`,
  `MakerOptions`, the `operationHandler` maker, `OperationRegistry.resolve`). The
  key-embeds-plugin naming convention is unsound: `LayoutOperation.Open` is defined under a
  non-existent `org.dxos.plugin.layout` and handled by four plugins (deck, simple-layout,
  spotlight, testing) — key→plugin is many-to-many.
- The three barrier consumers confirmed: `ProcessManagerPlugin.ts:12-26`,
  `plugin-deck/src/capabilities/index.ts:20-33`, `plugin-routine/src/capabilities/index.ts:21-33`.
  A multi require is a SOFT edge (`activation-graph.ts:21-22,119`): it pins providers only
  because they are dependency-mode roots in the same round. Flipping providers to event-mode
  no-ops the soft edge — no deadlock risk.
- On-demand pull machinery exists for event-mode requires only
  (`activation-scheduler.ts:523-560`).
- **Minimal substrate:** (1) `handles?: readonly Operation.Definition.Any[]` on `MakerOptions` —
  the handler claims the operation (definitions are already statically imported by callers, so
  no chunk weight); (2) an `onMissingHandler` resolution hook in the invoker's miss branch
  (activate → re-resolve once → fail); (3) move `RegistrySync`/`NotificationTracker` to
  `activatesOn: SpacesReady`, and drop ProcessManager's `OperationHandler` require (it only feeds
  the reactive set — the LayerSpec snapshot is a separate concern).

### Q3 — urlKey / PathResolution: derived, not static — but trivially hoistable

- `buildUrlKeyTable` scans `builder.getExtensions()` — the live registry — recomputed per call
  (`app-graph/src/path-resolution.ts:85-146`). Extensions register only when a graph-builder
  module body runs; every `url:` declaration sits inside a chunk (~26 sites enumerated). A cold
  deep-link today requires all graph-builder modules resident.
- Every `key` in the codebase is a string literal (two dynamic `path` resolvers, both with
  literal keys). `TypeSection.createTypeSectionExtension` already takes `urlKey` options as
  literals at all 7 call sites.
- Miss behaviour: unknown key → not-found sentinel; known key that doesn't resolve → bounded
  retry loop against `NavigationTargetLoader` (`url-handler.ts:134-178`) — the natural place to
  hang load-and-retry.
- **Minimal substrate:** (1) `urlKeys?: readonly { key: string; kind: 'item'|'singleton' }[]` on
  `MakerOptions` (kind is needed — `hasId` derives from it); (2) split `buildUrlKeyTable` into a
  pure table constructor with `fromBuilder`/`fromSpecs` adapters; conflict detection becomes a
  build-time assertion; (3) parse-then-load in the url-handler: tokenize against the static
  table, activate exactly the owning modules, then resolve as today.

### Q4 — Ready-space type inventory: needs substrate; TypeAdded structurally cannot cover pre-existing data

- `SpaceEvents.TypeAdded` fires only from the `AddType` operation handler
  (`plugin-space/src/operations/add-type.ts:31-35`) — on schema registration, not object
  presence. `table.on-type-added` is the right mechanism (chunk-free `inlineModule` parked on an
  event) with the wrong trigger for pre-existing data.
- `ClientEvents.SpacesReady` fires on the FIRST `client.spaces.subscribe` callback
  (`plugin-client/src/capabilities/client.ts:68-83`) — before individual spaces are
  `SPACE_READY`; consumers must filter per-space readiness (`spaces-ready.ts:168`).
- No aggregate "distinct typenames present" query exists, BUT: a disjunction of typename filters
  compiles to ONE indexed `TypeSelector` scan (`echo-host/src/query/query-planner.ts:442-455`),
  and the candidate typename set is already statically known at boot for free —
  `AppCapability.schema(types)` is a chunk-free inlineModule collected eagerly
  (`AppCapability.ts:129-133`, `schema-defs.ts:18-25`). Schema-stays-eager is what makes this
  substrate free.
- Parameterized activation events already exist and are unexercised: `ActivationEvent.specifier`
  - `compositeKey` (`activation-event.ts:14,33-44`).
- **Minimal substrate:** (1) `SpaceEvents.TypePresent` specifier-keyed by typename;
  content-type modules declare `activatesOn: TypePresent(typename)`; (2) a type-presence watcher
  in plugin-space on SpacesReady: per SPACE_READY space, one reactive
  `Query.select(Filter.or(...candidates))` (collapses to a single TypeSelector), firing the
  composite event per distinct typename first observed — covers pre-existing data and subsumes
  TypeAdded; (3) deck-restored planks pointing at not-yet-fired types are the failure mode —
  covered by Q1's surface-miss hook, which is therefore a blocker for this family.

### Cross-cutting conclusion

Three of four families converge on ONE substrate change: a declaration field on
`MakerOptions`/`ModuleSpec` next to `activatesOn` — `roles` (Q1), `handles` (Q2), `urlKeys` (Q3);
all values are already module-level constants, so hoisting costs no bytes. The genuinely new
runtime work is two near-identical miss paths (surface-miss → activate → suspend on existing
placeholder; handler-miss → activate → re-resolve) plus Q4's type-presence watcher (one indexed
query per ready space). Q4 needs no spec field at all.

## Appendix C — Consumer-kind audit — multi-arity capabilities

Phase 1 deliverable ([DESIGN.md](./DESIGN.md)): for every major multi capability, how each
consumer reads it — reactive (late contributions pop in), one-shot snapshot (late contributions
lost), or sync read (absence is a crash) — and therefore whether deferring its providers is an
activation-policy change or a consumer refactor. Verified against source on this branch.

### Consumption primitives

| primitive                                           | file:line                                                                    | semantics                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Capability.contributions(tag)` / `yield* MultiTag` | `packages/sdk/app-framework/src/core/capability.ts:92-95`, `:225-228`        | live `Contributions<T>` view (`.atom`, `.get()`, `.subscribe()`) — reactive **only if** the consumer uses `.atom`/`.subscribe`/re-calls `.get()`                                                                                                    |
| `Capability.getAll` / `manager.getAll`              | `capability.ts:66-67`, `capability-manager.ts:223-225`                       | untracked point-in-time array read — **snapshot**                                                                                                                                                                                                   |
| `Capability.atom` / `atomByModule`                  | `capability.ts:102-113`, `capability-manager.ts:218-221`, `:265-267`         | reactive atom                                                                                                                                                                                                                                       |
| `Capability.get` / `manager.get`                    | `capability.ts:50-59`, `capability-manager.ts:227-240`                       | sync read of first entry; throws `CapabilityNotFoundError` when absent                                                                                                                                                                              |
| `useCapabilities` / `useAtomCapability`             | `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:25-28`, `:65-68` | React-reactive                                                                                                                                                                                                                                      |
| multi `requires` resolution                         | `packages/sdk/app-framework/src/core/module-loader.ts:186-190`               | a multi require yields the live view — it never blocks, but declaring it **pulls all its dependency-mode providers** (`activation-scheduler.ts:511-560`), i.e. a multi require is an eager activation barrier even when the read itself is reactive |

### Per-site table

| capability                                          | consumer site                                                                                                                     | how consumed                    | when it runs                                 | deferral hazard                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Capabilities.ReactSurface`                         | `Surface/SurfaceManager.ts:53` (atom)                                                                                             | reactive                        | atom recompute; read at render               | none — late surfaces re-index                                                                                                            |
| `Capabilities.ReactSurface`                         | `Surface/SurfaceComponent.tsx:285` (`useSurfaces`)                                                                                | reactive                        | React render                                 | none                                                                                                                                     |
| `Capabilities.ReactSurface`                         | `Surface/SurfaceComponent.tsx:322` (`useIsSurfaceAvailable` callback)                                                             | snapshot per call               | per predicate invocation                     | low — re-read per call; cached booleans can go stale                                                                                     |
| `AppCapabilities.AppGraphBuilder`                   | `plugin-graph/src/graph.ts:23,35-53` (atom + subscribe, add & remove)                                                             | reactive                        | subscription installed at activate           | none                                                                                                                                     |
| `Capabilities.OperationHandler`                     | `plugin-process-manager/process-manager-capability.ts:57,109` (`OperationHandlerSet.reactive`)                                    | reactive                        | startup activate builds set; set tracks atom | none for the read; `ProcessManagerPlugin.ts:16` `requires` pulls all providers at startup                                                |
| `Capabilities.OperationHandler`                     | `plugin-routine/src/capabilities/registry-sync.ts:62-111` (atom + subscribe)                                                      | reactive                        | per contribution change                      | none for the read; `capabilities/index.ts:24-29` `requires` is the startup barrier                                                       |
| `Capabilities.OperationHandler`                     | `plugin-routine/src/capabilities/layer-specs.ts:55` (`getAll` in LayerSpec factory)                                               | one-shot snapshot               | at LayerStack slice materialization          | late handlers absent for the slice's lifetime                                                                                            |
| `Capabilities.OperationHandler`                     | `plugin-deck/src/capabilities/notification-tracker.ts:44,57` (live view, `.get()` per invocation)                                 | reactive-by-re-read             | toast-action click                           | none for the read; `capabilities/index.ts:23-30` `requires` is the barrier                                                               |
| `Capabilities.OperationHandler`                     | `plugin-doctor/src/diagnostics/providers/skills.ts:38` (`getAll`)                                                                 | snapshot                        | user-triggered diagnostics run               | low — retaken per run                                                                                                                    |
| `Capabilities.LayerSpec`                            | `process-manager-capability.ts:55,61,106` (`LayerStack` fold)                                                                     | **one-shot snapshot**           | startup activate                             | **canonical hazard** — self-documented at `:59-60`; why `#awaitProvidersInFlight` and same-round pulls exist                             |
| `Capabilities.TraceSink`                            | `process-manager-capability.ts:56,62,111`                                                                                         | one-shot snapshot               | startup activate                             | same window as LayerSpec                                                                                                                 |
| `Capabilities.RemoteTraceMonitor`                   | `process-manager-capability.ts:58,64,139`                                                                                         | one-shot snapshot               | startup activate                             | first contribution wins, else empty                                                                                                      |
| `AppCapabilities.SkillDefinition`                   | `plugin-routine/src/capabilities/registry-sync.ts:38-56` (atom + subscribe)                                                       | reactive                        | per contribution change                      | none for the read; barrier via `requires`                                                                                                |
| `AppCapabilities.Settings`                          | `plugin-settings/src/capabilities/app-graph-builder.ts:22,69` (tracked atom)                                                      | reactive                        | settings-root graph connector                | none — late plugin gets its node                                                                                                         |
| `AppCapabilities.Settings`                          | `plugin-registry/.../BaseRegistryArticle.tsx:73`                                                                                  | reactive                        | React render                                 | none                                                                                                                                     |
| `AppCapabilities.Settings`                          | `plugin-observability/src/operations/toggle.ts:23` (`getAll`)                                                                     | snapshot                        | operation invoke                             | low — per-invoke                                                                                                                         |
| plugin-local `*.Settings` singletons                | e.g. `plugin-deck/.../DeckLayout.tsx:22`, `plugin-markdown/.../react-surface.tsx:113` (`useAtomCapability`)                       | **sync read** (invariant throw) | React render                                 | owning settings module must be active before its surfaces mount                                                                          |
| `CrxCapabilities.Settings`                          | `plugin-crx/src/page-actions.ts:131` (`get`)                                                                                      | sync read                       | page-action invoke                           | `CapabilityNotFoundError` if not yet active                                                                                              |
| `AppCapabilities.Translations`                      | `plugin-theme/src/translator.ts:28,39-41` (atom + subscribe)                                                                      | reactive                        | re-registers per change                      | none; `ThemePlugin.ts:20` `requires` pulls all translation modules at startup                                                            |
| `AppCapabilities.Schema`                            | `plugin-client/src/capabilities/schema-defs.ts:18-52` (subscribe → `client.addTypes`)                                             | reactive                        | per contribution change                      | none for registration; `capabilities/index.ts:69` `requires` pulls every schema module at startup; schemas never unregister (`:20` TODO) |
| `AppCapabilities.Schema`                            | `plugin-kanban/.../KanbanArticle.tsx:36`, `plugin-space/.../SpaceHomeRecent.tsx:38`, `plugin-support/.../SupportCompanion.tsx:37` | reactive                        | React render                                 | none                                                                                                                                     |
| `AppCapabilities.Schema`                            | `plugin-assistant/src/operations/generate-home-suggestions.ts:44` (`getAll`)                                                      | snapshot                        | operation invoke                             | low, but result cached (TTL)                                                                                                             |
| `SpaceCapabilities.CreateObjectEntry`               | `CreateObjectDialog.tsx:81`, `DefaultProperties.tsx:29`                                                                           | reactive                        | dialog open / render                         | none                                                                                                                                     |
| `SpaceCapabilities.CreateObjectEntry`               | `plugin-space/.../app-graph-builder/extensions/database.ts:346-348` (untracked `getAll` inside reactive callback)                 | snapshot-in-callback            | schema-node action evaluation                | late entry missing until unrelated dep churns                                                                                            |
| `SpaceCapabilities.CreateObjectEntry`               | `plugin-space/src/commands/database/add.ts:52` (after forced `manager.start()` `:47`)                                             | snapshot                        | CLI command                                  | mitigated by forced pass                                                                                                                 |
| `Capabilities.PluginAsset`                          | `plugin-code/src/capabilities/app-graph-builder.ts:33,53` (tracked atom)                                                          | reactive                        | graph connector                              | none                                                                                                                                     |
| `AppCapabilities.AnchorResolver`                    | `plugin-review/src/capabilities/app-graph-builder.ts:40` (`getAll` in match/connector)                                            | snapshot-in-callback            | graph evaluation                             | late resolver won't invalidate node                                                                                                      |
| `AppCapabilities.AnchorResolver`                    | `plugin-assistant/src/hooks/useSelectionContext.ts:63`                                                                            | reactive                        | React render                                 | none                                                                                                                                     |
| `AppCapabilities.AnchorSort`                        | `plugin-review/.../CommentsArticle.tsx:158`                                                                                       | reactive                        | React render                                 | none                                                                                                                                     |
| `AppCapabilities.CommentConfig`                     | `plugin-review/src/capabilities/app-graph-builder.ts:37` (match) / `CommentsArticle.tsx:157`                                      | snapshot-in-callback / reactive | graph eval / render                          | yes for graph site                                                                                                                       |
| `AppCapabilities.Toolkit`                           | `plugin-routine/src/capabilities/layer-specs.ts:92` (re-read per `getToolkit()`)                                                  | snapshot per call               | tool resolution in process                   | none                                                                                                                                     |
| `AppCapabilities.AiModelResolver`                   | `plugin-assistant/src/capabilities/ai-service.ts:18-25` (folded into fixed layer)                                                 | **one-shot snapshot**           | startup activate                             | late resolver never enters `combinedLayer`                                                                                               |
| `Capabilities.Layer` / `Capabilities.Command` (CLI) | `app-framework/src/cli/cli.ts:86,96`                                                                                              | snapshot                        | after Startup event                          | by design — CLI composes once                                                                                                            |

### Summary

**Safe to defer providers of (all runtime reads reactive):** `ReactSurface`,
`AppGraphBuilder`, `Translations`, `Schema` (registration path), `SkillDefinition`,
`PluginAsset`, `Settings` (aggregation path), `AnchorSort`.
For these, deferral is an activation-policy change, not a consumer refactor — confirming
DESIGN.md structural finding 1 and extending it to four more families.

**Pinned to startup by snapshot/sync consumers (consumer refactor needed first):**

1. `Capabilities.LayerSpec` + `TraceSink` + `RemoteTraceMonitor` — hard one-shot fold in
   `process-manager-capability.ts`; the reason `#awaitProvidersInFlight` exists.
2. `Capabilities.OperationHandler` — reads are reactive everywhere, but three `requires`
   declarations (`ProcessManagerPlugin.ts:16`, `plugin-routine/capabilities/index.ts:28`,
   `plugin-deck/capabilities/index.ts:29`) pull every handler provider during the startup
   pass; plus the `layer-specs.ts:55` snapshot at slice materialization.
3. `AppCapabilities.AiModelResolver` — one-shot fold in plugin-assistant's ai-service.
4. Graph-builder callbacks that `getAll` untracked inside reactive closures
   (`CreateObjectEntry` in `database.ts:346`, `AnchorResolver`/`CommentConfig` in
   plugin-review) — late contributions don't invalidate the computed nodes.
5. Per-plugin singleton `Settings` atoms read via `useAtomCapability` (sync, throwing) —
   a plugin's settings module must activate before any of its surfaces mount, so a
   per-plugin cluster deferral must keep settings within the cluster, gated on the same
   signal as the surfaces.

**Structural insight:** a multi `requires` is itself an eager barrier — the scheduler pulls
every dependency-mode provider of that capability before the consumer activates, regardless
of how the consumer reads it later. Deferring any provider family therefore requires either
(a) removing/deferring the consumers' `requires` declarations, or (b) a scheduler change so
multi requires stop pulling inactive providers (with the LayerSpec-style snapshot consumers
fixed first).

## Appendix D — Operation-definition weight audit

Premise (ratified direction): an operation definition is schema + service _tags_ — importable by
any caller for free. This audit walks the browser-condition source graph of all 84
`Operation.make()` files (value imports only; `import type` skipped) and cross-checks each
finding against the chunks actually fetched at boot. Tooling:
`scratchpad/audit-opdefs.py` → `opdef-audit.json` (candidate for promotion to a CI budget check).

### Headline

**No definition file is lightweight today.** The lightest definition's transitive closure is
~576 workspace source files; the heaviest (blogger, script templates) reach ~1,700. Two causes:
a shared floor every definition pays, and per-definition leaks. Tree-shaking rescues some of it
(e.g. of `@effect/platform`'s 5.5 MB rendered, only 103 KB ships) — but the confirmed-shipping
leaks below all survive into the boot fetch.

### The floor (paid by every definition)

| sink                                                      | chain                                                                                                                                                                | ships at boot?                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `@effect/platform/HttpClient`                             | `Operation.make` → `@dxos/compute` **barrel** → `Header.ts`                                                                                                          | 103 KB of 5.5 MB (tree-shaken; fragile) |
| `bip39` (207 KB)                                          | any def importing another plugin's **main barrel** (e.g. `TableOperation` → `@dxos/plugin-space` index → `util.ts` → `@dxos/client` → halo credentials → seedphrase) | **yes**                                 |
| `@bufbuild/protobuf` (151 KB), `@dxos/wa-sqlite` (157 KB) | same client-chain                                                                                                                                                    | **yes**                                 |

### Confirmed-shipping per-definition leaks (fetched-at-boot verified)

| leak                                                                                                                                  | bytes at boot (rendered) | chain                                                                                                                                                                                                                                                                                            | fix shape                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | -----------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| SPARQL stack (`@traqula/*`, chevrotain; `fact-store` chunk is 1.5 MB minified)                                                        |                ~1,500 KB | `InboxOperation.ts:14` → `@dxos/pipeline-rdf` **barrel** → `FactStore` implementation                                                                                                                                                                                                            | pipeline-rdf needs a light tag/types entry; definition imports the tag                                                       |
| AI resolver stack: `@effect/ai-openai` 396 + `ai-anthropic` 181 + `@effect/ai` 44 + `fast-check` 298 (via `@effect/ai`'s `Arbitrary`) |                  ~920 KB | `InboxOperation` → `Mailbox.ts` → **`@dxos/plugin-connector` barrel** → `util/sync-routine.ts` → **`@dxos/plugin-routine` barrel** → `RoutineOperation` → **`@dxos/assistant-toolkit` barrel** → supervisor → `compute-runtime` → `@dxos/ai` **resolvers** → concrete OpenAI/Anthropic resolvers | definitions import `/types` subpaths, never plugin barrels; `@dxos/ai` resolvers must not be reachable from its type surface |
| CodeMirror: `@codemirror/view` 309 + `codemirror-lang-mermaid` 204                                                                    |                  ~510 KB | `MarkdownOperation` → `Markdown.ts` → `Settings.ts` → `ui-editor` types barrel → **`types/types.ts` value-imports `@codemirror/view`**                                                                                                                                                           | make the editor-type imports type-only; a `types/` file must not value-import an editor                                      |
| react-ui-editor full components barrel (76 `.tsx` files)                                                                              |                 (shared) | `CommentOperation` → **`@dxos/plugin-markdown` main barrel** → `MarkdownCapabilities` → `react-ui-editor` index → components                                                                                                                                                                     | cross-plugin definition imports go through `/types`                                                                          |

The `plugin.ts` static `export { XOperationHandlerSet } from './operations'` line (all 97 stubs;
sole external consumer is the node CLI) is the second door into the same graphs and falls out of
the same cleanup.

### Fix rules (the convention to enforce)

1. **Definitions import tags, never implementations.** Every service referenced by a definition
   (FactStore, AiService, …) must be importable as a `Context.Tag` from a chunk-free entry.
2. **Definitions never import a plugin's main barrel.** Cross-plugin type references go through
   `@dxos/plugin-x/types` (exists today; under-used) or `#types`.
3. **Type directories are value-free.** `types/*.ts` files must not value-import UI/editor/
   runtime packages (`ui-editor/src/types/types.ts` is the exemplar violation).
4. **`Operation` importable without the `@dxos/compute` barrel** (subpath or Header decoupled
   from `HttpClient`).
5. **Budget check in CI**: run the closure walk per definition file; fail on new heavy externals
   or closure growth. This matters _more_ once the `handles` declaration field lands — that
   substrate makes definitions imported even more widely, so their weight becomes the floor of
   every module spec.

### Recoverable estimate

Confirmed-shipping leak total ≈ **2.9–3.4 MB rendered (~2–2.5 MB wire)** out of the 10.4 MB
eager core — on top of, and independent from, the family-deferral work. Combined with the
`ResetDialog` lazy-import fix (~2 MB: emoji-mart, motion, mdast/mermaid, ajv/zod via
react-ui-form) this roughly halves the non-framework share of the eager core.
