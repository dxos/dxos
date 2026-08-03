# Tasks — startup latency (demand-driven activation)

_Resume: navToReady critical path fully attributed (see "Critical path" below). Levers 1–4
landed (yields, scoped pulls, concurrent enables, bounded waves). Next: (a) SDK `_open()`
split — the 3.2 s worker/HALO/ECHO block; (b) defer heavy spacesReady-gated modules
(Repair, BeaconServiceModule, TriggerRuntimeController, thread/calls AppGraphBuilder) to
idle; (c) streaming start (begin round 1 before the full enable set registers). Uncommitted:
none. Last: client.initialize marks landed; warm-cold primer document priming parked._

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

### Wave 2 — lightweight operation definitions ([DEFINITIONS-AUDIT.md](./DEFINITIONS-AUDIT.md))

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
- [ ] Promote `audit-opdefs.py` to a CI budget check (fails on new heavy externals / closure
      growth) — prerequisite hardening for the `handles` declaration field
- [ ] **Non-enabled plugins load metadata only.** Verify the invariant: a registered-but-disabled
      plugin contributes nothing to the boot fetch beyond its meta + `Plugin.lazy` code pointer —
      at startup or ever. Plugin definitions themselves must be lightweight (metadata + module
      pointers), same discipline as operation definitions. Known violation: all 97 `plugin.ts`
      stubs statically re-export `XOperationHandlerSet from './operations'` (plugin-defs.tsx
      imports every stub, so every registered plugin's operations graph enters `main`'s closure
      whether enabled or not). Add a measured check: chunk-graph closure of each `plugin.ts`
      stub ≈ meta only.

### Wave 3 — eager-core UI laziness audit

Components loaded before `main()` that should be lazy. Known from the chunk graph:

- [ ] `ResetDialog` lazy (`main.tsx:32` static import drags `react-ui-form` → emoji-mart 479 KB,
      motion, mdast/mermaid, ajv/zod — ~2 MB for a fatal-error dialog)
- [ ] Sweep the rest of `main`'s 9 MB / 874-chunk static closure for same-shape offenders
      (audit method: chunk-stats static closure of the entry, biggest facades first)
- [ ] fast-check in production: `@effect/ai`'s `LanguageModel` → `Arbitrary` → fast-check
      (298 KB) — investigate whether the Arbitrary path is test-only upstream, can be
      externalized/stubbed in the build, or needs an upstream issue

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

- [ ] Boot waterfall: stitch navigationStart → ready from existing marks + new milestones
      (identity created, default space ready, ECHO available, first plank interactive); emit
      from `collectStartupReport` as one timeline — decomposes the un-itemized ~5 s outside
      the activation window
- [ ] Lab TBT: longtask observer in the harness (sum blockage >50 ms between FCP and ready);
      the INP-risk proxy and the direct measure of fan-out main-thread damage
- [ ] Time-to-first-meaningful-action marks per entry path (returning: editor accepts input;
      first-run: identity + home actionable)
- [ ] RUM prerequisite: extend observability `composer.startup` with the waterfall marks +
      web-vitals (LCP/INP/CLS) so field p75 exists before claiming wins
- [ ] CI budget gate = our harness (not Lighthouse): thresholds on boot bytes, activations,
      lab TBT, definition-closure budget (audit-opdefs); alert thresholds below pass line;
      p75-style reporting over N runs on a fixed runner

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
- [ ] Lever 5 — SDK `_open()` split: 3.2 s of worker spawn + HALO identity + ECHO open
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
- [ ] Lever 7 — streaming start: begin round 1 as plugin definitions register instead of
      after the full enable set (Client could start ~1.4 s earlier — now the largest
      module-side block on the critical path).
- [ ] Graduate the PoC: replace the coarse DeferredStartup gate with precise demand events
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

- [ ] Critical-chain membership fixes (MAP.md P0): `observability.ClientReady` async body,
      `ProcessManager` activate audit — can land independently of the waves
- [ ] appGraphBuilder post-shell event — deliberately deferred until wave 1's win is measured
- [ ] Tier-aware per-commit trend line (Phase 1 leftover)
- [ ] Warm-reload race root-cause — still gates any scheduling change (round barriers)

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
  Remaining top owners are boot-legitimate: effect 780KB, react-dom 744KB, protocol codecs
  123KB, automerge (echo proxy) ~240KB.
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
