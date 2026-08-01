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
[`AUDIT-modules.md`](./AUDIT-modules.md). Useful starting
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

## Proposal: feature-scoped activation events (2026-08-01, for review)

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
