# Composer Startup Performance — Tasks

_Resume: (1) rerun prod harness for BENCHMARKS rows (was interrupted), (2) AUDIT.md addendum documenting the 2026-08-02 regression audit + fixes, (3) B2 deep-link check, (4) e2e-dev harness confirm, (5) remaining Phase E follow-ups (floor, guardrail, stub sweep). Uncommitted: none. Last: plugin-calls placeholder fix committed (0a7cea1bde); all servers stopped 03:04 by user request, resuming ~06:05._

## Phase 0: verify tooling (no code changes)

Prove the measure loop works in this worktree before touching anything.

### Tasks

- [x] **Start `composer-app:serve` (full plugin set) and load it** — verified on :5180
      (launch config `composer-app-proto`); warm-dev snapshot captured (profilerTotal ~23.8s,
      first-interactive ~30s, noisy double-reload). FINDING: profiler was silently OFF in dev —
      `isTrue(param, default)` misuse (second arg is a strictness flag); fixed in main.tsx.
- [x] **Start `serve-min` and compare** — dev warm: full ~12.2–13.2s navToReady vs minimal ~7.4s.
- [x] **Storybook starts** — verified on :9014 (`storybook-9014` config), index.json serving; stopped after smoke.
- [ ] **Run the dev-startup harness** (`composer-app:e2e-dev`) once to confirm it still works.

## Phase A: diagnosis (attribution, not aggregate measures)

See DESIGN.md §4A and §6 findings log.

### Tasks

- [x] **A3. Fresh baseline rows** — prod cold + warm-cold appended to BENCHMARKS.md 2026-08-02.
      HEADLINE: cold profilerTotal 6.7s (06-16) → 18.0s, navToReady 11.4s → 30.7s (~3× regression);
      root cause = eager static graph regrew to 879 chunks / 10.8MB (phase-2 win reversed).
- [x] **A1. CPU-profile capture** — `scripts/profile-startup.mjs` (CDP profile + attribution +
      request waterfall + snapshot); analyzer `scripts/analyze-cpuprofile.mjs`;
      graph tracer `scripts/trace-eager-graph.mjs` (BFS over DX_STATS graph.json).
- [x] **A2. Long-task observer** in the profiler snapshot.
- [ ] **A4. Dev-transform attribution** — rank plugin subtrees by vite transform cost.

## Phase C1: close instrumentation gaps (small, land-able) — DONE

- [x] **Write `boot:html-parsed`** from the boot-loader injected config script.
- [x] **`startup:pre-main` measure** (navigationStart → main:start) in the snapshot phases.
- [x] **Fold orphan marks into the snapshot** — `services` section: `client.initialize`,
      `worker-connection:spawn→session-ready`, `dedicated-worker:session-ready`, `boot:html-parsed`.
- [x] **Per-plugin lazy-resolve measures** in `_resolveLazyPlugin` (`lazy:<id>` + snapshot section).

## Phase E: eager-graph de-bloat (the regression fix)

Ground truth from `trace-eager-graph.mjs` + sourcemap byte attribution. Eager graph was
**879 chunks / 10.8MB** (raw 8,301 modules); now **519 chunks / 3.72MB** (raw 5,081).

- [x] **plugin-progress stub was fully eager** (`export * from './ProgressPlugin'`, 5,202 modules
      reach incl. all of react-aria/date-fns/react-ui) → standard `Plugin.lazy` stub + `/testing`
      entry for storybooks (webkit rationale in plugin-testing/src/core.ts).
- [x] **plugin-theme stub was fully eager** (`export * from '#plugin'`) → lazy stub.
- [x] **Handler-set splits** — stub `export { XOperationHandlerSet } from './operations'` dragged
      definitions/extractors: inbox (+2,133 modules: pipeline-rdf/traqula/comunica + @dxos/ai
      anthropic), blogger (+1,028), space (+535), spotlight (+530, was fully inline → handlers.ts + `OperationHandlerSet.async`), registry. Pattern: stub imports leaf
      `operations/handler-set.ts` which must stay import-light (NOTE comments in each).
- [x] **plugin-registry meta.ts** imported `GraphPath` from the app-toolkit barrel (→ sdk/client)
      → helpers moved to `src/paths.ts` (`#paths`), meta stays light.
- [x] **ResetDialog lazy** — composer's fatal-error dialog statically pulled react-ui-form →
      pickers (emoji-mart 483KB), RefEditor → ui-editor (codemirror+mermaid ~430KB), ViewEditor →
      react-ui-components → mcp-client (MCP SDK), Form → markdown → syntax-highlighter →
      `React.lazy` + Suspense in main.tsx.
- [x] **edge-client dynamic** in main.tsx (barrel → credentials → bip39).
- [x] **app-toolkit barrel → `@dxos/app-toolkit/events`** subpath in main.tsx.
- [x] **credentials barrel dropped seedphrase** (bip39 185KB) → `@dxos/credentials/seedphrase`
      subpath; only consumer (client-services identity-recovery-manager) repointed.
- [x] **util/config.ts `@dxos/client` barrel** → `@dxos/client/version` subpath (new export);
      `Remote` now from `@dxos/config`.
- [ ] **Verify prod cold + dev-warm improvements end-to-end** (harness rows + CPU profile).
- [ ] **Floor follow-up:** every stub still reaches ~1,311 raw modules via the `@dxos/app-framework`
      root barrel (920 modules: effect 260 + fast-check 223 via effect/Schema→FastCheck + otel +
      @effect/platform) and `dx.config` chain. Needs a light `Plugin`-only entry or barrel slimming.
- [ ] **Guardrail:** CI check that fails when the eager preload count/bytes regress
      (`index.html` modulepreload count is a cheap proxy; add to bundle task).
- [ ] **Sweep remaining stubs** for the handler-set rule (44 plugins currently at floor — enforce
      leaf-import pattern so they stay there).

## Phase B: deferral prototype (flag-gated)

See DESIGN.md §4B. Two-wave activation: core+critical before ready; the rest post-first-paint via
the supported dynamic `enable()` path (replay via `pendingReset` in `_enableOne`,
plugin-manager.ts:699). NOT yields inside the cascade (phase-4 revert lesson).

### Tasks

- [x] **B1. Prototype behind flag** — `?defer=1`; `ManagerOptions.deferred` +
      `PluginManager.enableDeferred()` (idle callback after Startup activates in useApp).
      GOTCHA hit and fixed: the `defer` predicate must be referentially stable or the manager
      memo re-creates the PluginManager in a render loop (constructor enable pass restarts
      forever — 9,789 lazy-resolve measures before diagnosis).
- [x] **B1. Measure** — dev warm: profilerTotal 9.7s → 4.5s (−53%), long tasks −60%;
      prod cold: profilerTotal 16.5s → ~10s (−40%), navToReady 22.3s → ~16.8s. navToReady's
      floor is identity creation + client init, not plugins.
- [x] **B2. Repeated warm reloads** — 10/10 passed with defer on (prod preview).
- [ ] **B2. Deep-link into a wave-2 plugin** — verify promote-on-demand or document the gap.
- [ ] **Decide default-on** (user call): flag default, critical allowlist (e.g. keep the
      attended item's plugin in wave 1), wave-2 UX (surfaces pop in late).

## Phase D: targeted fixes from attribution

- [x] **plugin-calls: defer placeholder media tracks to call join** — `MediaManager._open()`
      eagerly ran `createBlackCanvasStreamTrack` + `createInaudibleAudioStreamTrack`
      (`new AudioContext()`) at startup ≈ 430ms main-thread, consumed only once a call is active.
      Now created lazily via `_ensurePlaceholderTracks()` on first `join()` (completion flag,
      reset in `_close()`).
- [ ] **observability.module.ClientReady** — 3.1s on prod cold (snapshot 2026-08-02); decompose.

## Phase C2/C3: boot-loader feedback (as time allows)

- [ ] **C2. Real fraction for `services` phase** from its sub-marks; wave-2 status lines.
- [ ] **C3. Startup report consumer** — pretty report from the BroadcastChannel/snapshot.

### References

- `packages/apps/composer-app/AUDIT.md` — prior 10-phase effort; §9 phase log; phase-4 revert.
- `packages/apps/composer-app/BENCHMARKS.md` — ledger.
- `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md` — minimal set design.
