# Startup latency — demand-driven activation

Scoping document. This lays out **what to go deep on**, not the deep dive itself. Each phase names
the change, the substrate it needs, the prerequisites, and the specific question to answer before
committing to it.

## Context

The capability-dependency activation refactor is **perf-neutral vs `main`** (branch-vs-main profiles
taken 2026-07-30 on real hardware: deltas of −7%/+2%/+8% across dev-cold/cold/warm-cold, module
count 460 vs 459, bundle bytes ~identical — all inside single-sample noise). It is not the cause of
any regression and is green to land.

The real regression is growth: both branch and `main` are **~20–24% slower on cold `navToReady`**
than the 2026-06-16 baseline, explained by **~60 more modules and ~2–3 MB more transferred bytes**
from plugins that landed on `main` over six weeks. That is a structural trend, not a bug — it
recurs every time a plugin is added, and it will keep recurring.

The refactor is what makes this tractable. The module population is now uniform and auditable in one
probe (`globalThis.composer.manager.getModules()`), every module declares `requires`/`provides`
statically, and event-mode activation already exists as a deferral mechanism.

The prior module audit is [`composer-app/AUDIT.md` §12](../../../packages/apps/composer-app/AUDIT.md)
with full per-module lists in [`AUDIT-modules.md`](../app-framework-capability-activation/AUDIT-modules.md).
Its snapshot (432 modules; ~460 today) is the starting inventory.

## Guiding principle

Don't make startup do the same work faster — make it do **less work**. Convert eager activation into
demand-driven activation.

The recurring design constraint across every phase below is the same:

> **The demand signal must be declared statically, in the module spec, so the framework can pull the
> one chunk it needs without loading all of them to find out which one it needs.**

Today most "what does this module handle" information lives _inside_ the module body's contributed
value — the surface's role, the operation the handler serves, the graph paths a builder owns. That
is precisely backwards for lazy loading: you must load the chunk to discover you didn't need it.
Most of the work below is hoisting that declaration from the body to the spec.

## Phase 0 — measurement (prerequisite; do not skip)

§12 already flags this: flips must be ordered by measured cost, and the 1,128–1,141 ms
`AppGraphBuilder` cluster suggests **fan-out concurrency, not per-module weight**, may dominate. If
that's true, deferring individual modules buys far less than the module count implies.

1. **Per-module activation timing** in the startup pass, exported from the profiler.
2. **Byte attribution per module/plugin** — module count and transferred bytes are different axes
   and the June regression moved both. Know which one you're optimising.
3. **Separate concurrency effects from per-module weight.** Is the cluster slow because 20 builders
   are expensive, or because they fan out against a saturated main thread?
4. **Two metrics, not one.** Deferral _moves_ cost; it does not delete it. Track `navToReady`/TTI
   **and** first-interaction latency on every deferred path. A phase that improves TTI by 400 ms and
   adds 300 ms to first document-open is probably still right, but that must be a decision, not a
   surprise.
5. **A per-commit trend line.** The 6-week 20–24% drift accumulated invisibly. Whatever else comes
   out of this, a regression signal that fires on plugin addition is the durable win.
6. **Pick the headline metric now** — `profilerTotal` is not it; time-to-workable-app is.

## Phase 1 — post-paint batch (cheapest, lowest risk)

Add a framework `AfterStartup` event fired by `useApp` after first paint/idle; flip cold providers
onto it. Per §12: SkillDefinition (17), CreateObjectEntry (26), non-shell surfaces, PluginAsset if
chunked. Each flip is one `activatesOn:` line in the module's maker options.

Improves TTI without changing total work, and needs no new substrate — the mechanism already exists.
Do this first because it calibrates how much the later, harder phases are worth.

**Question to answer:** does anything read these registries synchronously during first paint? A
late-contributed multi capability is fine for reactive consumers and fatal for one-shot snapshots.

## Phase 2 — operation handlers on demand

38 providers, pinned to startup by three eager barrier consumers (`routine.RegistrySync`,
`deck.NotificationTracker`, `processManager.ProcessManager`) that topological ordering forces to
wait for _every_ provider. Most operation handlers are never invoked in a session.

**Substrate needed:** a static operation → handler-module mapping. This is the crux. Today the
invoker cannot know which module serves an operation without loading the handlers. Options to
evaluate: declare the served operation ids in the module spec; derive the mapping at build time; or
key handlers by operation id in the barrel.

**Prerequisites** (from §12): move `RegistrySync` and `NotificationTracker` to event-mode on
`SpacesReady`; audit whether `ProcessManager`'s one-shot `LayerSpec` snapshot genuinely needs eager
collection. The manager already has `_pullDependencyProviders` for the pull itself.

**Question to answer:** what is the acceptable latency for a first invocation that must load a
chunk, and does any caller assume handler resolution is synchronous?

## Phase 3 — role-gated surfaces

46 `ReactSurface` providers. §12 established that **nothing `requires` `ReactSurface` at startup** —
they sit on the critical path only because dependency-mode roots auto-activate, and they're consumed
reactively. This is the phase closest to "load services per role": if no `Surface` with role X is
rendered, role X's chunk should never load.

**Substrate needed:** the role must be declared in the module spec, not discovered from the
contributed value. Plus a surface-miss path in the `Surface` component — render a placeholder,
resolve the provider asynchronously, swap in.

**Hazards:** layout shift/flash on swap; deck-restored planks that reference a role whose provider
hasn't loaded; and surfaces whose absence is currently indistinguishable from "no provider exists".

**Question to answer:** can role be made a static property of every surface module, or is there a
class of surface whose role is computed? The exceptions determine whether this is a clean rule or a
rule plus an escape hatch.

## Phase 4 — type-presence gating for content plugins

§12 calls this the biggest win: ~26 content-type plugins each contribute surface + graph-builder +
operation-handler + create-object chunks that matter only when a document of that type exists or
opens.

**Substrate needed:** a companion event fired by plugin-space when enumerating types in ready
spaces. `SpaceEvents.TypeAdded` is the working precedent (`table.on-type-added`) but only fires on
_add_ operations — it does not cover types already present at boot, which is the common case.

**Question to answer:** where does the type inventory of a ready space come from, and how early is
it trustworthy? This gates the whole phase.

## Phase 5 — graph builders on demand

20 providers, and the one you flagged as hardest. The graph is built eagerly because the navtree
renders it; making it demand-driven means resolving a node's owning builder without loading all
builders.

**Possible substrate — worth checking first:** main's `5585ec89` introduced `urlKey` declarations
plus `PathResolution.buildUrlKeyTable` / node→extension provenance on the `GraphBuilder`. That is
exactly the "which builder owns this path" mapping this phase needs. The open question is whether
that table is _statically declarable_ or is currently **derived from already-registered extensions**
— if the latter, it doesn't avoid the load and the real task is hoisting `urlKey` from the
registered extension to the module spec.

**Question to answer:** the above. Answer it before sizing this phase; it decides whether Phase 5 is
cheap or a redesign.

## Explicitly staying eager

Per §12 tier 4, and worth re-confirming rather than re-litigating:

- **Schema** — must precede ECHO materialization of existing objects; value-only, no chunk to save.
  (Per-type gating could revisit this under Phase 4, but only there.)
- **Translations** — no chunk to save; deferral risks untranslated-key flashes.
- **Settings** — their atoms are read by sibling modules; defer only per-plugin, under Phase 4.

## Non-module axes

Module count is not the only thing that regressed.

- **Bundle bytes** (~2–3 MB since June). Deferring activation doesn't shrink the entry chunk unless
  the module was chunk-bearing — §12 counts 234 chunk-bearing of 359 startup roots, so ~122 are
  value-only and deferring them buys nothing in bytes.
- **Client/network init.** Container profiling showed `observability.ClientReady` (~7.8 s) and
  `client.Client` (~5.9 s) dominating, which is environment-bound IO rather than module activation.
  Confirm the split on real hardware before assuming module work is the bottleneck — if client init
  dominates, all five phases above are second-order.

## Known hazards (prior art — read before implementing)

1. **AUDIT.md Phase 4 was attempted and reverted** (`c0e35cd1d2`). Bounded concurrency +
   `Effect.yieldNow()` in the activation graph showed a ~1.3 s win that turned out to be run-to-run
   noise, while the yields **amplified a pre-existing warm-reload race** (System Error dialog in
   60–90% of warm reloads). The standing lesson: _any yield/concurrency change inside the activation
   graph must land alongside a root-cause fix for the warm-reload race._ That race is still
   un-root-caused and is a prerequisite for anything touching activation scheduling.
2. **One-shot multi snapshots break under deferral.** Consumers that snapshot a multi capability
   (LayerStack is the known one) won't see late contributions. Every phase that defers a provider
   must confirm its consumers are reactive.
3. **Deferral converts startup latency into interaction latency.** See Phase 0 metric 4.
4. **Warm vs cold diverge.** The warm path has its own flake profile; don't validate a deferral phase
   on cold alone.

## Sizing

§12's rough estimate: tiers 1–3 (Phases 1–3 here) remove ~130 of the 234 chunk-bearing startup
activations from the critical path. Treat that as an upper bound until Phase 0 confirms whether
per-module weight or fan-out concurrency dominates.

## Sequencing

Phase 0 → Phase 1 (calibrates the rest) → Phase 2 and Phase 4 in parallel (independent substrates) →
Phase 3 → Phase 5 (gated on its substrate question). The warm-reload race is a prerequisite for
anything that changes activation _scheduling_ rather than activation _membership_.
