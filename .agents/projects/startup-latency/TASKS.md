# Tasks — startup latency (demand-driven activation)

_Resume: wave 2 batch 2 — the rule-2 offender list (19 definitions, three offense groups in
the Wave 2 section): start with plugin-connector `/types` (pays off 5×) and the app-toolkit
light subpath, then rule 4 (compute barrel Header decouple) and the audit-opdefs CI budget
check; after that, re-run the eager-handler-sets ablation (exit criterion). Uncommitted:
none. Last: wave-2 batch 1 landed (6017b2ce78) — boot fetch 31.1 → 28.8 MB, −40 requests,
definition floor 576 → 445 files; timing flat within the container contention plateau._

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

### Later / standing

- [ ] Critical-chain membership fixes (MAP.md P0): `observability.ClientReady` async body,
      `ProcessManager` activate audit — can land independently of the waves
- [ ] appGraphBuilder post-shell event — deliberately deferred until wave 1's win is measured
- [ ] Tier-aware per-commit trend line (Phase 1 leftover)
- [ ] Warm-reload race root-cause — still gates any scheduling change (round barriers)
