# Tasks — startup latency (demand-driven activation)

_Resume: PR #12415 (draft, targets `claude/resume-app-framework-activation-ycp7vv`) is
feature-complete and gated — drive it to review/land. Uncommitted: none. Last: demand-gated
plugin start events (surface activation is the signal; graph builders and settings ride the
feature they belong to), plus both CI budgets — `composer-app:check-boot-budget` (static, 30
entries / 4.75 MB, today 20 / 4.44 MB) and `composer-app:check-startup-budget` (runtime, median
modules-at-ready over 5 warm-cold repeats, budget 300, today 291)._

## Open follow-ups

The whole list, in priority order. Everything below this section is the record of how the work
got here — checkpoints, measurements and findings, not work items.

- [ ] **Space home resolves to Not Found on reload of the bundled app** (user-reported,
      2026-08-05, seen on the built app — not dev). A regression of the same shape as "Fix
      not-found redirect on load (URL restore races graph)", which this project already fixed once.
      Prime suspect is the idle default becoming real in `1ebf33e3b8`: `UrlHandler` is on the
      startup pass and `requires` `AppCapabilities.AppGraph`, but `AppCapability.appGraphBuilder`
      defaults its modules to **Idle**, so boot-time URL restore runs against a graph whose builders
      have not contributed their nodes yet and the space-home path does not resolve. Confirm by
      sampling `getActive()` for `…module.AppGraphBuilder` against the restore, the way
      `blank-gap.spec.ts` did for the deck root — do NOT fix by adding `requires` to the reader,
      which demotes the reader into the provider's wave (measured, see the `df55880ddb` revert).
- [ ] **Post-merge check sweep** — the only item blocking PR #12415. Detail under
      [Later / standing](#later--standing).
- [x] **Wire `check-boot-budget` into CI** — a `Check boot budget` step after `Bundle` on the `e2e`
      job (user-directed placement, 2026-08-04). **Caveat to revisit:** `e2e` is gated to
      main/changeset-release/dispatch, so the check runs post-merge and does NOT gate the PR that
      introduces the regression — which is the case it was motivated by. Promoting it to its own
      always-on job is a small diff when that becomes worth the bundle minutes.
- [x] **Flip the default `activatesOn` from `Startup` to `Idle`** — landed with the mandatory
      second half (`#isBaselineWave` is now `Startup ∪ Idle`). `Idle` moved to
      `core/activation-event.ts` beside `Startup` because `normalizeActivation` defaults to it and
      core cannot import `common` without closing a cycle. 237 of ~460 modules changed wave; the
      full repo test suite showed **no activation-related fallout outside app-framework's own
      tests** (the two `react-ui-form` failures were a `better-sqlite3` native-load flake — with
      `MOON_CACHE=off` both defaults pass 64/64). Test fallout was one shape: `start()` forks the
      idle wave rather than awaiting it, so assertions need an `Idle` barrier first.
- [x] **Collapse `ActivationSpec` to one mode** — the headline was already done: `ActivationSpec`
      carries no `mode` discriminator, `#pullDependencyProviders` is already wave-scoped, and the
      `requires?`-optional fold-in had landed (both `as Requires` casts are gone). Shipped the
      cleanup it was meant to unlock: deleted the duplicate `ActivationEvents.PluginStart` wrapper
      (one caller, now on `ActivationEvent.pluginStart`) and the startup harness's dead `mode` axis
      — it read `spec.mode ?? 'unknown'` on a field that no longer exists, so a documented
      classification axis had been recording `unknown` for every module in every startup report.
- [x] **Move the `Idle` fire out of React into the activation scheduler** — already landed; the
      ledger entry described the pre-fix state. `ActivationScheduler.#activateWhenIdle` forks a
      tracked daemon behind `whenIdle` (`core/plugin-manager/idle.ts`), the feature-tested
      paint-then-idle Effect with an `Effect.void` fallback for node/workerd. `useApp` holds no
      idle effect. `activateDemandGatedModules` keeps its `Idle` element deliberately: the daemon is
      forked, so a caller asserting as soon as `start()` returns would otherwise race it — the fire
      is an ordering barrier, idempotent against the wave guard.
- [ ] **Make `activatesOn` genuinely optional so the scheduler goes event-agnostic** (user-raised,
      2026-08-05). `normalizeActivation` folds an omitted gate into a concrete `Idle`, destroying
      the distinction between "the author chose Idle" and "the author said nothing". The scheduler
      then reconstructs that lost intent by matching event NAMES — `#isBaselineWave` (Startup ∪
      Idle, for provider pulls) and `#declaresStartup` (eligibility for a newly enabled plugin's
      incremental pass) are both workarounds for it, and both are mine. Two module attributes are
      hiding here and were never modelled: _pullable on demand_ (no opinion — the absence of an
      event, not an event) and _required at boot_. Model them directly, let `undefined` mean
      pullable, and have the `Idle` wave sweep up whatever is still unactivated rather than being
      the default value; the scheduler then names no event but the host-designated boot event.
- [ ] **Eager-core UI laziness** — swept and attributed; `ResetDialog` is already lazy and
      emoji-mart is gone. Two edges remain, each ~250 KB and neither fixable from our own imports:
      fast-check via `@effect/ai`'s `Prompt` -> `effect/Arbitrary`, and the `react-aria` umbrella
      via `react-aria-components`. Detail under
      [Wave 3](#wave-3--eager-core-ui-laziness-audit).

- [x] **A12 — plugin body imports were serialized by `lazyLoadLock` (2026-08-17; landed in
      PR #12656, lock REMOVED).** `Plugin.resolveLazy` held a 1-permit semaphore around every body
      `import()` (added inside the Effect-4 migration `a3b6ef05f2` for WebKit bug 242740). Measured
      on chromium: 33 bodies loaded strictly back to back (span 2.75 s ≈ sum) — the whole startup
      pass — and the 7 core plugins, queued first at 391 ms, starved behind content plugins until
      ~2.8 s. Research: the bug is https://bugs.webkit.org/show_bug.cgi?id=242740, fixed by
      https://github.com/WebKit/WebKit/pull/57827 (311236@main, 2026-04-14), in Safari 27 (beta as
      of 2026-08-17; not in 26.6). Build-graph analysis: the only TLA chunk any plugin body reaches
      is `boot-8` (both automerge wasm glue modules), which `main.tsx` statically imports — so it is
      fully evaluated before any body `import()` and the race is unreachable on the bundle.
      Verified: 9/9 lock-off cold runs on Playwright's pre-fix WebKit (webkit-2227, Dec 2025), 226
      modules and all 14 space modules every time. Lock and its `webkitCheck` deleted outright, with
      no note at the call site (user-directed: the removed code needs no comment). A/B/A/B chromium
      3+3+3+3: `profilerTotal` 3135 → 2621 (−514 ms, ranges disjoint), `navToReady` 4733 → 4255,
      core plugins done at 793 ms instead of 3397; webkit cold −380 ms. Composer's `syncWasmInit` is
      gone: #12684 replaced it with `slimWasm`, which resolves the three automerge packages to their
      `slim` entrypoints and calls `initAutomergeWasm()` per realm, so the bundle carries no
      top-level await at all and the bug is unreachable by construction rather than mitigated. Its
      comment now carries both links. No retire-when-Safari-27 TODO: `slimWasm` also earns its keep
      on bundle size and single-wasm-instance grounds, so the WebKit fix does not retire it. Files:
      `app-framework/src/core/plugin.ts`, `composer-app/vite.config.ts`.
- [ ] **A5/A15/A11 — leaves lazy by construction** (2026-08-17). Census over 45 plugins: surface
      indices are 25.5 MB heavier than operation indices; ~75% is `react-ui-form` → CodeMirror /
      mdast / motion / syntax-highlighter reached through a STATIC component import in a descriptor
      file (15 plugins at ~1.4 MB each; schemas are ~3%). Same disease in `ReactRoot` (support and
      space roots: 1.5 MB closures on the Startup pass) and in 4 graph builders (transcription 881 KB
      via `<Mic/>` in `render:`, review 437 KB via `createComment` in `data:`). One-line leaf-lazy
      each: kanban surface 1415 → 59 KB, support root 1514 → 9 KB, space root 1467 → 43 KB,
      transcription builder 881 → 34 KB, review 437 → 71 KB. Fix by construction, as
      `OperationHandlerSet.lazy` already does for handlers: `Surface.create` takes a component
      LOADER; ReactRoot renders a lazy component; graph action `render:` takes a component loader
      and `data:` a handler loader (extension body lazy is OPT-IN — 61% of bodies do not run
      pre-ready in a fresh profile, but bodies are 0.6–7.7 KB so a chunk each is a round-trip for
      nothing). Then the 15 static `#containers` barrels fall out.
- [ ] **A7 — `react-ui-form` statically drags the editor stack (~1.4 MB) and sets the pre-ready
      byte floor.** After leaf-lazying both 1.5 MB roots, transferred-before-ready was UNCHANGED at
      22.8 MB under a 4G profile: the editor still arrives pre-ready by another route. Text/markdown
      field must load its editor lazily; acceptance = transferred bytes at the 4G profile.
- [ ] **A10 — definition modules must be light** (`types/**`, `*Operation.ts`, schema modules).
      Assistant's builder is 84 ch / 804 KB beyond boot and moving `Chat`/`RunInstructions` to
      light subpaths changed nothing: `AssistantOperation.ts` imports `AiService` from the
      `@dxos/ai` barrel for a service TAG, `compute/types/Skill.ts` imports `McpServer`,
      `@dxos/conductor` has no `./Sequence` subpath. Same reason assistant's OPERATION index was
      the census outlier (756 KB vs 4–60). Light subpaths for tags/schemas/op-defs; a lint that
      `src/types/**` imports only effect/echo/keys/other types/declared light subpaths.
- [ ] **A4 — deprecate `@dxos/app-toolkit/ui` barrel; subpath per component/namespace**
      (user-directed 2026-08-17, Radix-style). Importing `AppSurface` through it hoisted 14 chunks /
      23 KB onto support's body; via a dedicated `./AppSurface` subpath, 4 chunks / 4.6 KB. Every
      surface index pays ~17 KB for this barrel.
- [ ] **A1–A3 — makers become inline for `Startup`-gated index modules** (`Settings`,
      `OperationHandler`; user-directed: change the makers TO the inline form, not an optional
      variant). Support: −133/−357 ms (h1), −401/−522 (h2), body +1.3 KB, boot graph +0; `HelpState`
      −73/−81 more. Aggregate codemod over 22+14 modules: ~−110 ms median, noisy, and
      `modulesAtReady` went nondeterministic (222–226; the settle loop reorders) — name those before
      shipping. Do AFTER A12 (with bodies fetched in parallel the extra bytes cost nothing).
      Constraint: the inlined body's static imports must be already-loaded or light (a UI barrel is
      neither — inline4 regressed +102/+458 through `./ui`).
- [ ] **A14 — `activatesOn: Idle` is not a deferral.** With cause instrumentation, 226 of 226 module
      activations in the full run had `parentEvent = event.startup` — all Idle-declared modules
      included; `event.idle` dispatches after everything already ran. Moving a module to Idle only
      moves it out of `profilerTotal`, never off the ready path. If a genuinely-late wave is wanted
      it must be built (post-first-interactive event; narrow the baseline rule so Idle providers are
      pulled only when required). Related open item above ("Make `activatesOn` genuinely optional").
- [x] **A13 — activation-cause / builder-body marks in the startup profile** (2026-08-17, landed).
      `module-cause:<module>` at `module:start`, carrying the activating event in `detail.event`
      (a DXN has colons of its own, so it cannot ride in the mark name), and
      `graph-body:<kind>:<id>` the first time an extension body runs; the profiler
      collects them as `moduleCauses` / `graphBodies` beside the catalog's pre-existing
      `plugin-load:` → `pluginLoads` (which was already in the report, unread until today), and the
      harness carries all three. Always-on like the existing `module:*` marks. Throttled-cold
      profile env-tunable (`DX_HARNESS_LATENCY_MS/_DOWN_MBPS/_UP_KBPS/_CPU`, Fast 3G default).
      One run: 226 causes (all `event.startup` — see A14), 20 bodies, 33 loads.
- [ ] **A8 — harness: `pluginSet` column in `appendBenchmarkRow`; keep the env-tunable throttle
      profile** (`DX_HARNESS_LATENCY_MS/_DOWN_MBPS/_UP_KBPS/_CPU`, Fast 3G default). Fast 3G + 2×
      CPU cannot reach ready within `waitForReady`'s 300 s on the current bundle (three attempts,
      each exactly 300 s); a 4G profile (40 ms / 10 Mbps / 2×) completes at profilerTotal 5.4 s,
      navToReady 12.4 s — everything localhost hides is 2–3×, and the serial body queue is 4.6 s.
- [ ] **B9 — `system` tag scope** (product). 21 plugins are `system`-tagged and always enabled;
      they are 1754 of the 2978 ms serial body floor. atproto's body import is the largest of ANY
      plugin (576 ms) and it is system by tag only; routine 200, preview 74, support 37 likewise.

Deliberately NOT tracked as tasks: the measurement-discipline items (boot waterfall, lab TBT,
time-to-first-meaningful-action, RUM, per-commit trend line) are one blocked thing, not five — they
need a fixed CI runner that does not exist, so they live under
[Phase 3](#phase-3--measurement-discipline--activation-optimization-directives-2026-07-31) as a
single item. Storybook's demand-gating fidelity gap, the cold `Client.initialize()` cost, and the
warm-reload race are **findings** — constraints to respect when reading results, with no action
attached.

## Critical path of navToReady (warm-cold, in-container; attributed 2026-07-31)

All ~250 chunks are modulepreloaded at ~32 ms — network is NOT on the path; the path is
main-thread evaluation + Client init. Sequence (representative run):

1. **0 → ~2.6 s** — HTML + main-bundle fetch/parse to `main:start` (FCP ~370 ms). Lever:
   main-closure bytes (wave-3 sweep, ResetDialog lazy).
2. **~2.6 → ~4.3 s** — bootstrap + plugin-definition enables. Was 1.75 s sequential; now
   ~1.4 s at concurrency 8 (lever 3 landed). Residual lever: streaming start.
3. **~4.4 → ~8.5 s** — round-1 fan-out (~300 modules, pure evaluation) + **`Client.initialize`
   = the long pole**: imports 0.3 s, `createClientServices` ~0, **`_open()` 3.2 s** (worker
   spawn + HALO identity + ECHO open, contending with module evaluation). Ends exactly at
   `spaces-ready`. Levers: SDK `_open` split/pipelining; fewer startup evaluations.
4. **~8.6 → ~9.5 s** — dispatch residual (~0.9 s, was 3.4–4.4 s before lever 2): the
   identityCreated wave + ProcessManager pull gate the spacesReady wave start.
5. **~9.5 → ~12.4 s** — spacesReady wave (~2.9 s): evaluation of heavy chunk graphs
   (space.Repair, BeaconServiceModule, TriggerRuntimeController, SpaceReplicationProgress,
   thread/calls AppGraphBuilder — each ~2.6 s under contention). Lever: defer non-critical
   members to idle; shrink closures.
6. **~12.4 → ~13.5 s** — ClientReady wave + React render to `first-interactive`.

navToReady ≈ first-interactive + harness overhead; in-container wall clock is
contention-bound (±1 s noise), so segment boundaries — not totals — are the signal here.
Real-hardware runs still owed before claiming user-facing numbers._

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
- Per-commit startup trend line — BENCHMARKS.md appends per local run; CI wiring (one row per
  merge, fixed runner, **enabled-tier recorded per row**) still to be designed. Blocked on the same
  fixed runner as everything else in Phase 3; tracked there, not here.

Questions the instrumentation must answer (exit criteria in DESIGN.md):

- [x] Fan-out concurrency vs per-module weight — **concurrency, decisively** ([DESIGN.md appendix A](./DESIGN.md#appendix-a--phase-1-map--measured-startup-structure-and-per-module-classification)):
      395-module round-1 fan-out, 81× overlap, per-module durations are a contention plateau;
      weight matters only on the critical chain (Client / ProcessManager / ClientReady)
- [x] Client/network-init vs module-work split — measured in-container (client init material,
      not dominant; the "client init dominates" container finding was a dev-server artifact);
      **real-hardware confirmation still owed** (open item in DESIGN.md appendix A)

The map itself — probed live from `manager.getModules()` on the production preview build
(456 modules); supersedes the 2026-07-19 starting inventory (dropped; see git history):

- [x] Classify all 456 modules ([map.json](./map.json)): demand-gated 174 / stay-eager 132
      (value-only) / cluster-with-plugin 96 / startup-essential 43 / existing-event 11;
      `unknown` = 0 by family-rule construction (spot-check buckets noted in DESIGN.md appendix A)
- [x] Consumer-kind audit per provided capability → [DESIGN.md appendix C](./DESIGN.md#appendix-c--consumer-kind-audit--multi-arity-capabilities)
- [x] Seed-hypothesis open questions resolved → [DESIGN.md appendix B](./DESIGN.md#appendix-b--demand-signal-substrate--seed-hypothesis-answers): surface roles
      statically extractable (need `roles` spec field + miss hook); operation→module map needs
      `handles` field + invoker miss hook (the key-embeds-plugin naming convention is
      demonstrably unsound); urlKey table derived-not-static but every key is a literal
      (hoistable); TypeAdded cannot cover pre-existing data → `TypePresent` watcher (one
      TypeSelector query per ready space)
- [x] Confirm or refute the §12 stay-eager list — **confirmed** (Schema, translations,
      PluginAsset value-only; Settings bound to their plugin cluster by sync-read consumers)

New findings beyond the planned questions (details in [DESIGN.md appendix A](./DESIGN.md#appendix-a--phase-1-map--measured-startup-structure-and-per-module-classification)):

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
eager; per-family verdicts and measured sizing in DESIGN.md appendix A and the target table). Waves in order:

### Wave 1 — activation-event deferral of the four families (~6.1 MB / 431 chunks off eager boot)

Move `operationHandler`, `reactSurface`, `createObject`, `skillDefinition` off startup
(131 chunk-bearing modules of 244 total; combined removal measured at 6.1 MB of the 21.5 MB
boot JS). Substrate per DESIGN.md appendix B:

Implementation (2026-07-31, commits 7faebffdab + ebb39a92e3) took a safer shape than the
pre-authored plan: instead of a per-module declaration field, an app-supplied
**`activationPolicy`** on `PluginManager` parks whole families at registration (module
definitions stay runtime-neutral; CLI/workerd unaffected), and handler loading became
**per-operation** via `OperationHandlerSet.keyed` (user direction — not per plugin).

- [x] Activation-policy substrate: `ManagerOptions.activationPolicy` +
      `Plugin.withActivatesOn`, applied at `_addModule`; enable-path uses effective modules;
      pending-reset refires already-fired demand events for late-enabled plugins (3 unit tests)
- [x] operationHandler → **per-operation**: `OperationHandlerSet.keyed([definition, loader])` —
      definitions enumerate chunk-free, resolution imports one operation's module; all 58
      operations barrels codemodded; `getHandler`/`getHandlerByKey` keyed fast-path;
      `withResolver` demand hook (pull by plugin prefix → all-plugins fallback) wired in the
      process manager + deck notification tracker; registry mirrors (routine registry-sync,
      operations-to-registry spec, doctor diagnostics) read definitions, not bodies. The three
      `requires` barriers needed NO un-pinning: policy-parked providers are event-mode, so the
      soft edges no-op
- [x] reactSurface → per-role events (2026-07-31): `SurfacesRequested(role)`
      composite-key event; `surface` maker `roles` option derives the `oneOf` gate;
      `SurfaceComponent` fires the role's event on mount (per-manager dedup) and
      `useIsAvailable` fires on miss (self-healing — the callback is non-reactive, a later
      check sees the loaded module); 49 modules' roles codemodded from a live-probe ground
      truth (`roles-probe.spec.ts` → surface-roles.json), not hand-extracted. **Validated:
      cold profilerTotal 7,566 → 6,588 median (−52% vs the 13,613 baseline), navToReady
      12,951 → 12,282, boot activations 373 → 331 (−42); warm-cold 6,613 / 11,592. Bytes
      flat at 31.1 MB — deferred surface chunks are re-fetched by the boot-visible-role
      pulls after ready and/or shared with still-eager closures, so the surface win is
      critical-path time, not wire bytes (the byte win needs wave 2/3). e2e basic suite
      green (reset-device fails on container-blocked signaling, pre-existing); the
      demand-load path is unit-tested (gated module loads on first Surface render;
      availability miss self-heals).** Surfaced and fixed a latent scheduler race
      (492a7f4675): an event wave resolved without awaiting matched modules already loading
      in a concurrent wave, so a demand pull racing another pull of the same module failed
      its one-shot lookup retry with NoHandlerError (create-space dialog never opened —
      caught by the basic e2e suite, 2-of-3 failing; 3-of-3 green after the fix, regression
      test fails on the unfixed scheduler). Known shape
      limits, deliberate for this round: (a) a module binding any boot-visible role
      (statusIndicator etc.) loads at boot — per-role module SPLITS are the follow-up
      refinement; (b) opening any article pulls all article-binding surface modules — the
      React.lazy component split (ratified secondary axis) is the fix; (c) plugins not
      enabled at boot have no declarations and stay eager-on-enable; (d) plugin-progress
      contributes its surface via a value module (stays eager, boot statusIndicator anyway)
- [x] createObject → `SpaceEvents.CreateObjectRequested` fired from CreateObjectDialog,
      DefaultProperties, and schema-actions evaluation (untracked `getAll` → tracked read)
- [x] skillDefinition → `ActivationEvents.SkillsRequested` fired from chat-service resolution
      and the routine editor; headless routines covered: the handler-provider layer slice pulls
      skills + all handlers at materialization and exposes a live view (snapshot fix included)
- [x] REWORKED per user direction (db867c8116 + a4aedc7f71): demand gates are the
      **module-spec default** — the makers declare them (`operationHandler` on
      `OwnOperationHandlersRequested` via `OWN_PLUGIN_SPECIFIER`, resolved against plugin meta
      at `resolveModule`; `skillDefinition` on `SkillsRequested`; `createObject` on
      `CreateObjectRequested`) and the `activationPolicy` host indirection is REMOVED. No core
      exemption: boot-time operations pull their plugin's thin keyed barrel on first invocation.
      Foreign-namespace handlers gate additionally on that namespace's event
      (deck/simple-layout/spotlight → layout, markdown → collaboration, registry → settings) so
      targeted pulls need no flood; the trigger-dispatcher layer slice uses a per-key resolver
      (its earlier blanket pull re-loaded everything at boot — caught by the harness); toolkit
      materialization fires SkillsRequested for headless routines; the CLI create-entry snapshot
      fires the create event
- [x] Ablation (2026-07-31, reverted): eager handler sets + keyed bodies — the "keyed barrel is
      a trivial map" hypothesis measured FALSE today: cold profilerTotal 9,803–10,301 (vs 7,566
      gated), navToReady 14,514–15,603 (vs 12,951), +1.6 MB wire, +34 module activations. The
      barrels still drag their operation-definition closures (the wave-2 ~576-file floor), so the
      gates stay until definitions are thin. **Wave-2 exit criterion: re-run this ablation; when
      the delta is noise, flip handler sets eager and delete the handler demand machinery**
      (foreign-namespace gates, per-key resolver pulls, `OperationHandlersRequested`)
      **RE-RUN on thin definitions (2026-07-31, after the full wave-2 batch; reverted again):
      still a real regression — cold +1.6 s profilerTotal (7,585 → 9,206) / +1.3 s navToReady /
      +34 activations / +0.4 MB; warm-cold +1.9 s / +2.8 s / +86 activations / +2.2 MB (a
      persisted identity fires the IdentityCreated/spaces chains, which eager registration
      drags into the boot window). Diagnosis CHANGED: round 1's cost was definition bytes
      (fixed); the remaining cost is the round-1 fan-out CONTENTION — extra activations cost
      wall-clock even when thin. Eager sets are byte-viable now but not activation-viable;
      the path there is scheduling (fan-out contention), not further definition thinning.
      Gates remain the shape.**
- [x] Validated (fixed spec-default build): cold profilerTotal **13,613 → 7,566 ms (−44%)**,
      navToReady **18,481 → 12,951 ms (−30%)**; warm-cold profilerTotal −45%, navToReady −32%;
      **83 modules gated** (34 handler + 27 create-object + 18 skill + 4 event-mode); boot pulls
      exactly client/observability/deck handler barrels; e2e create identity/space/document all
      green through the demand-pull loop. `reset device` e2e fails in-container on unreachable
      signaling (no deferral signature) — re-verify on real hardware. Known benign: modules
      declared via `inlineModule` instead of the makers (e.g. trip.SkillDefinition, value-only)
      keep their own eager behavior. First-interaction-latency probe still owed

### Wave 2 — lightweight operation definitions ([DESIGN.md appendix D](./DESIGN.md#appendix-d--operation-definition-weight-audit))

No definition file is lightweight today (~576-file floor; confirmed-shipping leaks ≈ 2–2.5 MB
wire in the eager core). Fix rules 1–5 in the audit doc:

**Batch 1 landed (6017b2ce78, 2026-07-31): boot fetch 31.1 → 28.8 MB (−2.3 MB), −40 requests;
in-container timing unchanged within the contention plateau (no phase-level regression —
sub-second deltas need the real-hardware run).** Floor now ~445 files (was ~576): every
definition pays only @effect/platform (tree-shaken via compute barrel) + date-fns + semver.

- [x] Tag/implementation split for pipeline-rdf `FactStore` — pure tag at
      `@dxos/pipeline-rdf/fact-store`, sqlite/memory layers moved to `FactStoreLive` (~18 call
      sites); SPARQL stack out of every definition closure. Also `AnthropicWebSearchTool`
      moved off the `@dxos/ai` barrel into `resolvers/anthropic` — its
      `@effect/ai-anthropic/Generated` value import (181 files) reached every definition via
      compute → Skill → @dxos/ai
- [x] Definitions and plugin `meta.ts` bypass the `@dxos/app-framework` barrel — 33 definition
      files + all 97 metas import from `/Capability` and `/Plugin` subpaths; the
      compute-runtime/edge-client chain (bip39, protobuf, wa-sqlite) left definition closures
      (DeckOperation 580 → 452 files)
- [x] Definitions never import a plugin's main barrel — ALL 19 offenders resolved
      (2026-07-31, dd867248cc + 32fc405b5d): (a) the `@dxos/app-toolkit` barrel floor fell
      to the subpath migration (types files import `/AppAnnotation` etc.); (b) cross-plugin
      main barrels swapped to `/types` at 13 sites (connector×6, markdown×3, inbox, chess×2,
      game×2); (c) the react-ui "value imports" in types dirs were inline-`type` imports —
      elided at emit, an audit artifact (the script now skips all-inline-type statements;
      verified against the built chunk-types.mjs: markdown's /types entry emits no
      codemirror/react edges). Corrected audit: **zero definitions with UI in closure**;
      remaining heavy rows are the script/sandbox function skills and assistant-toolkit
      skill definitions (~600–900 files via their own @effect/ai chains — all gated behind
      SkillsRequested at runtime, lower priority)
- [x] Type directories value-free — `ui-editor/src/types/types.ts` exemplar already type-only
      (verified); remaining violations are the group-(c) items above
- [x] `Operation` importable without the `@dxos/compute` barrel — RESOLVED as per-API subpath
      entrypoints (user-ratified, 52e2b889cc): Effect-style exports for all 24 compute
      namespaces + the autofixing `dxos-subpath-imports` lint rule (allowlist-driven, reads
      the target package's exports map; package must export ./package.json) migrated ~1,100
      files. Definition floor 445 → **322 files**; @effect/platform and date-fns GONE from
      every definition; remaining floor = echo type system + semver (echo Filter/match).
      Bundle bytes flat (tree-shaking already pruned the wire); the win is structural — graph
      walk cost and shake fragility. Next allowlist candidates: @dxos/echo (subpaths exist),
      @dxos/app-framework; flat error names ride the barrel until an errors mapping is added
- [x] Drop the static `export { XOperationHandlerSet } from './operations'` from `plugin.ts`
      stubs — 49 stubs stripped; CLI/stories import via new `./operations` subpath on the 10
      consumed plugins (magazine's `plugin.workerd.ts` re-export kept for the edge host)
- Promote `audit-opdefs.py` to a CI budget check (fails on new heavy externals / closure
  growth) — prerequisite hardening for the `handles` declaration field. Unscheduled.
- **Non-enabled plugins load metadata only.** Verify the invariant: a registered-but-disabled
  plugin contributes nothing to the boot fetch beyond its meta + `Plugin.lazy` code pointer —
  at startup or ever. Plugin definitions themselves must be lightweight (metadata + module
  pointers), same discipline as operation definitions. Known violation: all 97 `plugin.ts`
  stubs statically re-export `XOperationHandlerSet from './operations'` (plugin-defs.tsx
  imports every stub, so every registered plugin's operations graph enters `main`'s closure
  whether enabled or not). Add a measured check: chunk-graph closure of each `plugin.ts`
  stub ≈ meta only.

### Wave 3 — eager-core UI laziness audit

Components loaded before `main()` that should be lazy. Known from the chunk graph:

- **Eager-core UI laziness.** Swept 2026-08-05 against the built `index.html` closure
  (23 entries / 5.30 MB). One of the three is done; the other two are now attributed to an exact
  edge instead of a suspicion:
  - `ResetDialog` — **DONE.** It is `lazy()` at `main.tsx:59` (the ledger's "main.tsx:32 static
    import" was stale). Confirmed by effect, not by reading: **emoji-mart is entirely absent**
    from the boot closure — 0 chunks, 0 sourcemap paths.
  - **fast-check — REAL, 247 KB, bridge identified.** `boot-1` is _entirely_ fast-check (222
    sources) + pure-rand (16) + shared effect modules. Verified as emitted runtime code, not a
    sourcemap artifact — `Symbol.for('fast-check/PreconditionFailure')`, `cloneMethod` and
    `toStringMethod` are all present as code. The bridge is **`@effect/ai`'s `Prompt.js`, which
    imports `effect/Arbitrary`** (the original guess, now confirmed). Ruled out along the way:
    `effect/Schema` does NOT pull it (Schema.js/SchemaAST.js reference only the annotation _ids_),
    the `effect` barrel is NOT boot-reachable, and no first-party file imports `effect` bare or
    `Arbitrary` at all — so this is not fixable by changing our own imports. Options are a build
    alias/stub for `effect/Arbitrary`, or keeping `@effect/ai` off the boot path.
  - **react-aria — REAL, 177 sources, via the umbrella package.** `react-aria@3.48.0` (the
    barrel that re-exports everything) is pulled by `react-aria-components`, which is what the
    known `Input -> SegmentedInput -> DatePicker` chain reaches. Needs the component refactor
    already recorded; no first-party file imports `react-aria` directly.
  - Unrelated find, worth its own item: `echo-query/dist/query-lite/index.d.ts` is **412 KB**
    because fast-check's entire API got inlined into it. Types only — the JS bundle beside it is
    21 KB with zero fast-check — so it costs consumers' typecheck time, not boot bytes.
  - `fast-check` / `effect/Arbitrary` / `react-aria` are now `trace-boot-leak` TARGETS, so the
    next `DX_TRACE_BOOT_LEAK=1` bundle prints the entry-to-package import path for each.

## Phase 3 — measurement discipline + activation optimization (directives 2026-07-31)

Handler sets are EAGER by user decision (df134607d0; the accepted ~1.6 s in-container cost is
the optimization target, not a reason for indirection). Base branch's plugin-manager refactor
merged (86c9ebb065) — real unit contracts are the substrate for scheduler work. Merge surfaced
and fixed a second scheduler hazard: joining an in-flight load via `load()` could RESTART a
timed-out module after auto-disable cleared the memo — the wave now joins via
`ModuleLoader.awaitSettled` (start-nothing join).

Measurement strategy (load-perf brief, adapted: authenticated local-first SPA — CWV thresholds
are defaults, not goals; TTI-style metrics retired):

**Golden scenario = warm-cold** (user directive 2026-07-31): persisted identity, fresh browser
process — the real returning-user load. In practice users either hit the login gate or already
have an identity, so identity creation is not part of the load being optimized; the cold
scenario (fresh identity) stays as a secondary diagnostic for testing flows. All headline
numbers, lever comparisons, and CI thresholds key on warm-cold; its
`milestone:first-editor-interactive` is the time-to-first-meaningful-action anchor.

- **Measurement discipline — one item, blocked on a fixed CI runner.** All five pieces below
  share the same blocker, so they are tracked together rather than as five open tasks:
  - Boot waterfall: stitch navigationStart → ready from existing marks + new milestones
    (identity created, default space ready, ECHO available, first plank interactive); emit
    from `collectStartupReport` as one timeline — decomposes the un-itemized ~5 s outside
    the activation window
  - Lab TBT: longtask observer in the harness (sum blockage >50 ms between FCP and ready);
    the INP-risk proxy and the direct measure of fan-out main-thread damage
  - Time-to-first-meaningful-action marks per entry path (returning: editor accepts input;
    first-run: identity + home actionable)
  - RUM prerequisite: extend observability `composer.startup` with the waterfall marks +
    web-vitals (LCP/INP/CLS) so field p75 exists before claiming wins
  - Per-commit startup trend line, tier-aware (the Phase 1 leftover)
- [x] CI budget gate = our harness (not Lighthouse). Landed as two tasks, split by what a
      shared runner can actually decide: - `composer-app:check-boot-budget` — static. Entry + modulepreload closure of the built
      index.html; 30 entries / 4.75 MB (today 20 / 4.44 MB). Bytes catch leaks (margin is
      under the smallest leak class we have hit); count catches the chunk partition ceasing
      to apply, and is NOT a bytes proxy — buckets follow the SCC condensation, and the count
      moved 13 -> 20 on a legitimate change.
      `composer-app:check-startup-budget` is the runtime half — median modules-at-ready over 5
      warm-cold repeats, budget 300. Calibrated on 5-run medians: healthy 291
      (304/291/285/295/290) against 306 for the activation regression this branch shipped and
      reverted (306/306/316), so the line sits between them. Gated on the MEDIAN because single
      samples span 19 — wide enough that one run of a healthy commit exceeds 300 by itself. The
      earlier "same-commit jitter <=10" read came from 2-3 samples and was too optimistic; the
      283 baseline was a single sample. It is still the only metric whose signal clears the
      in-container noise, and the only one that can see this class of regression at all —
      moving a module onto the startup pass changes nothing statically.

**Finding, not a task.** Cold `Client.initialize()` cost — proto-guard's `withSnapshot` bounded it at 2s and this
branch pushed past it, because the HALO adapters became construction-safe and their setup
moved out of the (untimed) constructor into `initialize()`. Measured in-container:
construct 3ms, first `initialize()` 4688ms, second (warm) 123ms. The bound was raised to
20s as a hang guard; the underlying cost is the `_open()` long pole already noted in the
critical path above, now fully inside the timed window. Composer forks `initialize()` so
its paint is unaffected, but node consumers await it directly.

**Blocked, folded into the measurement item above.** Gate on `profilerTotal` / `navToReady` / lab TBT.
Today they are recorded per run and trended, never failed on: repeats of one unchanged
commit spanned 3828-7330 ms profilerTotal (1.9x) and 6851-10576 ms navToReady purely from
container contention, while the same branch measured +/-1.7% on real hardware — the noise
is environmental, so a shared runner can never gate them. Needs a self-hosted or
consistently-sized runner first; revisit the modules-at-ready threshold at the same time.
Also still open from the original item: definition-closure budget (audit-opdefs), alert
thresholds below the pass line, and p75-style reporting over N runs.

Activation optimization (each lever measured individually via harness + TBT):

- [x] Lever 1 — long-task chunking: `ModuleLoader.yieldToHost()` between module activations.
      Cold TBT median 4234 → 3134 (−26%), wall-clock flat. Committed.
- [x] Lever 2 — scoped demand pulls (2026-07-31): dispatch-latency marks
      (`milestone:dispatch:<key>:requested/:initialized`) proved registration wait ≈ 0 and
      located the spaces-ready → wave-start dead zone inside `#pullDependencyProviders`:
      follow-up rounds dropped their candidate scope, so the event fiber drained the whole
      startup pool before its own wave. Fix: `runDependencyPass({scopedToCandidates})` for
      pulls and event waves + `awaitSettled` join for providers already mid-load; post-wave
      full pass still unlocks waiters. Regression test verified failing on unfixed scheduler.
      Cold dispatch gap median 3538 → 643 ms (−82%); warm-cold gap 4358 → 1070 ms; cold TBT
      flat; navToReady in-container noisy (contention-bound — the event chain simply starts
      ~3 s earlier instead of queuing behind the drain).
- [x] Lever 3 — concurrent plugin enables (2026-07-31): the constructor's enable chain ran
      ~60 lazy plugin-definition imports sequentially (~1.75 s); bounded concurrency 8 cuts
      the window to ~1.4 s and shifts every later milestone earlier; `disable()` now awaits
      `initialized` (bootstrap is no longer synchronous for non-lazy sets).
- [x] Lever 4 — bounded wave concurrency + singleton-providers-first (2026-07-31): cap 16.
      Client's chunk import 2050 → 184 ms (uncontended slot); wall clock neutral in-container
      (Client `_open` absorbs the slack) but avoids import/parse oversubscription.
- Lever 5 (unscheduled, SDK-side) — `_open()` split: 3.2 s of worker spawn + HALO identity + ECHO open
  (marks `client.initialize:*` now on the waterfall); needs intra-SDK attribution next
  (services host open vs identity load vs echo open).
- [x] Lever 6/PoC — DeferredStartup coarse gate (2026-07-31, user-directed): dependency-mode
      modules of non-critical plugins (`deferStartup` predicate in composer main.tsx; 14-plugin
      keep set) park until a DeferredStartup wave fired at host idle post-ready. Plugins defer
      ATOMICALLY — an eager ReactContext consuming a deferred sibling capability trips the
      useCapability invariant (measured crash, fixed by atomic deferral). N=3 medians
      (warm-cold): navToReady 14.6–15.4 s → **10.7 s**, first-interactive ~13.5 s → **8.1 s
      (−42%)**, TBT ~4.0 s → **1.16 s (−69%)**, max long task 2.1 s → 0.45 s, spacesReady wave
      2.7 s → 0.13 s, startup window 169 modules (was ~350). **client.initialize itself
      3.3 s → 1.84 s** — the "Client monolith" long task was mostly eval contention from
      concurrent module evaluation, not SDK work. Known PoC breakage: ProcessManager's
      one-shot LayerSpec snapshot misses deferred specs (`generateHomeSuggestions` →
      ServiceNotAvailable) — fix by re-snapshotting on the deferred wave or making the
      collection reactive before this graduates from PoC.
- [x] Eval-floor sweep round 1 (2026-08-01): boot eval floor (entry static-import closure)
      measured at 9.4 MB of 67.6 MB dist; per-plugin defs are ~0.3 MB of it (disabled plugins
      ~0.2 MB — **meta-only loading is already effectively true**; the floor is shared/vendor
      code). Fixes: AppCapability.schema loader form (plugin-assistant exemplar),
      @dxos/assistant/ExecutionGraph subpath (react-ui-components hook rode the barrel →
      @effect/ai → fast-check/zod/ajv on the boot path), plugin-progress lazyModule
      conversion. Floor 9.40 → 8.78 MB; fast-check/ajv/@effect-ai gone from boot reach.
      Remaining floor members to chase: profile-state-machine (257 kB), crypto (196 kB),
      compression (115 kB), react (773 kB — irreducible).
- [x] Handler-gating regression fix (2026-08-01): toolkit operation handler sets
      (runInstructions et al.) were contributed by the SkillsRequested-gated skill-definition
      module → headless invocation hit NoHandlerError (pre-existing on branch, surfaced by
      plugin-assistant tests). Sets moved to the eager OperationHandler module (lazy-bodied,
      cheap); skills stay gated; tests updated to the demand-gate design.
- [x] Lever 7 — streaming start: begin round 1 as plugin definitions register instead of
      after the full enable set (Client could start ~1.4 s earlier — now the largest
      module-side block on the critical path).
- [x] Graduate the PoC: replace the coarse DeferredStartup gate with precise demand events
      per module class; fix the LayerSpec snapshot coupling (generateHomeSuggestions
      ServiceNotAvailable); audit post-idle UX (late surfaces, remount behavior of deferred
      ReactRoot/ReactContext); tune the 14-plugin keep set.

**State after the PoC round (warm-cold single run, in-container):** navToReady 10.0 s,
first-interactive 7.6 s, TBT 1.05 s, client.initialize 1.74 s.

## DeferredStartup as a plain event (2026-08-01, user-directed restructure) — CHECKPOINT

Manager machinery deleted; `DeferredStartup` is an ordinary activation event. Composer's
`AfterStartupPlugin` (core, `src/plugins/after-startup.ts`) fires it once
`app-framework:first-interactive` exists AND the host is idle — the paint anchor matters
(the ready message precedes the shell render; rIC finds idle gaps mid-render-pipeline and
an early fire floods the thread ahead of the workspace paint). Assignment is per-module
`activatesOn: ActivationEvents.DeferredStartup` (6-agent sweep, ~70 plugins, ~155 modules).
Rules held: ReactContext/ReactRoot eager, LayerSpec providers eager (this also fixed the
PoC's generateHomeSuggestions ServiceNotAvailable), Migrations eager, non-browser
node/workerd barrels untouched, roles/skills/createObject gates untouched.

Coupling law (bit twice — transcription RecordingSession, calls CallManager): an eager
ReactContext/ReactRoot pins every sibling capability its components read via strict
useCapability/useAtomCapability. Documented at both sites.

N=3 medians (in-container): warm-cold navToReady 12.3 s / fi 8.7 s / TBT 2.15 s /
client-init 2.36 s; cold navToReady 12.6 s / fi 9.1 s. vs pre-deferral (14.6–15.4 s nav,
~4.0 s TBT): still a large win. vs the PoC (10.7 s nav, 1.16 s TBT): ~1.5–2 s regression.

Eager-set anatomy (corrected 2026-08-01 — the earlier "~40 ReactContexts" figure was
wrong): reactContext modules total FOUR (attention, client, devtools, transcription) and
ReactRoot modules SIX (calls, deck, simple-layout, space, spotlight, support); only three
sit outside the keep set (devtools, transcription, calls), pinning ~5 sibling modules.
LayerSpec providers outside keep: assistant ×3 (AgentRuntime/AiContext/AiService — real
chunks) + brain ×1. The +85 startup-window delta vs the PoC is mostly INLINE value modules
(translations/schema/pluginAsset — no chunk, near-zero cost). Of 238 startup-window
modules only 86 carry real chunk imports, dominated by keep plugins (client 12, space 10,
markdown 7, routine 6, deck 6). ⇒ the PoC gap is NOT the eager set; it is (a) the idle
wave saturating the machine ~5 s post-paint (avatar render eats it) and (b) heavy keep-set
members — routine (excluded from the sweep as core, 6 heavy eager modules) and assistant's
LayerSpecs — plus the wave-eval anomaly below.

Review agenda (how to close the gap and go further):

1. Granular events replacing the one big wave — most deferred modules should activate on
   first use (per-domain demand events), eliminating the idle burst entirely.
2. Trickle the wave: slice DeferredStartup into batches or drop background-wave concurrency.
3. Sweep routine's non-LayerSpec modules (deliberately skipped as core; 6 heavy eager
   modules) and revisit assistant's LayerSpec trio via the reactive-snapshot fix below.
4. Soften the LayerSpec rule by making ProcessManager's layer collection reactive
   (re-snapshot on DeferredStartup) — then LayerSpecs defer too.
5. Wave-eval anomaly: per-module eval in the event wave runs ~2× slower than the PoC's
   predicate wave for a smaller module set — profile the wave's chunk-eval pattern.

Parked (harness): warm-cold document priming for `milestone:first-editor-interactive` —
hand-rolled primer UI script was flaky (create-space/createObject races); reverted to the
known-good identity-only primer. Redo via a robust page-object flow (AppManager parity:
`waitForSpaceReady` + workspace-scoped locators) or seed the document programmatically.

### Later / standing

Unscheduled — real but nobody is picking these up next, so they are not open tasks:

- Critical-chain membership fixes (DESIGN.md appendix A P0): `observability.ClientReady` async body,
  `ProcessManager` activate audit — can land independently of the waves
- appGraphBuilder post-shell event — deliberately deferred until wave 1's win is measured
- Warm-reload race root-cause — a **constraint**: it still gates any scheduling change that
  introduces round barriers
- **Move the `Idle` fire out of React into the activation scheduler.** `useApp.tsx:322-339`
  expresses an activation-lifecycle event as a render-lifecycle effect: startup fiber settles
  → `setState(ready)` → re-render → `useEffect` → `requestIdleCallback` → fire. The manager
  already knows when the startup pass settled. Two further problems: the `cancelIdleCallback`
  cleanup only helps before the callback runs, so the effect looks unmount-safe and is not;
  and `activateDemandGatedModules` must fire `Idle` independently because a headless harness
  has no `useApp` — one lifecycle event with two firing sites is the symptom.
  - Fire it from the scheduler when the startup pass settles. `useApp` then drops the effect
    entirely and the testing helper drops its `Idle` element, becoming purely "fire the starts".
  - The reason it landed in React — `requestIdleCallback` is browser-only, the manager also
    builds for node/workerd — is the same constraint `yieldToHost` solved in `module-loader.ts`:
    module-level Effect, feature-tested, `MessageChannel`/`setTimeout` fallback, `Effect.void`
    where neither exists, injected via the constructor with a default. Reuse that shape.
- **Finding, not a task — storybook cannot catch demand-gating regressions (recorded 2026-08-03).**
  `withPluginManager` fires every core+enabled plugin's start event unconditionally via
  `activateConvergedModules`, because a story mounts exactly one surface and honouring real
  demand would activate almost nothing. Consequence: a module start-gated behind a surface
  nobody renders still passes in storybook but would fail in the app. Only the runtime
  `modules-at-ready` budget covers that case — do not read green stories as evidence the
  gating is correct.
  - Note: `useApp` now fires `Idle` itself, so the `Idle` element of `activateConvergedModules`
    is redundant on the decorator path (idempotent, not a bug). Its real remaining job there is
    the per-plugin start events; simplify when fixing the race.
- [x] Delete `OWN_PLUGIN_SPECIFIER` / `resolveOwnPlugin` — zero production users (one synthetic
      test, one comment); removed from the public `ActivationEvent` surface
- [x] **Boot-budget regression traced and fixed (2026-08-04).** `services/index.ts` statically
      re-exported `LocalClientServices` / `fromHost`, and Composer's entry reaches the package root
      via `util/config.ts` — so the eager graph carried network-manager, wa-sqlite, teleport and
      hypercore. Moved behind a `@dxos/client/local` subpath: **6.11 MB -> 5.30 MB (-810 KB), 25 ->
      23 entries**, closure 4785 -> 4532 modules; those four are now entirely out of the closure.
  - The Aug 1 fix (`46e9fae304`) was incomplete, not reverted: it claimed `fromHost` was "loaded on
    demand" and added the dynamic import in `client-services-factory.tsx`, but never touched the
    barrel line (`git log -L` confirms). It rested on treeshaking rather than the import graph,
    which is why it measured clean at 4.44 MB while the leak sat latent until something retained it.
  - Remaining 5.30 MB is real client-side weight, not a leak, and was consciously accepted: budget
    re-baselined to 6 MB. Two consumers if it ever needs slimming — echo-client reaches
    automerge-repo's `fullfat` via `automerge/doc-handle-proxy.ts`, and `query/graph-query-context.ts`
    value-imports `filterMatchDoc` / `QueryPlanner` from echo-host. Both already use narrow subpaths.
  - `DX_TRACE_BOOT_LEAK=1 moon run composer-app:bundle` prints the import path from the entry to any
    package that must not be boot-reachable (`src/vite/trace-boot-leak.ts`). It is what found this.
- [x] **`CreateObjectRequested` gating: NOT a gate bug (2026-08-04).** `#capabilities` resolves to
      `capabilities/node.ts` under the `node` condition, so Node-run activation tests assert the node
      barrel, not the shipped one. 35 modules across 17 plugins were gated in `index.ts` and ungated
      in `node.ts`; realigned. Browser builds were always correct. Browser-runner follow-up is a TODO
      on `createTestApp`.
- **Wire `check-boot-budget` into CI (2026-08-04, highest-leverage item left).** Three separate
  boot-graph fixes have now been silently undone by unrelated refactors: `services/index.ts`
  (the in-process host, -810 KB), the base merge reverting `DatePicker` / `TranslationsProvider`
  to the `date-fns` barrels, and base's split-out `TranslationsContext` carrying the
  `date-fns/locale` barrel with it (~1 MB, caught only because the split stranded an unused
  import and tripped `no-unused-imports`). These fixes are properties of an IMPORT EDGE, so any
  refactor that relocates the edge drops them and nothing fails — not the build, not the tests.
  `check-boot-budget` is the only check that sees this class and CI does not run it. The Check
  workflow's moon targets are `:lint :build`, `:check-module-structure`, `:test :test-browser`,
  `:test-storybook`, `:test-workerd`, `:bundle`, `:e2e`, `cli:smoke` — adding a step after
  `Bundle` is a small diff.
  - `DX_TRACE_BOOT_LEAK=1 moon run composer-app:bundle` prints the import path from the entry to any
    package that must not be boot-reachable; pair it with the budget failure message.
- **Post-merge check sweep (2026-08-04).** Green: `oxfmt --check`, `:check-module-structure`,
  full `:build`. Outstanding: `:lint` (re-run after the react-ui locale fix), `:test` (5 client
  failures under triage — `client-service.test.ts` "should initialize" plus four
  worker/coordinator + leader-lock tests; none reference the `@dxos/client/local` change, so
  likely environment or pre-existing), `:test-browser`, `:test-storybook`, `:test-workerd`,
  `:bundle` + `check-boot-budget`, and e2e. NOTE: no CI run has ever executed on this branch's
  head — every result so far is local.
- **Flip the default `activatesOn` from `Startup` to `Idle` (own PR, user-directed 2026-08-04).**
  Today omitting `activatesOn` normalizes to `Startup`, so forgetting the annotation costs TTI
  and blocks the `useApp` ready gate — startup is the dumping ground. Invert it: anything that
  must run at boot states `activatesOn: ActivationEvents.Startup` explicitly, everything else
  lands in the idle sweep. User's framing, accepted: idle becoming the dumping ground is the
  cheaper failure (post-paint responsiveness) than startup being one.
  - **Mandatory second half — move the baseline wave with the default.** `#isBaselineWave`
    (`activation-scheduler.ts:595`) returns true iff a module's events include `Startup`, and
    baseline is what makes a module pullable by `#pullDependencyProviders` (`:856`) ahead of its
    own gate. Flipping the default without flipping this makes every un-annotated provider
    wave-scoped and invisible to the startup pass: `ClientPlugin`'s `Client` module would not
    initialize until idle. Baseline must become `Startup ∪ Idle`. Modules that declare `Startup`
    explicitly lose nothing — their wave fires first, so `#waveFired` covers them from then on.
  - The payoff is the invariant, not the immediate delta: startup cost becomes exactly the
    transitive demand closure of the boot path, enforced by the capability graph rather than by
    remembering to annotate.
  - Multi-capability contributors (surfaces, operation handlers, layer specs) have no individual
    requirer, so they all slide to idle. `#pullDependencyProviders` does pull multi providers
    (`:878`), so a startup snapshot consumer like the process manager still drags its LayerSpec
    providers in — but only while they are baseline. Second reason the baseline change is not
    optional.
  - Prerequisite: idle-wave yielding (task #23). `#executeWaves` runs at `WAVE_CONCURRENCY = 16`;
    a much larger idle wave is a long-task burst immediately after first paint.
  - Expect a broad harness sweep: tests that fire `Startup` and assert `getActive()` will see far
    less and need an explicit `Idle` fire (already hit in `ExcalidrawPlugin.test.ts`).
- **Collapse `ActivationSpec` to one mode (own PR, user-directed 2026-08-03).** Dependency
  mode is a wave with no name: Startup for the no-`requires` modules, "whatever wave my
  providers landed in" for the rest. Replace with a single `activatesOn` defaulting to
  `Startup`, and make pull **wave-scoped** — firing E activates E's modules and lets them
  pull required providers that are in E or an already-fired wave. This subsumes the mode
  filter in `#pullDependencyProviders` precisely (mutually-exclusive providers gated on
  different events can no longer collide) and makes wave membership declared, not derived
  from the capability graph.
  - Blocker/first step: **count the chain-riders** — modules with no `activatesOn` whose
    `requires` is satisfied only by an event-mode provider. Those activate inside that event's
    wave today and would break under a `Startup` default; they need re-homing. 194 explicit
    `activatesOn` sites vs ~700 dependency modules vs ~300 modules-at-ready — the arithmetic
    doesn't resolve from static reading, so measure before assuming this is a codemod.
  - Unlocks the namespace fix: once the scheduler stops special-casing `Startup`, `Startup` and
    `pluginStart` move from `core/activation-event.ts` to `common/activation-events.ts` and the
    duplicate `PluginStart` wrapper is deleted.
  - Fold in: **make `Capability.Module.requires` optional and the defaulting collapses itself.**
    The intended invariant is already required-internally / optional-externally —
    `ActivationSpec.requires` is required, `ModuleEntry.requires` and `ModuleSpec.requires` are
    optional, and `normalizeActivation` is the adapter between them. `Capability.Module`
    (`capability.ts:488`) breaks it: it is an authoring-side type that declares `requires`
    **required**. That one line forces `lazyModule`/`inlineModule` to default early, and because
    the generic `Requires` does not narrow through `?? []`, each needs an `as Requires`
    "Correlation cast" (`:549`, `:578`) purely to satisfy it. Widen the field to `requires?` and
    both the defaults and both casts go, leaving `normalizeActivation` the sole adapter.
    Keep `provides` required on both — `ModuleSpec:500` already requires it, so only `requires`
    is genuinely optional at authoring; that asymmetry is correct, do not flatten it.
    Check first: `plugin.test.ts:237`/`:252` assert `requires` on the unresolved module (move to
    `activation.requires`), and whether `moduleMaker` (`capability.ts:637`) collapses too.

## Checkpoint 2026-08-01 (per-plugin start events landed)

- DeferredStartup and SkillsRequested deleted. Every off-critical-path module rides a
  per-plugin `<Name>Events.Start` (`ActivationEvent.pluginStart` convention); cross-plugin
  contributions ride the consumer's event (skills → assistant via maker default; markdown
  extensions, connectors, game variants, routine/project templates, thread/file/map/studio/
  calls/trip/inbox/crx/illustrator/blogger integrations → consumer events; meeting call
  extension uses allOf(calls, meeting)).
- Fire sites: composer idle hook trickles all core+enabled starts sequentially; catalog fires
  own start on post-boot enable; deck URL parse-miss fires all; chat/toolkit/routine-editor
  fire assistant. Harness + withPluginManager fire all starts after Startup.
- Verification: app-framework 220/220, all 67 swept plugins build+test green (agents),
  navtree stories green, composer-app builds, warm-cold e2e green — modules at ready 259
  (was 310 pre-migration; ready-set shrank further because start-gated modules now wait for
  their feature's event, not a blanket idle wave that the harness counted).
- Next lever: prune plugins from the idle trickle once precise demand sites (object-open
  typename map, data-presence scan, settings-open) cover them; then per-feature loading is
  fully data-driven.

## Checkpoint 2026-08-01 (suspenseful client verified, honest re-measurement)

- Bundle-verification discipline: `composer-app:build` does NOT produce the served app —
  `composer-app:bundle` does; every e2e/benchmark run now marker-checks the bundle
  (`waitUntilInitialized` present, `deferredStartup` absent). All afternoon rows before this
  were stale-bundle runs and are annotated as such.
- Boot verified functional on the current code: create-identity e2e green here; full basic
  suite green on the user's machine (space mutations here are env-limited — no edge server).
- Honest warm-cold rows (N=3, verified bundle, commit 493543f351): profilerTotal 6.1–6.3s
  (trustworthy streaming-era baseline 8.3s → −25%), modules at ready 262–270 (was 310),
  navToReady 11.5–13.7s (was 14.1; still includes identity load, which waits for init).
- **top1 is no longer the Client module** — it's idle-trickle skill/graph chunks
  (SkillDefinition ~2.3–2.8s under load). Client init is off the measured critical path;
  the goal directive (module work ≤ client activation) is now inverted.

## Definitive A/B: main vs branch, real hardware (2026-08-01, user-run, warm-cold, N=4 each)

| metric        |            main (mean) |       branch (mean) |    delta |
| ------------- | ---------------------: | ------------------: | -------: |
| profilerTotal |    8335 ms (8168–8626) | 2847 ms (2791–2885) | **−66%** |
| navToReady    | 14369 ms (13965–14860) | 9134 ms (8941–9302) | **−36%** |

Branch variance ±1.7% — stable enough for CI budget gates (task #22 RUM/CI remainder).
Remaining navToReady = client init + identity render (out of scope) + ~2.8s boot floor
(chunk eval; client chunk split is the next lever).

## Checkpoint 2026-08-01 (boot-graph slimming: static-leak eviction)

- Diagnosed the user's 9–10s local preview: `main:start` fired at 4.3s wall — the gap is
  entry fetch/parse/eval, not app code. Cause: the entry's static import graph was
  **749 chunks / 8.8MB** (748 modulepreload links in index.html).
- Method: `bootgraph.py` (scratchpad) — static-import BFS from the main chunk over the built
  assets + sourcemap byte attribution + forbidden-package chains. Reusable as the CI
  structural gate (parked with task #22).
- Three leak classes evicted (commits 46e9fae304, 1a9ce81baa):
  1. Plugin types → engine: plugin-sheet schema/operations pulled the HyperFormula engine
     (548KB) via the `@dxos/compute-hyperformula` barrel for pure A1 helpers. Added
     engine-free `/types` subpath (runtime re-exports moved to the package barrel).
  2. `main.tsx` → ResetDialog (fatal-error-only UI) statically pulled FeedbackForm and the
     whole form stack: react-ui-form, emoji-mart (~484KB), CodeMirror + language-data +
     mermaid (~500KB), react-aria, motion, syntax-highlighter. Now React.lazy; chunk-load
     failure degrades to the theme-independent ErrorFallback via the existing double-fault
     boundary.
  3. Worker runtime on the main thread: `services/dedicated/index.ts` re-exported
     `runDedicatedWorker` (client-services 191KB, hypercore, bip39 184KB, sqlite) into the
     main barrel → moved to new `@dxos/client/worker` subpath (breaking; changeset added).
     `fromHost`, `createIceProvider`, and LocalClientServices' sqlite platform imports are
     now loaded on demand.
- Result: static boot graph **521 chunks / 4.03MB (−54% bytes, −30% chunks)**; forbidden
  list (hyperformula, emoji, codemirror-language-data, react-aria, hypercore.mjs, bip39,
  wa-sqlite, client-services) all clear. Bytes-to-ready in the harness: 27.1 → 25.2MB.
  **CORRECTION (2026-08-11): the 4.03MB total came off a broken build** — the closure was
  short of what actually ships, so this line's totals and per-owner bytes are not a usable
  baseline. Superseded by the measurement below; do not compare against 4.03MB.
- **Boot-closure owners, re-measured 2026-08-11** by attributing each preload chunk's bytes
  through its sourcemap _mappings_ (not `sources` presence, which names tree-shaken modules
  that emit nothing). Deployed `composer-main` (effect v3) vs the effect-v4 branch:

  | owner           | main (v3) | v4 branch |       Δ |
  | --------------- | --------: | --------: | ------: |
  | effect (family) |   1.21 MB |   0.90 MB | −0.31MB |
  | react-dom       |   0.94 MB |   0.96 MB | +0.02MB |
  | automerge       |   0.26 MB |   0.26 MB |       — |
  | protocol codecs |   0.10 MB |   0.10 MB |       — |
  | **closure**     |   5.46 MB |   5.17 MB | −0.29MB |

  Every non-effect owner is flat within noise and effect accounts for the whole delta, which
  is what makes the attribution trustworthy rather than merely plausible.

- Verified: client 13 passed (+1 expected-fail), compute-hyperformula 12, plugin-sheet 7,
  warm-cold e2e green on the fresh bundle ('open & close' test got 2s timeout — first
  connect now pays the lazy RTC-stack load that used to be a static import).
- Follow-ups (not yet done): @dxos/crypto keys ride hypercore-crypto (122KB vendor
  remnant); yaml 90KB via config; chunk-count consolidation via rolldown `advancedChunks`
  minSize (2,324 chunks <1KB remain); skeleton-first entry (dynamic plugin-defs) is the
  end-state lever.

## Checkpoint 2026-08-02 (chunk consolidation post-mortem; preview over HTTP/2)

- User's local re-run after the eviction: main:start 4299 -> 3326ms (−23%); ready roughly
  flat (~7.1s) because activation now overlaps the still-serializing preload tail.
  (Also observed: client.initialize 7.0s vs 3.3s across their two runs — worker-side,
  untouched by this work; needs a variance check before treating as a regression.)
- Config migrated to the vite 8 surface: build.rolldownOptions + output.codeSplitting
  (rollupOptions/manualChunks are deprecated; manualChunks is ignored when both present).
- Consolidation experiments, both measured dead-ends (numbers = main's statically
  reachable set via bootgraph.py):
  | variant | total chunks | main boot graph |
  | default splitting | 4,795–4,829 | 521 / 4.03MB |
  | per-package groups | 3,006 | 12 scripts / 10.07MB |
  | $initial boot group    | 2,993        | 87 preloads / 19.09MB|
  Per-package welds each package's eager and lazy halves (the architecture pairs thin
  eager entries with heavy lazy islands inside every package). $initial spans all five
  HTML entries and, with includeDependenciesRecursively defaulting true, their recursive
  deps — every entry then pulls the merged blob. Capturing an entry module also dissolves
  its facade (vite degrades HTML to ordered script tags, no preload list).
- Safe consolidation requires a per-entry static module manifest (generate from
  bootgraph.py output and feed group test fns) or upstream per-entry tags. Parked.
- Instead: preview server now opts into https (HTTPS=true, repo-root key/cert) → vite
  serves HTTP/2, multiplexing the ~520-request preload wave that serializes over 6
  connections on HTTP/1.1 — the actual local bottleneck.
- Final bundle verified: 521 chunks / 4.03MB statically reachable, forbidden list clean,
  warm-cold e2e green (container: profilerTotal 4305, navToReady 7663 — best harness
  sample to date, N=1).
- Direction ratified in discussion: extend the dxos-subpath-imports lint with a closure
  rule (definition-closure files import only designated light subpaths, never barrels) so
  each boot-graph leak class becomes a lint error; light /types-style subpaths roll out
  package-by-package driven by lint findings.

## Checkpoint 2026-08-02 (plugin subpath migration: mechanical tranche shipped)

- Spike (plugin-sheet) successful: per-namespace exports (./Sheet etc.) + autofix rewrite
  decoupled the pilot island — SpaceGenerator closure 8.41 -> 7.70MB, hyperformula engine
  and sheet component/model chunks fully out. Two rule/infra findings: (1) a package MUST
  export "./package.json" or dxos-subpath-imports cannot read its exports map under Node
  exports encapsulation and silently no-ops; (2) the rule is now exports-map-driven for
  every @dxos/plugin-* (no allowlist growth).
- Codemod (scratchpad gen-plugin-subpaths.py) added exports/typesVersions/vite entries to
  71 plugins (namespace modules under src/types); repo-wide lint --fix rewrote 258
  consumer files (cross-plugin barrel statements 707 -> 519).
- Verified: full workspace build green; assistant 165 / inbox 226 / space 30 / markdown 30
  / kanban 14 / thread 4 tests green (markdown's 2 initial failures were concurrency
  flakes — solo rerun green); boot graph unchanged 4.03MB/522; warm-cold e2e green.
- Remaining 519 barrel statements target irregular layouts, concentrated in:
  plugin-space (SpaceOperation 83, SpaceCapabilities 52), plugin-graph (Node/GraphBuilder/
  Graph — wholesale `export * from '@dxos/app-graph'`, consumers should import app-graph
  directly), plugin-client (ClientCapabilities 67, ClientEvents 13), plugin-testing (dev-
  only, ignorable). BLOCKER for these: the names are `export namespace X {}` DECLARATIONS
  inside shared files, not module re-exports — a subpath cannot extract them. They need
  the namespace-declaration -> module-file refactor first (code-style idiom), in core
  boot-path plugins. That refactor is where the boot-graph payoff of this migration lives
  (those barrels are what closure files import at boot).

## Checkpoint 2026-08-02 (cycle-safe boot chunk consolidation: SHIPPED)

- Final shape: **13 preload requests (was 520), 5 boot chunks (1084/742/363/341/286KB),
  3.62MB statically reachable** (baseline 3.50 + chunk overhead; no strict-mode penalty),
  chunk graph provably acyclic, warm-cold e2e green with best-yet container numbers
  (profilerTotal 3828, navToReady 6988).
- Crypto/yaml evictions landed first: @dxos/crypto/random (webcrypto randomBytes; sodium
  stays for keys/sign/verify), config yaml deferred into ConfigService.load (−210KB).
- The chunking journey, all measured: rolldown maxSize splitting breaks evaluation order —
  size-cuts ignore dependency order, manufacturing CHUNK cycles even over an acyclic module
  graph (module cycles unnecessary; user's instinct correct). rolldown's documented fix
  (strictExecutionOrder + preserveEntrySignatures) costs +1.8MB via inhibited treeshaking
  (module wrapping) — disqualified. Solution: compute the partition ourselves in
  bootManifestPlugin — SCC condensation of the boot module graph (ordering edges CLOSED
  through non-manifest intermediaries — dropping them manufactured cycles via the
  intermediary's chunk, the first partition attempt's failure), dependency-first topological
  order, contiguous ~1.5MB-rendered buckets; rolldown consumes it via a name-fn group with
  includeDependenciesRecursively: false.
- Manifest hygiene: regen is an explicit mode (DX_BOOT_MANIFEST_REGEN=1) on an UNGROUPED
  build — a manifest written from a grouped build ratchets (grouping makes lazy modules
  chunk-reachable; contamination self-perpetuates, observed 1476->3238 after a raced
  build). Chunk-level module collection is the post-treeshake truth; parse-level
  importedIds over-approximates (reaches treeshaken barrel siblings — sodium reappeared).
- Bonus audit (boot-cycles.json): the boot graph contains only 5 real import cycles, ALL
  vendored (protobufjs x2, semver, automerge x2) — zero in DXOS code; the no-circular-
  imports policy holds.
- Upstream candidate: rolldown feature request for cycle-aware maxSize (topological cuts).
- Acceptance check added to the workflow: chunk-level SCC scan of the emitted bundle
  (0 cycles required) before any boot e2e.

## Checkpoint 2026-08-02 (boot divergence: tooling + category-1 evictions)

- Goal shift (user): the checked-in boot manifest is brittle — chunking should work in a
  single pass. Investigated: rolldown's group `name` callback DOES receive a ChunkingContext
  with getModuleInfo (importedIds vs dynamicallyImportedIds are separate), so the partition
  is computable in-process. Prototyped it: mechanically works (12 chunks, no manifest) BUT
  the graph there is PARSE-level while the boot set is post-treeshake — boot went
  3.62 -> 5.22MB and bip39/react-aria returned. Structural: post-treeshake truth is only
  observable after chunking, i.e. too late to feed back into it.
- Implication: single-pass is viable only once the parse graph converges on the treeshaken
  one, i.e. once boot-reachable code stops importing barrels. So the manifest stays as an
  explicitly TEMPORARY crutch with a defined exit condition, and divergence is the metric.
- Built the divergence report (DX_BOOT_DIVERGENCE=1): walks the parse-level closure of the
  entry, diffs against the manifest, and attributes each divergent module to the boot-side
  import that pulls it in. Work-list + CI gate + readiness signal in one.
- Divergence classes (measured, source bytes): (1) OUR barrels ~2.3MB — fixable by subpaths;
  (2) EXTERNAL package barrels ~1.1MB — NOT fixable by our lint: @effect/rpc is already
  subpath-imported and RpcServer legitimately boots (the tab serves the WebRTC bridge), its
  HTTP transport leaking from inside; @effect-atom/atom-react publishes no subpaths at all
  (only '.' + jsx runtimes). Both need upstream or pnpm patch; (3) component coupling —
  react-ui's core Input statically imports SegmentedInput -> DatePicker -> Calendar ->
  react-aria; treeshaking (not import hygiene) is what saves it. Needs a UI refactor; parked.
- Category-1 evictions landed: date-fns all-locales barrel -> per-locale entry (966KB);
  @dxos/edge-client/http subpath, which also removed the barrel from the REAL boot set
  (809KB); @dxos/crypto/subtle subpath off the sodium-bearing barrel (233KB);
  @dxos/credentials/assertions off the seedphrase/bip39 barrel (~150KB).
- Result: divergence 9,113 -> 7,048KB (-23%, leaking imports 90 -> 83); boot 13 preloads /
  5 chunks / 3.69MB (flat, forbidden list clean); warm-cold e2e green (profilerTotal 4635).
- Remaining category-1 (small): observability -> opentelemetry semantic-conventions 221KB,
  app-toolkit 95KB, schema/util 85KB, config -> client-protocol 72KB, echo/index-core 63KB.
- Open question for the manifest exit: categories 2+3 look irreducible without upstream work
  or a UI refactor, so single-pass may need a tolerance (accept N KB of over-approximation)
  rather than requiring zero divergence.

## Definitive A/B refresh (2026-08-02, user-run, real hardware, warm-cold, N=4)

| metric        |            main (mean) | branch 08-01 (mean) |   branch now (mean) |  vs main |
| ------------- | ---------------------: | ------------------: | ------------------: | -------: |
| navToReady    | 14369 ms (13965-14860) | 9134 ms (8941-9302) | 5659 ms (5494-5773) | **-61%** |
| profilerTotal |    8335 ms (8168-8626) | 2847 ms (2791-2885) | 3532 ms (3460-3582) | **-58%** |

navToReady fell a further 38% after the boot-chunk consolidation + leak evictions.
profilerTotal ROSE 2847 -> 3532 while total fell: the profiler window opens at `main:start`,
which used to fire late (520 serialized chunk requests resolved first), so eval work sat
OUTSIDE the window; at 13 requests main:start fires almost immediately and that work is now
inside it. Time outside the window collapsed ~6.3s -> ~2.1s. Use navToReady as the headline;
profilerTotal is only comparable at constant boot-request count.

## Checkpoint 2026-08-03 (lazy-tail consolidation: NEGATIVE RESULT, reverted)

Goal: merge the lazy graph's ~3,430 chunks (median 1.2KB, 2,929 under 2KB) to cut
per-interaction requests and speed PWA install. Two implementations, both measured
strictly worse than doing nothing; the config is reverted to react + boot groups only.

| variant                     | lazy chunks | markdown island  |
| --------------------------- | ----------: | ---------------- |
| baseline (rolldown default) |        3430 | 44 req / 1.13 MB |
| module-level clustering     |        5344 | 90 req / 5.37 MB |
| signature-group clustering  |        5229 | 68 req / 4.88 MB |

WHY it fails, and why boot succeeded where this does not:

- A chunk's effective signature is the UNION of its members' signatures, so a cluster is
  pulled into the closure of EVERY island needing ANY member. Merging by "two lowest
  islands" still unions wildly different full signatures -> per-island bytes explode.
- Claiming modules into manual groups removes them from rolldown's own global optimization,
  and the UNCLAIMED remainder then fragments further — total chunk count went UP both times.
- Boot works because boot modules are always fetched together: unioning their signatures
  costs nothing because the union is the truth. The lazy graph has no such coherent subset;
  the varied signatures ARE the information and the fine-grained split is a global optimum.
  Those 1KB chunks are the bundler being right, not sloppy.

Supporting measurements (offline, on the shipped bundle):

- 3,430 lazy chunks carry 3,239 distinct signatures — only 191 chunks (5%) are mergeable at
  ZERO over-fetch. Everything else buys requests with bytes.
- Coarser ideas are far worse: per-package grouping costs markdown 14.3MB, a tiered
  shared-pool 18.5MB (vs 1.13MB today).
- The offline simulation that predicted a good trade (~15 req / +20% bytes) modelled merging
  CHUNKS (signature-homogeneous). Implementing over modules/groups does not reproduce it —
  the simulation's unit was the thing that made it look safe.

If revisited, do NOT re-try manual grouping. The levers are (a) an upstream rolldown knob for
a size floor in AUTOMATIC splitting (so it optimizes globally with a minimum), or (b) reduce
the 1,998 dynamic-import boundaries themselves by clustering ACTIVATION EVENTS (modules that
always activate together need not be separate islands) — attacks the cause, not the symptom.

## Finding 2026-08-03 (PWA install cost is precache SCOPE, not chunk shape) — not implemented

Chasing the "tons of tiny chunks slow the PWA install" hypothesis showed the chunks are not
the cause. Measured on the shipped bundle:

| precached | files |    size |
| --------- | ----: | ------: |
| js        |  4340 | 64.2 MB |
| wasm      |    10 | 30.5 MB |
| other     |   210 |  2.1 MB |
| TOTAL     |  4560 | 96.8 MB |

`globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff2}']` precaches the ENTIRE app —
every lazy island plus 30.5MB of wasm — for an app whose boot shell is 4.0MB (15 files).
That is a ~24x overshoot and is independent of how the code is sliced; consolidating chunks
cannot touch it.

Proposed (prototyped, then reverted — dependency wiring incomplete): narrow globPatterns to
`['**/*.{css,html,ico,png,svg,woff2}']` (~2.1MB) and register a CacheFirst runtime route for
`.js`/`.wasm`. Content-hashed URLs can never be stale, so CacheFirst is safe; the boot graph
caches during the first page load and each feature caches on first open.
Expected install payload 96.8MB -> ~2MB.

TRADE-OFF (product decision, not purely technical): offline coverage changes from
"everything, immediately after install" to "everything you have actually opened". Selected
assets can be pinned back into globPatterns — the sqlite wasm is a plausible pin, esbuild's
(the bulk of the 30.5MB, used only by plugin-script) is not.

Blocker when picking this up: `workbox-strategies` / `workbox-expiration` are only transitive
deps; they need `pnpm add --filter composer-app --save-catalog` (a hand-written "catalog:"
entry does not resolve and fails the SW build).

## Checkpoint 2026-08-03 (single-pass boot chunking — manifest DELETED)

Per the agreed plan (single pass + import cleanup, not "manifest until divergence is zero"):
the partition is now computed from the module graph during chunking. `boot-manifest.json`,
`DX_BOOT_MANIFEST_REGEN` and the two-mode build are gone; the config carries one function.

| metric         | manifest | single-pass |
| -------------- | -------: | ----------: |
| boot chunks    |        5 |          11 |
| preloads       |       13 |          19 |
| boot bytes     |  3.69 MB |     4.67 MB |
| partition cost |    build |      149 ms |

The +0.98MB is the parse-vs-treeshake gap: the closure follows barrel re-exports treeshaking
later drops, so modules only lazy code uses are still grouped into boot. That gap IS the
import-cleanup work-list and shrinks with every subpath fix — it was 5.22MB before the
bip39/edge-client/crypto/date-fns evictions, so those four bought 0.55MB.

Only ONE forbidden package remains statically reachable: react-aria, via react-ui's core
`Input` -> `SegmentedInput` -> `DatePicker` -> `Calendar`. That is category 3 (a real static
dependency, not a barrel re-export) so it needs a component refactor — lazy-load the picker
inside SegmentedInput, or split the date-specific parts out of Input. Next boot-size lever.

Warm-cold e2e green (profilerTotal 4054, navToReady 8036 in-container).

## Checkpoint 2026-08-03 (task #38: demand-gated plugin start events)

Taxonomy ratified in discussion, then measured into its final shape:

- **Demand signal (core mechanism):** the module loader fires a plugin's own start event
  (forked) when one of its modules contributes `Capabilities.ReactSurface` — the surface
  rendering IS the demand. Safe because contributions land in reactive capability atoms.
- **`appGraphBuilder` -> `GraphStart` default** (33 own-start overrides dropped): a builder
  gated on its own start deadlocks (item never in navtree -> surface never renders).
- **All 71 surfaces role-gated**, zero `activatesOn` overrides (19 were own-start-gated —
  unreachable without the blanket fire; 3 declared no roles and were silently eager).
- **43 operation-handler sets -> `GraphStart`**, **18 settings -> `SettingsStart`** — NOT
  eager. First attempt made them dependency-mode: modules at ready 283-289 -> 306-316,
  profilerTotal 6.9-7.3s, top1 = the moved modules themselves (BENCHMARKS rows at 34d12659).
  Repointed at the two idle waves instead. Handler sets are keyed definition->loader maps,
  so bodies still load per invocation (spotlight's `make()` set is the one non-keyed
  exception — Tauri window entry, not composer boot).
- **Settings NOT panel-gated and NOT all deferred** (user decision + e2e evidence): firing
  `SettingsStart` post-ready for ALL settings fatals — transcription's driver
  (`ReactContext`, mounts with the shell) and `DeckLayout` read settings via strict
  `useAtomCapability`, and deck boot modules `require` them. Maker default stays ungated;
  only the 18 whose values are read solely from their own deferred surfaces ride
  `SettingsStart`, which `after-startup` fires right after `GraphStart` at idle.
- **after-startup** now fires exactly [GraphStart, SettingsStart] instead of all ~80 plugin
  starts. `activateAllPluginStartEvents` remains for the converged-set callers only: test
  harnesses + deck URL parse-miss recovery.
- Repointed strays: wnfs `Dependencies` -> `FileEvents.Start`, inbox
  `NavigationTargetResolver` -> `GraphStart` (neither reachable via own start: no surface /
  needed before the surface exists).

Verified: composer-app build green, app-framework 220 + app-toolkit 119 tests green, lint
clean on all touched packages (remaining warnings pre-existing on branch).

## Checkpoint 2026-08-03 (levers adopted from PR #12438 review)

Reviewed dxos/dxos#12438 (richburdon, base `main`) against this branch. Most of it overlaps
what we shipped (eager-graph de-bloat, ResetDialog lazy, edge-client/bip39/crypto evictions,
stub-must-not-reach-implementations); its `?defer=1` two-wave startup is superseded by our
surface-demand gating. Four items were genuinely new; three are now landed:

1. **plugin-calls placeholder media tracks** — `canvas.captureStream()` + `new AudioContext()`
   ran in `MediaManager._open()`, reached via `CallManager` on `ClientEvents.Initialized`, i.e.
   the startup path, for a call that may never happen. Now a memoized
   `_ensurePlaceholderTracks()`. NOTE: #12438 awaits it only in `join()` — that breaks the
   lobby, which renders the toolbar pre-join, because `_open()` is what guaranteed
   `videoTrack` was defined for `turnVideoOn`'s `removeTrack(videoTrack!)` and
   `turnVideoOff`'s `addTrack(videoTrack!)`. We also await it in `turnVideoOff`/`turnAudioOff`
   and guard the add/remove — which additionally fixes a latent crash when placeholder
   creation fails (headless WebKit) that the existing try/catch had introduced.
2. **`boot:html-parsed` was read but never written** — three read sites (`main.tsx:271`,
   `harness-helpers.ts:159,232`), no writer anywhere; `AUDIT.md` claimed an inline
   `index.html` script emitted it, but that script vanished when the loader moved into
   `bootLoaderPlugin`. So `bootLoaderVisibleMs` was always undefined in telemetry and the
   waterfall silently dropped its first segment — the very segment our chunk work targets.
   Now emitted from the loader IIFE (`body-prepend`, classic script, so it runs before the
   deferred module script despite appearing later in document order). Verified at runtime:
   mark 175.1ms, first-paint 180ms, main:start 1081ms.
3. **Profiler off by default in dev** — `isTrue(param, Boolean(DEV))` passed a default into
   `isTrue(str, strict = true)`'s STRICTNESS flag, so dev required `?profiler=1` despite the
   comment promising otherwise. Absent-parameter case now handled explicitly.
4. **Preload-budget CI guardrail** (`check-preload-budget.mjs`) — NOT taken; folded into the
   broader "CI check for performance metrics" discussion. This is the regression-prevention
   piece, and we have the most to protect (520 -> 19 preload requests).

Also noted for review, not changed: `plugin-spotlight` is the one handler set still using
`OperationHandlerSet.make(...)` with inline bodies rather than `keyed`/`async` (Tauri spotlight
window entry, not composer boot). #12438 fixes it via `OperationHandlerSet.async`.

## Checkpoint 2026-08-04 (base merge; e2e/harness split; fatal client-init path)

### Landed

1. **Base merge** (`09cdc7c2f6`) — 96 conflicts from
   `claude/resume-app-framework-activation-ycp7vv` (plugin-outliner -> plugin-tasks takeover,
   `Plan` removal, space merge-preview). Post-merge fallout was one class: files taken from base
   still imported the deleted `types` barrels. Also unwrapped base's inner
   `export namespace ReviewCapabilities` (46 call sites read `X.X.member`) so the module is the
   namespace, matching every other types module.
2. **Startup harnesses off `e2e`** (`adc88e2e84`) — `playwright.config.ts` now `testIgnore`s
   `startup.spec.ts` + `dev-startup.spec.ts`; the production harness gets
   `playwright-startup.config.ts` and an `e2e-startup` moon task, mirroring the `e2e-dev` split.
   They record benchmark rows, so nothing should gate on them.
3. **Boot chunking extracted** (`adc88e2e84`) — `vite.config.ts` -> `src/vite/boot-chunking.ts`
   behind a `bootChunking({ entry })` factory (memoized partition is instance state, not a
   module-level binding). Rolldown's context narrowed to a `ModuleGraph` structural type so tests
   drive it with a fake graph: 16 tests covering the DAG invariant, SCC cohesion, edge collapsing
   through uncaptured modules, bucket sizing, id normalization, per-build memoization. Behaviour
   unchanged (4253 modules -> 12 chunks). Carries a `TODO(wittjosiah): Factor out?` for moving it
   to a shared vite-plugin package once a second app needs it.
4. **Fatal client-init path restored** — the suspenseful-client change had made a failed or
   stalled `initialize()` unobservable: the fork's `catchAll` only logged, `waitUntilInitialized()`
   never settled, and no error boundary was ever reached. **Measured** React's behaviour on a
   rejected thrown promise: ~90 re-renders in 500ms, boundary never reached, still suspended —
   React retries and the retry re-suspends, so a per-wait timeout could never surface anything.
   Therefore the bound lives at the top level, not in React:
   - `Client.waitUntilInitialized({ timeout })` — opt-in, no default (indefinite otherwise).
   - `plugin-client`'s fork wraps `initialize()` in `Effect.timeout(initializeTimeout)`
     (default `INITIALIZE_TIMEOUT` = 30s, new in `client-protocol/timeouts.ts`) and calls the new
     `onClientInitializationError` option.
   - `composer-app` threads `onFatalError` through `PluginConfig`; `Main` renders `Fallback`
     (the reset dialog) instead of `App`. Rendered, not thrown: `Main` sits ABOVE the app-level
     error boundary, so a throw there escapes React and blanks the page.

5. **Operation handler sets collapsed to one shape** — `definitions()` and `getHandlerFor()` are
   now required members, so keying is the default rather than something sets opt into. `lazy` and
   `async` are deleted; all 25 `lazy` call sites (123 modules) became `keyed`, so each now loads a
   single operation's body per invocation instead of the whole plugin's. `delegation` needed its
   operation definition split into `operations/definitions.ts` (it lived beside the handler, so
   naming it statically would have pulled the body in). The keyed/unkeyed fallback in
   `resolveFromSets`, the conditional in `lookup`, and `merge`'s conditional `definitions` spread
   all go away.

### Open

Expanding the subpath lint across all packages is tracked as a `TODO(wittjosiah)` on
`DXOS_SUBPATH_PACKAGES` in `dxos-subpath-imports.js`, beside the list it would replace.

## Finding 2026-08-12 (`sideEffects: true` audit; barrel work is NOT a boot lever) — follow-ups

Context: the `dxos-subpath-exports` branch moved every plugin's namespaces into per-directory
barrels (`export * from './types'`). Two questions fell out.

**MEASURED, NEGATIVE: `sideEffects: false` buys nothing at boot today.** Flipping `plugin-space`
(9 namespaces, boot-critical) moved `check-boot-budget` by exactly zero — 25 preload entries /
5.47 MB before and after, with `plugin-space:build` and `composer-app:bundle` both confirmed
re-run uncached. The subpath migration already removed barrel traversal from the boot path, so
there is no unused module reached through a barrel left for rollup to drop. Do not re-derive this
expecting bytes. NOT measured: `check-startup-budget` (modules-at-ready) and total bundle beyond
the preload closure — a win, if any, would show there.

Also confirmed the barrel refactor itself is boot-neutral: the branch point measures the same
25 / 5.47 MB as the branch tip. (The 23 / 5.31 MB quoted in this file's earlier notes is an older
commit and is not comparable.)

**Audit: 88 of 98 plugins have NO module-scope side effect at all.** The other 10 split three ways:

- CSS/font imports (`plugin-excalidraw`, `plugin-explorer`, `plugin-presenter`, `plugin-tldraw`,
  `plugin-onboarding`) — needs the array form (`"sideEffects": ["**/*.css"]`), never `false`.
- Third-party augmentation imports (`plugin-terra` x5, `plugin-spacetime`) —
  `import '@babylonjs/core/Meshes/thinInstanceMesh'` patches `Mesh.prototype`. Not removable;
  scope with the array form instead.
- Registration at import time — the refactorable ones, all the same anti-pattern:
  1. `plugin-deck` `DeckPlugin.ts` — `setAutoFreeze(false)` at module scope; carries its own
     `TODO(Zan)` to move it. Belongs in activation.
  2. `plugin-library` `atproto/book-lens.ts` — `Panproto.registerTextFormat` / `registerRefType`.
     The comment there explicitly leans on the flag ("plugin-library is `sideEffects: true`, so it
     is retained"), which is the flag masking a real dependency. Export a `register()` and call it
     from the capability that needs the lens.
  3. `plugin-map-solid` — `components/MapSurface/index.ts` is nothing but `import './MapSurface'`,
     existing only to fire a top-level `customElement('dx-map-surface', ...)`. Export
     `registerMapSurface()` and call it from `capabilities/surface.tsx`.

Follow-ups, in dependency order:

- [ ] Move the three import-time registrations into activation (deck, library, map-solid).
- [ ] Scope the CSS/augmentation packages to the array form rather than `true`.
- [ ] Flip the remaining 88 to `"sideEffects": false` and measure `check-startup-budget`, not
      `check-boot-budget` — the latter is already known flat.

### Follow-up 2026-08-12 (schema capability is eagerly-arrayed at all 101 call sites)

`AppCapability.schema` already accepts the lazy loader form
(`() => Promise<{ default: [...] }>`) exactly as `AppCapability.commands` does — the API
gap is not in app-toolkit, it is that **all 101 call sites pass the eager array**
(`AppCapability.schema([Chess.State, ...])`), which dereferences every schema at plugin-body
module scope. Same shape as the operation-handler-set leak fixed in b4904463: the definitions
are eager even though the consumer is lazy.

No activation question to settle: omitting `activatesOn` already normalizes to
`ActivationEvents.Idle` (see its docstring in `common/activation-events.ts`), and Idle is
documented as being for exactly this kind of registration contribution. So schema is already
idle-activated — the conversion is purely about the MODULE GRAPH, not timing. The array literal
is built when `XPlugin.tsx` is evaluated no matter when the module activates.

- [x] DONE, and MEASURED NEGATIVE: converting the call sites to the loader form moved
      `check-boot-budget` by -354 bytes (4,730,304 -> 4,729,950, 21 chunks either side) on a
      genuinely re-run bundle. The reason is the one anticipated here: the arrays sit in
      `XPlugin.tsx`, already behind the lazy `#plugin` dynamic import, so they were never in the
      boot graph and deferring them defers nothing. Keep the change for consistency with
      `commands` and because it drops `#types` from ~50 plugin bodies, but do NOT record it as a
      startup lever. Untested: whether it moves `check-startup-budget` or lazy-chunk size.
      Shape, for reference: 99 call sites across 52 packages became 62 modules. 44 packages share
      one `schema.ts` across their platform variants (the arrays were previously restated per
      variant); 8 needed `schema.node.ts` / `schema.workerd.ts` because their variants really do
      register different sets — plugin-inbox registers 9 in the browser and 4 headless.

### Follow-up 2026-08-12 (a `#types` barrel import inside a plugin can close an eval cycle)

Routing an intra-plugin sibling import through the package's own barrel (`../types/Drawing` ->
`#types`) is NOT always a rename. The barrel pulls in every sibling module, and if one of them
imports back into the importing directory the cycle closes: `types/index` -> `types/XOperation`
-> `#model` -> `model/builder` -> `#types`. The namespace binding is then still in TDZ when the
first module evaluates, and it fails at RUNTIME as `Cannot read properties of undefined` on a
schema field, with nothing wrong at the type level. Cost 7 new cycles across illustrator, terra
and voxel before CI caught it; fixed by restoring the direct sibling import in those 7 files.

Rule of thumb: prefer `#types` for cross-directory reads, but keep the DIRECT module import when
the target directory's barrel can reach back into yours. In voxel the barrel form also silently
promoted `import type * as Voxel` to a value import, which is what made an erased edge real.

- [ ] `scripts/check-cycles.mjs` covers only `packages/{common,core}` and uses madge, which does
      not resolve the `imports` map — so BOTH the plugins tree and every `#` edge are invisible to
      CI. Extend it to `packages/plugins` with `#` self-reference resolution. Baseline before
      turning it on: 15 pre-existing cycles in plugins (barrel <-> component/hook cycles), so it
      needs an allowlist or those fixed first.

## Finding 2026-08-17 (registry size vs enabled set; the serial body queue; leaves not bodies)

Session log: `PLUGIN-COST-BASELINE.md`, `SURFACE-SEGMENTATION.md`, `STARTUP-TASKS.md` in the
session scratchpad; all experiment edits in the worktree stash `startup experiments 2026-08-17`.
Commit `48ea128db8`, chromium, `vite preview`, warm-cold, 5-run medians unless noted. Dev
defaults (`DX_ENVIRONMENT` unset ⇒ debug + devtools enabled) inflate `profilerTotal` by ~525 ms
(dev 2972 vs production-defaults 2448); deltas hold, absolutes shift.

- **Registering a plugin is nearly free; enabling one is not.** Full (96 registered) vs minimal
  (28): boot graph 4.04 vs 3.93 MB (+1.6 KB per `Plugin.lazy` stub), preload entries 20 both;
  total shipped 137 vs 43 MB (+1.38 MB per plugin). Startup −50% `profilerTotal` (2954 → 1490) —
  entirely the 10 fewer default-enabled plugins, ~146 ms each; transferred bytes moved 5%.
- **One system-tagged plugin (support) in the minimal set:** +186/+422 ms lazy; ~0 after inlining
  its three `Startup`-gated index modules. `run ≈ import` for 97% of the 226 modules (sum run
  20.2 s, sum import 19.7 s, body 0.5 s, wait 39 ms): the cost is the round-trip, not the bytes
  — and it GREW under HTTP/2 (−401/−522 vs −133/−357), so it is not connection queuing.
- **The plugin body queue IS the startup pass** — see A12 above. Discovered by instrumenting
  `resolveLazy`; the catalog had been measuring it as `plugin-load:<id>` all along.
- **Idle is not a wave** — see A14. The `event.idle` measure at ~3.5 s is a no-op dispatch.
- **Graph-builder bodies:** 17 builder modules, 85 extension bodies declared, 33 ran before ready
  (39%) in a fresh profile — matchers on navigated-to nodes defer the rest. Bodies are trivial;
  the heavy four are leaves (component behind `render:`, handler behind `data:`).
- **Rejected by data:** per-role surface segmentation (multiplies round-trips); typename-based
  filters (schemas ~3% of surface-index weight); inlining `SurfacesRequested`-gated modules
  (neutral at best; hoists closures when the descriptor imports a barrel).
- **WebKit bug behind `lazyLoadLock`:** https://bugs.webkit.org/show_bug.cgi?id=242740, fixed by
  https://github.com/WebKit/WebKit/pull/57827 (311236@main), Safari 27 beta notes: "Fixed multiple
  top-level await correctness bugs with a rewrite of the ES module loader for standards
  compliance"; not in shipping 26.6 (2026-08-17). `modulepreload` fetches/parses but does not
  evaluate, so prefetch is safe on old WebKit but cannot lift the serial evaluation. In the
  production bundle the only TLA chunk plugin bodies reach is `boot-8` (both automerge wasm glue
  modules, `browser` condition), which is in `main.tsx`'s static closure — evaluated before any
  body `import()`; the sync `initSync` entries used by `syncWasmInit()` in serve would remove the
  TLA entirely at ~33% wasm-size cost.
