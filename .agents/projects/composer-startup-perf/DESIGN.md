# Composer Startup Performance — Design

_Work-stream: fresh approach to diagnosing, restructuring, and instrumenting composer-app startup.
Predecessor: `packages/apps/composer-app/AUDIT.md` (10 phases shipped; read it first)._

## 1. Problem

composer-app loads ~16 core/system plugins + ~74 user plugins (`plugin-defs.tsx`). Startup is
slow in three distinct senses:

1. **Dev-server cold load** — vite transform of ~2,500 modules; pre-`main:start` gap ~5s even
   after AUDIT phase 10 (warmup + optimizeDeps).
2. **Runtime activation** — `main:start → Startup activated` ~5.4s prod-preview cold;
   top items `plugin.client.module.Client` (~1.8s) and an `*.AppGraphBuilder` cluster.
3. **Perceived** — boot loader now gives two-phase determinate progress (AUDIT phase 8 + Solid
   loader), but the heavy `services` phase and dev pre-main window contribute no real fraction.

The minimal plugin set (`plugin-defs.minimal.tsx`, selected build-time via `DX_PLUGIN_SET=minimal`
→ `serve-min`) dramatically improves dev compile, HMR, and startup — evidence that per-plugin
cost dominates, and motivation for a runtime deferral tier (below).

## 2. What already exists (from survey, 2026-08-02)

- **Profiler** `src/util/profiler.ts` — `startup:*` phase marks, on by default in dev, snapshot to
  localStorage + BroadcastChannel `org.dxos.composer.startup-profile`.
- **Plugin manager marks** — `event:*` / `module:*` measures + DevTools track entries
  (`plugin-manager.ts:1365,1547`, `Performance.addTrackEntry`).
- **PostHog** `composer.startup` event from `main.tsx:262` on `app-framework:startup-activated`.
- **Boot loader** — Solid IIFE injected by `bootLoaderPlugin` (app-framework vite-plugin);
  `window.__bootLoader` progress/status; pre-React 0→0.5 (remote plugin preload), post-React
  0.5→1.0 (module activation PubSub).
- **Harness** — `startup.spec.ts` (cold / warm[skipped-flaky] / warm-cold / throttled-cold) +
  `dev-startup.spec.ts` (dev-cold), appending to `BENCHMARKS.md` (stale since 2026-06-16).
- **Lazy plugins** — every plugin is `Plugin.lazy` (chunk per plugin); `core` = `tags: ['system']`;
  `enabled` from localStorage or defaults. All of `[...core, ...enabled]` is resolved at
  PluginManager construction and fully activated before `Startup` → ready.

## 3. Known blind spots (why prior diagnosis stalled)

1. **Overlapping wall-clock measures lie under concurrency.** Modules activate with
   `concurrency: 'unbounded'`; 8 AppGraphBuilder modules "at ~1.1s each" is almost certainly one
   ~1.1s contended window counted 8 times, not 8× work. Per-module `performance.measure` cannot
   attribute main-thread time. → Need CPU-profile attribution, not more measures.
2. **The pre-`main:start` window is uninstrumented** (largest slice on dev cold). Only inferable
   as navToReady − profilerTotal in the harness; absent from telemetry.
3. **`boot:html-parsed` is read but never written** (died when the boot loader moved into the vite
   plugin) — `bootLoaderVisibleMs` is always null.
4. **Orphan marks** — `client.initialize`, `worker-connection:spawned/session-ready`,
   `dedicated-worker:session-ready`, echo indexing marks don't match the profiler prefixes, so the
   1.8s Client module can't be decomposed into worker spawn vs client init vs OPFS.
5. **No per-plugin lazy-resolve timing** — `_resolveLazyPlugin` chunk fetch+eval is folded into
   whichever module triggered it.
6. **Warm-reload race** — the "System Error" flake (60–90% of warm reloads in the phase-4/5 era)
   blocks any yield/concurrency change in the activation cascade
   (`plugin-manager.ts:1502` comment). Any structural change must be validated against warm
   reloads specifically.

## 4. New approach

### A. Diagnosis: attribute main-thread time, don't sum overlapping measures

- **A1. CPU profile capture.** Playwright CDP `Profiler.start/stop` across the whole startup;
  aggregate self-time by script URL → per-package/per-plugin attribution table. This answers
  "where do the milliseconds actually go" (module eval vs schema registration vs React render vs
  GC) in a way `performance.measure` cannot.
- **A2. Long-task timeline.** PerformanceObserver on `longtask`/`long-animation-frame` recorded
  into the profiler snapshot — shows main-thread blocks that starve paint (the thing users feel).
- **A3. Fresh baselines.** Re-run harness (cold, warm-cold, dev-cold) on current main-ish code,
  full and minimal plugin sets, appending BENCHMARKS rows — the ledger is 6 weeks stale and all
  prior numbers predate the Solid boot loader.
- **A4. Dev-transform attribution.** For the dev server: count/time per-package module requests
  (vite `--debug transform` or middleware timing) to rank which plugin subtrees cost the most
  transform time — this is what the minimal set is avoiding.

### B. Startup structure: a deferral tier, not yields

The phase-4 lesson: do not insert yields/concurrency bounds inside the activation cascade.
Instead change **which plugins are in the pre-ready set**:

- **B1. Two-wave activation.** Wave 1 = core/system plugins (+ a small "critical" allowlist,
  e.g. whatever owns the attended item's surface) activates to `Startup` → ready → first paint.
  Wave 2 = remaining enabled user plugins, enabled after first paint (idle callback / post-ready
  effect). The PluginManager already supports dynamic `enable()` (the registry plugin uses it);
  this reuses the supported path rather than racing the cascade.
- **B2. Risks to measure/handle:** surfaces appearing late (navtree items pop in), a deep-linked
  URL whose plugin is in wave 2 (must promote on demand — the fallback/pending surface state),
  settings/schema readiness assumptions, and the warm-reload race (validate with repeated warm
  reloads). Gate behind a query param / env flag so it's a measurable experiment, not a commitment.
- **B3. Client-module decomposition** (if A1 shows it's real work, not contention): overlap worker
  spawn with earlier phases; the orphan marks folded in by C1 will show the split.

### C. Instrumentation & boot-loader feedback

- **C1. Close the mark gaps:** write `boot:html-parsed` from the injected boot-loader config
  script; add `startup:pre-main` measure (navigationStart → main:start); rename/bridge the orphan
  worker+client marks into the snapshot; add `lazy:<plugin>` resolve measures in
  `_resolveLazyPlugin`.
- **C2. Boot loader fidelity:** real fraction for the `services` phase (sub-steps already exist as
  orphan marks); status lines for wave-2 deferred loading ("Loading 43 more plugins…") so deferral
  is visible, not mysterious.
- **C3. Startup report surface:** the BroadcastChannel snapshot has zero consumers. Cheap win: a
  devtools/debug panel (or `window.composer.profiler.report()` pretty-printer) that renders
  phases + top modules + long tasks, so every dev sees the same report without DevTools archaeology.

## 5. Order of work (overnight)

1. Verify run+measure loop (serve, serve-min, harness) — no code changes.
2. A3 fresh baselines; A1 CPU-profile capture script; produce attribution table.
3. C1 instrumentation fixes (small, land-able PR material).
4. B1 deferral prototype behind a flag; measure cold/warm/warm-cold + repeated warm reloads.
5. C2/C3 as time allows.

## 6. Decisions & findings log

- **2026-08-02 CPU-profile attribution (dev, warm vite, fresh browser context; script
  `scripts/profile-startup.mjs`).** Full set navToReady ~12.2–13.2s vs minimal ~7.4s. Self-time
  split (full): `(program)` parse/compile+GC 4.4–5.2s, `(idle)` waiting on workers/network
  3.5–3.8s, Effect schema eval (SchemaAST+Schema+ParseResult) ~1.1s, `plugin-calls` 313–432ms
  (single-plugin outlier), Atom ~270ms, echo ~200ms. Minimal cuts ~42% roughly proportionally
  (program 2.7s, idle 2.5s, schema ~0.6s) → plugin count drives parse+schema+idle together;
  ~7.4s floor is core infra. Confirms (1) per-module `module:*` measures are an
  overlapping-window artifact (modules "cost" 3.4s each while true JS total is ~3.5s); (2) the
  deferral tier attacks the right axis; (3) the ~2.5s idle floor needs decomposition (C1 orphan
  marks: client.initialize / worker spawn / OPFS).
- **2026-08-02 profiler was silently OFF in dev.** `isTrue(param, default)` misuse in main.tsx —
  the second arg is a *strictness* flag, so AUDIT phase 7a's "default-on in dev" never worked
  (also means dev BENCHMARKS rows since then recorded no profiler data). Fixed.
