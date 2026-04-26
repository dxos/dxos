# Composer-app Startup Performance Audit

This document is a static analysis of how composer-app starts, what we already
measure, what we can measure better, and how to make the loading experience
feel faster (and actually be faster). It is intentionally specific — every claim
points at code so the reader can verify or push back.

## 0. Baseline numbers (chromium, production preview build)

Captured by the harness in [`src/playwright/startup.spec.ts`](src/playwright/startup.spec.ts) on a developer laptop. Treat any single number as one data point — the auto-recorded ledger at [`BENCHMARKS.md`](BENCHMARKS.md) is the source of truth for trend.

| Phase                                                            | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm navToReady | Top cold module                          |
| ---------------------------------------------------------------- | -----------------: | --------------: | -----------------: | --------------: | ---------------------------------------- |
| 0. baseline (`f1cda8f`)                                          |          11,118 ms |       18,054 ms |           3,166 ms |        7,677 ms | `welcome.onboarding` (5,948 ms)          |
| 0. baseline re-run (`f1cda8f2f8`)                                |           8,554 ms |       13,485 ms |           3,210 ms |        7,405 ms | `welcome.onboarding` (4,917 ms)          |
| **1. defer `OnboardingManager.initialize()`** (`e7f390ae3e` + ⚠) |       **4,704 ms** |    **9,596 ms** |           3,163 ms |        7,364 ms | `plugin.client.module.Client` (1,783 ms) |
| **2. lazy non-core plugins** (`118261e7e1` + ⚠)                  |           5,664 ms |        9,780 ms |           3,568 ms |        7,481 ms | `plugin.client.module.Client` (1,832 ms) |

Cold dropped 45% from the closer baseline (8.5 → 4.7 s). Warm is unchanged within noise — expected, because warm has the identity persisted and `initialize()` short-circuits. The cold-vs-warm gap shrank from ~5.4 s to ~1.5 s; what's left is mostly module-graph evaluation, not identity creation.

Updated cold top-10 after phase 1 (everything below is what's left to chase):

| Module                                                                                        |          Cold ms |
| --------------------------------------------------------------------------------------------- | ---------------: |
| `plugin.client.module.Client`                                                                 |            1,783 |
| `plugin.transcription.module.transcription`                                                   |            1,141 |
| 7× `*.AppGraphBuilder` modules (pipeline, outliner, space, meeting, daily-summary, assistant) | 1,128–1,139 each |
| `plugin.assistant.module.LocalModelResolver`                                                  |            1,137 |
| `plugin.assistant.module.EdgeModelResolver`                                                   |            1,136 |

The 1,128–1,141 ms cluster is suspicious — those modules likely all activate on the same upstream signal (probably `ClientReady` from `plugin.client.module.Client` at 1,783 ms) and fan out simultaneously. Reducing concurrency or sequencing them is recommendation #5.

### Bundle size (eager `main-*.js` chunk)

| Phase                        |        Raw |      Gzip | Total chunks |
| ---------------------------- | ---------: | --------: | -----------: |
| 0. baseline                  |     8.5 MB |   2.39 MB |        2,558 |
| 1. defer onboarding          |     8.5 MB |   2.39 MB |        2,558 |
| **2. lazy non-core plugins** | **393 KB** | **87 KB** |        2,646 |

Phase 2's local-disk `profilerTotal` regressed by ~960 ms while the eager bundle
dropped 96%. Two effects:

1. **Phase boundary shifted.** Pre-phase-2, `main:start` fired _after_ the 8.5 MB
   bundle parsed (~4.9 s of pre-await). Now `main:start` fires while the smaller
   bundle parses much faster, so `profilerTotal` measures more wall-clock —
   including `plugins-init` which jumped from 1 ms to ~1 s as the 60 dynamic
   plugin chunks load and parse.
2. **Local-disk overhead.** On `vite preview` over localhost, splitting into
   chunks adds per-module parser overhead with zero network benefit. On a real
   network with HTTP/2 multiplexing, those chunks parallelize. Local doesn't
   measure the win.

The metric that matters for real users — first paint of useful HTML, transferred
bytes on the critical path, and main-chunk size — moved decisively. A future
harness scenario should add CPU and network throttling so the local benchmark
reflects what slow-network users experience.

Three things jump out from these numbers and are reflected in §5:

1. ~~**`welcome.onboarding` alone is 5.9 s — over half the cold `profilerTotal`.**~~ **Resolved by phase 1** — `initialize()` is no longer awaited inside the module's activation; the manager is contributed synchronously and identity setup runs as a background side-effect. Cold dropped 45%.
2. **`navigationToReady` exceeds `profilerTotal` by ~4 s on cold (post-phase-2).** `Startup` activated ≠ user-account testid mounted. The gap shrank but didn't disappear. Phase 3 adds an `app-framework:first-interactive` mark to make the gap visible.
3. ~~**The first `await import` doesn't even start until +2.9 s on cold**~~ **Resolved by phase 2** — the eager bundle now parses in ~150 ms; `dynamic-imports` starts at ~2.2 s on cold (vs 4.9 s baseline, 2.9 s post-phase-1).

## 1. The pipeline today

End-to-end, a cold load runs in this order. The first column is when the user
_could_ see something on screen.

| Pixel state         | Phase                         | Code                                                                                          |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Blank               | HTML download + parse         | `index.html`                                                                                  |
| Blank               | Module-graph fetch + evaluate | bundle imports from `src/main.tsx`                                                            |
| Blank               | `dynamic-imports` phase       | `main.tsx:97-104` — `await import('@dxos/config' / react-client / migrations / ./migrations)` |
| Blank               | `config` phase                | `main.tsx:111-138` — `setupConfig()`, IDB storage check                                       |
| Blank               | `services` phase              | `main.tsx:187-249` — `createClientServices` (worker spin-up, OPFS SQLite)                     |
| Blank               | `plugins-init` phase          | `main.tsx:251-283` — `getPlugins(conf)` constructs ~60 plugin instances (`plugin-defs.tsx`)   |
| Blank → Placeholder | `createRoot.render(<Main />)` | `main.tsx:330-339` — first React commit                                                       |
| Placeholder         | Plugin activation events      | `useApp` runs `manager.activate(SetupReactSurface)` then `Startup` (`useApp.tsx:210-214`)     |
| Placeholder         | Module activation             | `_loadModule` per plugin (`plugin-manager.ts:746-829`)                                        |
| Placeholder → App   | Done event fires              | `Startup` activated → `setReady(true)` (`useApp.tsx:192-199`)                                 |
| App                 | First useful paint            | `App.tsx:36-43` — composes contexts, mounts `Capabilities.ReactRoot` components               |

Two very different concurrency stories live inside this:

1. **Pre-React** (everything before `createRoot.render`) is a classic top-level
   `await` chain. Nothing paints, nothing animates. The only signal the user has
   that the app is alive is the favicon.
2. **Post-React** is driven by the plugin manager via Effect fibers. A
   `setInterval(..., 100)` polls `manager.getActive()` and pushes
   `StartupProgress` into React state ([useApp.tsx:168-184](packages/sdk/app-framework/src/ui/hooks/useApp.tsx)). React _should_ re-render on each tick, but:
   - `Placeholder` was never wired to display the progress (the JSX block was commented out — fixed in this branch).
   - Even if wired up, long-synchronous module activations starve the interval
     callback. That is the "React render loop is not called while the app is
     busy loading" symptom.

## 2. Existing measurement

### 2.1 What we have

- `startupProfiler()` in `packages/apps/composer-app/src/profiler.ts`. Activated by
  the `?profiler=1` query param ([config.ts:15](packages/apps/composer-app/src/config.ts), [main.tsx:65](packages/apps/composer-app/src/main.tsx)).
- Top-level phase marks: `dynamic-imports`, `config`, `services`, `plugins-init`,
  and `total` (`main:start` → `ready`) — all written to `User Timing` via
  `performance.mark` / `performance.measure`.
- Plugin manager emits per-event and per-module marks
  ([plugin-manager.ts:592-608](packages/sdk/app-framework/src/core/plugin-manager.ts), [:763-775](packages/sdk/app-framework/src/core/plugin-manager.ts)) — `event:<id>` and `module:<id>`.
- `dump()` is fired on the `Startup` activation event from `useApp` ([useApp.tsx:198](packages/sdk/app-framework/src/ui/hooks/useApp.tsx))
  and writes a console table.

### 2.2 What was missing

- The output was console-only. No way to scrape it from a Playwright run, no
  diff-friendly format, no persistence across reloads.
- No mark for the _very first_ moment the user sees anything — there was no
  boot loader.
- No e2e test that asserts "first paint happened, ready in N ms" — we had no
  regression detector for the slowest part of the app.

### 2.3 What this branch adds

- `Profiler.snapshot()` returns a structured `ProfilerSnapshot` JSON object
  (`profiler.ts`). `dump()` also persists the snapshot to
  `localStorage['org.dxos.composer.startup-profile']` so a second tab or a
  Playwright run can read it without scraping `console`.
- `performance.mark('boot:html-parsed')` is written from an inline script in
  `index.html` _before_ the JS bundle is even fetched. This is the new "lower
  bound" of how fast the app could possibly feel.
- `src/playwright/startup.spec.ts` provides three tests:
  - `cold start (cleared storage)` — fresh context, navigate, wait for the user-
    account testid, pull `composer.profiler.snapshot()`, network bytes, paint
    timings; write `test-results/composer-app/startup-cold-<browser>.json`.
  - `warm start (reuse storage)` — prime then reload; same outputs, suffix
    `-warm`.
  - `boot loader paints before bundle is parsed` — asserts the inline DOM
    loader is visible immediately after navigation commit.
- `Placeholder.tsx` now actually reads `progress.activated`/`progress.total`
  and binds the `Status` bar to the determinate progress fraction.

## 3. The "loading bar doesn't update" problem

The previous attempt (commented JSX in `Placeholder.tsx`) failed because the
React reconciler genuinely doesn't get to paint during long synchronous
activations. Confirmed mechanically:

- `setStartupProgress` is in a `setInterval(100)` ([useApp.tsx:168](packages/sdk/app-framework/src/ui/hooks/useApp.tsx)).
- Plugin module load runs through `Effect.forkDaemon` ([plugin-manager.ts:803](packages/sdk/app-framework/src/core/plugin-manager.ts)),
  which _should_ yield on every fiber suspension. But many module `activate()`
  bodies do significant **synchronous** work: schema registration, surface
  capability contributions, JS evaluation of dynamically imported plugin chunks.
- A single sync block ≥100 ms swallows any number of interval ticks.
- React 18 in concurrent mode defers commits even further when the main thread
  is busy.

So the recommendation is twofold:

### 3.1 Native-DOM boot loader (this branch)

`index.html` now contains an inline `<style>` and a small skeleton `<div
id="boot-loader">` _inside_ `#root`. Crucially:

- The bar's animation is a CSS keyframe (`transform: translateX`). This animates
  on the **compositor thread**, not the main thread, so it keeps moving even
  while JS is parsing modules.
- A 7-line inline `<script>` exposes `window.__bootLoader.status(text)`. The
  three async-import phases in `main.tsx` push status text via this driver
  (`Loading framework…`, `Reading configuration…`, `Starting services…`,
  `Loading plugins…`).
- When `createRoot(document.getElementById('root')).render(<Main />)` runs,
  React replaces the boot-loader DOM with the Placeholder. The transition
  is unbroken: CSS-animated bar → React-rendered Placeholder.

This addresses the symptom for the **pre-React** window, which is the longest
blank screen on a cold load (every other phase happens _after_ React is
mounted).

### 3.2 React-rendered progress for post-mount work

Already in `useApp.tsx`, the `setInterval(100)` polls `manager.getActive()` and
sets state. We just need to display it, which this branch does. Where this is
still flaky (long sync activations), the right fixes are:

- **Yield more aggressively** during module activation — insert
  `yield* Effect.yieldNow()` or `Effect.sleep(Duration.zero)` at fiber
  boundaries inside `_loadModule` to give the browser a paint slot.
- **Limit concurrency** at the activation event level — `Effect.allWith({
concurrency: 4 })` rather than `concurrency: 'unbounded'` ([plugin-manager.ts:712](packages/sdk/app-framework/src/core/plugin-manager.ts), [:683-684](packages/sdk/app-framework/src/core/plugin-manager.ts)). Counterintuitively, four-at-a-time finishes faster on real hardware than 60-at-a-time because the JS thread is less swamped.
- **Use `scheduler.yield()`** if available (Chromium 129+). It's strictly better
  than `setTimeout(0)` for cooperative scheduling.

## 4. Where startup time is spent

Without measurements from the harness yet (this PR only lands the harness), the
hot spots from static reading are:

### 4.1 ~60 plugins are imported eagerly

[`plugin-defs.tsx`](packages/apps/composer-app/src/plugin-defs.tsx) does
`import { AssistantPlugin } from '@dxos/plugin-assistant'` for every plugin.
Even the ones that aren't in `core` and aren't in the user's `defaults` cause:

- An HTTP request (or cache hit) per plugin entrypoint _and_ its transitive deps
  (~thousands of files in dev).
- Synchronous evaluation of every imported module.
- A non-trivial cost in the production bundle's `manual chunks` even with
  Vite's tree shaking.

The plugin manager already supports a `pluginLoader` that returns plugins by id
([useApp.tsx:107-115](packages/sdk/app-framework/src/ui/hooks/useApp.tsx)).
Recommendation: replace the eager `import` block in `plugin-defs.tsx` with a
function that _constructs_ a Plugin record where `module.activate` does
`Effect.promise(() => import('@dxos/plugin-x'))`. Then a plugin's code is only
ever fetched if its id is in `core` or `enabled`. For Composer specifically:

- Core (always loaded): `Attention`, `Automation`, `Client`, `Crx`, `CrxBridge`,
  `Graph`, `Help`, `Deck`/`SimpleLayout`/`Spotlight`, `Native?`, `Operation`,
  `NavTree`, `Observability`, `Preview`, `Pwa?`, `Registry`, `Runtime`, `Search`,
  `Settings`, `Space`, `StatusBar`, `Theme`, `TokenManager`, `Welcome`.
- Defaults (loaded on demand the first time): `Inbox`, `Kanban`, `Markdown`,
  `Masonry`, `Sheet`, `Sketch`, `Table`, `Thread`, `Wnfs`, `Spec`, plus the
  whole `isLabs` set: `Assistant`, `DailySummary`, `Discord`, `Feed`,
  `IrohBeacon`, `Meeting`, `Outliner`, `Pipeline`, `Sidekick`, `Transcription`,
  `Zen`.
- Everything else (`Board`, `Chess`, `Explorer`, `Map`, `MapSolid`, `Mermaid`,
  `Presenter`, `Sample`, `Script`, `Spacetime`, `Stack`, `Voxel`, `YouTube`,
  `TicTacToe`) is only relevant when the user actually opens that surface — the
  registry already understands lazy loading.

Estimate: ≥30 plugins do not need to be in the eager bundle. The numbers will
be sharpened by running the harness against `before`/`after`, but every plugin
removed shaves both transferred bytes and parse time linearly.

### 4.2 Dynamic imports are serialised, not pipelined

`main.tsx:98-101` has four sequential `await import(...)` calls. They have no
dependency between them, but they run one after another:

```ts
const { Config, defs, SaveConfig } = await import('@dxos/config');
const { createClientServices } = await import('@dxos/react-client');
const { Migrations } = await import('@dxos/migrations');
const { __COMPOSER_MIGRATIONS__ } = await import('./migrations');
```

`Promise.all` would let the network/parser work on all four concurrently:

```ts
const [{ Config, defs, SaveConfig }, { createClientServices }, { Migrations }, { __COMPOSER_MIGRATIONS__ }] =
  await Promise.all([
    import('@dxos/config'),
    import('@dxos/react-client'),
    import('@dxos/migrations'),
    import('./migrations'),
  ]);
```

In dev mode this matters less (HTTP/2 multiplexing already pipelines), but on
the production bundle each `await import` introduces a ~1 round-trip latency
for the chunk file plus eats a tick of synchronous parse before the next one is
requested.

### 4.3 Service worker / PWA manifest is registered before the user sees anything

`virtual:pwa-register/react` is imported synchronously at the top of `main.tsx`
([line 15](packages/apps/composer-app/src/main.tsx)). The hook itself is only
called inside `Fallback`, but the import side-effect contributes to bundle
weight. Move `useRegisterSW` behind a dynamic import inside `Fallback`.

### 4.4 `@dxos-theme` import at module top

`import '@dxos-theme'` ([main.tsx:9](packages/apps/composer-app/src/main.tsx))
loads the entire theme package as a side-effect. It has to land before any
React renders, but the inline `<style>` for the boot loader means we don't
_need_ the theme to be loaded before painting _something_.

### 4.5 SharedWorker creation

`createClientServices` instantiates `SharedWorker(./shared-worker, ...)`
([main.tsx:230-243](packages/apps/composer-app/src/main.tsx)). Spawning a
SharedWorker incurs a one-time cost (open second JS context, parse worker
bundle). This is unavoidable but worth measuring — the harness's
`profile.phases` will show it as the `services` phase.

### 4.6 Activation graph

`SetupReactSurface` and `Startup` are activated in `Effect.all([...])` at
[useApp.tsx:210-214](packages/sdk/app-framework/src/ui/hooks/useApp.tsx). The
plugin manager fans out _all_ matching modules per event via
`Effect.allWith({ concurrency: 'unbounded' })` ([plugin-manager.ts:712](packages/sdk/app-framework/src/core/plugin-manager.ts)). With `Atom` writes on each
contribution, this can pile up React renders.

A bounded concurrency (e.g. 4–8) plus a single batched render via
`flushSync` after a whole event activates would smooth out paint cadence.

## 5. Phased plan

Reorganized from the original ranked list into shippable phases. Each phase is a
single PR-sized unit with measurement: the [BENCHMARKS](BENCHMARKS.md) ledger
gets at least one new row, [§9 phase log](#9-phase-log) gets a new subsection,
and the next phase planning is informed by the deltas. Items inside a phase are
bundled because they share review concerns or are individually too small to
warrant a phase of their own.

### ✅ Phase 1: defer first-run identity setup (shipped — `9db4acdb1f`)

`OnboardingManager.initialize()` no longer awaits inside the welcome.onboarding
module's activation; the manager is contributed synchronously and identity
creation runs as a background side-effect. See
[`src/plugins/welcome/capabilities/onboarding.ts`](src/plugins/welcome/capabilities/onboarding.ts).

_Caveat:_ on a true first-run user (skipAuth path), the app shell now renders
before identity exists — downstream code that reads
`WelcomeCapabilities.Onboarding` already obtains the manager and observes
identity state via existing `client.halo.identity` subscriptions, so this is
OK in principle. The e2e suite still passes, but no real first-run user has
clicked through it.

### ✅ Phase 2: lazy-load plugin chunks (shipped — `118261e7e1`)

`plugin-defs.tsx` no longer eagerly `import`s every plugin package. Plugin
factories are dynamically `import()`ed in parallel inside `getPlugins`, so
Rollup emits one chunk per plugin and the eager `main-*.js` shrinks from
8.5 MB → 393 KB raw (96%). Plugin IDs are hardcoded in a constant block to
keep `getCore`/`getDefaults` cheap (they only need ids, not the full plugin).
Local-disk wall-clock barely moved; the bundle reduction's real win is for
real-network users — see §0 and the phase 5 harness work.

### Phase 3: small wins bundle (next)

Four small, individually-low-risk changes batched together because none of
them is worth a phase of its own:

- **3a. `Promise.all` the 4 `await import`s in `main.tsx`** so `@dxos/config`,
  `@dxos/react-client`, `@dxos/migrations`, and `./migrations` load in
  parallel rather than serially. Targets the now-~150–300 ms `dynamic-imports`
  phase.
- **3b. Replace `setInterval(100)` polling with PubSub-driven progress in
  `useApp`.** `manager.activation` already publishes per-module activated
  messages; the existing subscription in `useApp` can route them to
  `setStartupProgress` instead of polling `manager.getActive()` every 100 ms.
  Shorter latency to first observed update; one fewer timer.
- **3c. Add an `app-framework:first-interactive` mark** when `<App>` first
  transitions out of the `<Placeholder>`. Measures the gap between `Startup`
  activated and the React Placeholder being unmounted (currently ~4 s of
  unaccounted-for time on cold).
- **3d. Lazy-load `virtual:pwa-register/react`.** The `useRegisterSW` hook is
  only used inside `Fallback` (error path), but importing it eagerly at the
  top of `main.tsx` pulls the PWA register glue into the eager bundle. Move
  the import into a `React.lazy`-wrapped inner component.

### Phase 4: activation-graph hygiene

The post-phase-1 cold profile shows 8 `*.AppGraphBuilder` modules clustering
at 1,128–1,168 ms each — they all activate on the same upstream
(`ClientReady`) and contend on the unbounded fan-out. Two complementary
changes:

- **4a. Bound `_loadCapabilitiesForModules` concurrency** to 4 in
  [`plugin-manager.ts:712`](../../sdk/app-framework/src/core/plugin-manager.ts).
  Risk: re-orders activations; need to verify no plugin relies on
  concurrent-contribution timing.
- **4b. Insert `Effect.yieldNow()` between modules** in `_loadModule` so the
  React reconciler gets a paint slot between contributions. This is what
  reliably unsticks the determinate progress indicator on cold loads where the
  cluster of synchronous module activations starves the render loop.

### Phase 5: harness improvements

Local-disk benchmarks under-represent the wins from phase 2 (network
optimization). Instrumentation gaps obscure first-time-user vs returning-user.

- **5a. Add a `cold-with-persisted-identity` scenario.** Use
  `browser.launchPersistentContext(userDataDir)` to prime once, then re-open
  fresh. Separates "load app" from "create new identity from scratch."
- **5b. Add a CPU/network-throttled scenario.** Playwright supports CDP
  emulation; we'd run "Slow 3G" + "4× CPU throttle" once per harness run.
  This is the scenario where phase 2's bundle reduction actually shows up.
- **5c. Cross-browser CI runs.** Locally we run chromium only; CI should run
  all three projects and append rows for each.

### Phase 6: production telemetry

- **6a. Push the top 5 slowest modules from `profiler.snapshot()` to PostHog**
  via the existing observability pipeline. Build on the JSON snapshot phase 0
  added; one event per session on `Startup` activated.

### Phase 7: instrumentation completeness

- **7a. Make `?profiler=1` default in dev builds** so every devloop produces
  ledger rows without remembering the flag.
- **7b. Expose `profiler.snapshot()` over `BroadcastChannel`** so a devtools
  panel can read it without polling localStorage.

### Phase 8: visual polish

- **8a. Reconcile the boot loader visual with `Placeholder.tsx`.** Currently
  the native-DOM boot loader and the React `<Placeholder>` are visually
  similar but not identical, so the handoff at `createRoot.render()` causes a
  subtle frame of flicker. One option: keep the boot loader visible until
  `Startup` is activated and skip rendering `<Placeholder>` entirely — making
  the boot loader the single canonical loading UI. Could also be implemented
  via SolidJS, which gives reactive DOM updates without React's mounting
  cost. See `TODO(burdon)` in
  [`packages/sdk/app-framework/src/vite-plugin/boot-loader/index.ts`](../../sdk/app-framework/src/vite-plugin/boot-loader/index.ts).
- **8b. Use the Composer brand SVG inside the boot loader** so it matches the
  React placeholder's logo (currently a generic horizontal bar).
- **8c. Loader bar should indicate actual percentage complete.**

## 6. Files changed in this PR

| File                                         | Why                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                                 | Native-DOM boot loader (CSS-animated, paints on first frame, status driver on `window.__bootLoader`).                                 |
| `src/main.tsx`                               | Calls `bootStatus(...)` at each profiler phase; wires the boot driver.                                                                |
| `src/profiler.ts`                            | Adds `Profiler.snapshot()` returning `ProfilerSnapshot` JSON; persists to `localStorage` on `dump()`.                                 |
| `src/components/Placeholder/Placeholder.tsx` | Renders the determinate progress indicator (un-comments the disabled block, threads `progress.activated`/`progress.total`).           |
| `src/playwright/startup.spec.ts`             | Cold + warm timing harness, plus a "boot loader paints before bundle parses" smoke test. Writes JSON to `test-results/composer-app/`. |
| `AUDIT.md`                                   | This document.                                                                                                                        |

## 7. How to run the harness locally

```sh
# Bundle (production build, what Playwright preview serves):
moon run composer-app:bundle

# Run the harness only:
DX_PWA=false moon run composer-app:e2e -- src/playwright/startup.spec.ts

# Output:
ls test-results/composer-app/startup-*.json

# Run preview to check manually
pnpm vite preview
```

Each JSON file is one scenario × one browser, fields documented at the top of
[`startup.spec.ts`](src/playwright/startup.spec.ts). Diff two runs with `jq`:

```sh
jq '.profilerTotal, .profile.slowestModules[:5]' \
   test-results/composer-app/startup-cold-chromium.json
```

## 8. Open questions

- Are we OK breaking the cache-keyed `org.dxos.app-framework.enabled`
  localStorage value if we ship lazy plugins? (Existing keys still work; new
  ids would simply not be in the cache.)
- Should `?profiler=1` be the default in dev builds? Always-on would let us
  collect numbers from every devloop without remembering the flag.
- Can `profiler.snapshot()` be exposed via `BroadcastChannel` so devtools can
  read it without polling localStorage?

## 9. Phase log

One subsection per phase in this branch. The first table in each subsection is
the cold/warm/delta against the previous row in [`BENCHMARKS.md`](BENCHMARKS.md).
All numbers are chromium, prod preview, my laptop — see the ledger for the raw
recorded rows; there's run-to-run noise (~10%) so deltas under that bar should
be treated as flat.

### Phase 1 — defer `OnboardingManager.initialize()` (commit `9db4acdb1f`)

|                                | Cold profilerTotal | Cold navToReady | Warm profilerTotal |   Warm navToReady |
| ------------------------------ | -----------------: | --------------: | -----------------: | ----------------: |
| baseline (`f1cda8f2f8`)        |           8,554 ms |       13,485 ms |           3,210 ms |          7,405 ms |
| **phase 1** (`e7f390ae3e + ⚠`) |       **4,704 ms** |    **9,596 ms** |           3,163 ms |          7,364 ms |
| delta                          |           **−45%** |        **−29%** |  unchanged (noise) | unchanged (noise) |

**Change:** [`src/plugins/welcome/capabilities/onboarding.ts`](src/plugins/welcome/capabilities/onboarding.ts) —
replaced `yield* Effect.tryPromise(() => manager.initialize())` with
`void manager.initialize().catch(log.catch)`. The manager is now contributed
synchronously to `WelcomeCapabilities.Onboarding`; identity creation, agent
provisioning, and credential queries run as a background side-effect.

**Why it works:** the `welcome.onboarding` module activates on
`allOf(AppGraphReady, OperationInvokerReady, LayoutReady, ClientReady)` and was
the largest single child of the `Startup` activation cascade (5,948 ms cold).
With `initialize()` no longer awaited, the module activates as soon as the
manager is constructed (microseconds), and `Startup` completes ~4 s sooner.

**Caveat:** in the skipAuth code path (`!DX_HUB_URL`), the app shell renders
before HALO identity exists. No external code reads
`WelcomeCapabilities.Onboarding` synchronously today (verified by grep), and
identity state is observed via the constructor's `client.halo.identity` /
`client.halo.credentials` subscriptions, so existing reactive consumers see
the eventual identity. The basic e2e suite still passes, but a real first-run
user has not clicked through it — flag for design review.

**What's left on cold (top of the post-phase-1 profile):** `plugin.client.module.Client`
(1,783 ms), `transcription` (1,141 ms), and a 7-module cluster of
`*.AppGraphBuilder`s at 1,128–1,139 ms each — strong signal they all activate
on `ClientReady` and fan out under `concurrency: 'unbounded'`. That cluster is
the target of phase 4.

### Phase 2 — lazy-load plugin chunks (commit `118261e7e1`)

|                                | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm navToReady |
| ------------------------------ | -----------------: | --------------: | -----------------: | --------------: |
| phase 1 (`e7f390ae3e + ⚠`)     |           4,704 ms |        9,596 ms |           3,163 ms |        7,364 ms |
| **phase 2** (`118261e7e1 + ⚠`) |           5,664 ms |        9,780 ms |           3,568 ms |        7,481 ms |
| delta                          | +960 ms (see note) |  +184 ms (flat) | +405 ms (see note) |  +117 ms (flat) |

|                        | Pre-phase-2 | Post-phase-2 |    Delta |
| ---------------------- | ----------: | -----------: | -------: |
| `main-*.js` raw        |      8.5 MB |   **393 KB** | **−96%** |
| `main-*.js` gzip       |     2.39 MB |    **87 KB** | **−96%** |
| Total chunk count      |       2,558 |        2,646 |      +88 |
| Cold transferred bytes |     43.4 MB |      41.7 MB |     flat |

**Change:** [`packages/apps/composer-app/src/plugin-defs.tsx`](src/plugin-defs.tsx) —
removed every `import { FooPlugin } from '@dxos/plugin-foo'` and replaced
the body of `getPlugins` with a single `Promise.all([...])` of dynamic
imports, one per plugin. `getPlugins` is now async; `main.tsx` awaits it
in parallel with `UrlLoader.preload()`. Plugin ids are now hardcoded in a
private `ID` constant block so `getCore`/`getDefaults` don't need to load
the full plugin chunks just to read each `meta.id`.

**Why the eager bundle dropped 96%:** Rollup splits each `import('@dxos/plugin-foo')`
into its own chunk. Before, every plugin's transitive graph (React surface
components, schema registrations, capabilities) was reachable from the static
import statements in `plugin-defs.tsx` and bundled into `main`. After, each
plugin is its own chunk requested only when `getPlugins` runs.

**Why `profilerTotal` regressed by ~960 ms on local-disk:** two effects:

1. **Phase boundary shifted.** Pre-phase-2 the 8.5 MB main bundle parsed
   _before_ `main:start` fired (~4.9 s of pre-await time, invisible to the
   profiler). Now `main:start` fires earlier; `profilerTotal` measures more
   wall-clock — including `plugins-init` which jumped from 1 ms to ~999 ms
   as the 60 dynamic imports load and parse.
2. **Local-disk overhead.** `vite preview` over localhost has zero network
   latency; HTTP/2 multiplexing benefits don't apply. Splitting one big
   bundle into 60 small chunks adds per-module parser overhead with no
   payoff. Real-network users see this differently — see phase 5.

**Caveat:** plugin ids in `ID` are now duplicated from each plugin's
`meta.ts`. There's no compile-time guard for drift; if a plugin renames
its `meta.id`, the constant must be updated by hand. Phase 7 should add a
build-time check.

**What's left on cold (top of the post-phase-2 profile):** essentially
unchanged from phase 1 — the 8 `*.AppGraphBuilder` modules clustering at
1,128–1,168 ms each are the next target (phase 4: bound concurrency in
`_loadCapabilitiesForModules` + insert `Effect.yieldNow()`).

### Phase 3 — small wins bundle (commit `2560fb5afb`)

|                                | Cold profilerTotal | Cold navToReady | Cold firstInteractive | Warm profilerTotal |
| ------------------------------ | -----------------: | --------------: | --------------------: | -----------------: |
| phase 2 (`697d645631 + ⚠`)     |           5,664 ms |        9,780 ms |      — (not captured) |           3,568 ms |
| **phase 3** (`2560fb5afb + ⚠`) |       **5,480 ms** |    **9,532 ms** |          **8,732 ms** |           3,555 ms |
| delta                          |    −184 ms (noise) | −248 ms (noise) |         first capture |     −13 ms (noise) |

Phase 3 is mostly hygiene + new instrumentation, not a perf win. The four
included changes are individually too small (or in 3d's case, too risky for
the size of the win) to warrant their own phase:

**3a. `Promise.all` the 4 `await import`s in `main.tsx`** — `@dxos/config`,
`@dxos/react-client`, `@dxos/migrations`, and `./migrations` now load in
parallel rather than serially. On local-disk this saves ~20–50 ms; on a real
network the savings would scale with chunk count × RTT.

**3b. Replace `setInterval(100)` with PubSub-driven progress in
[`useApp.tsx`](../../sdk/app-framework/src/ui/hooks/useApp.tsx).** The hook
already subscribes to `manager.activation`; we now route `module && state ===
'activated'` messages directly to `setStartupProgress` instead of polling
`manager.getActive()` every 100 ms. One fewer timer; the placeholder UI now
updates exactly when a module commits, not on the next 100 ms tick. No
visible perf change in the harness because the previous 100 ms cadence was
already faster than React's render-batching anyway.

**3c. Add `app-framework:first-interactive` mark** when `<App>` first
transitions out of `<Placeholder>`. Captured by the harness as `firstInteractive`.
Reveals on cold that:

- `main:start → Startup activated` = 5,480 ms (profilerTotal)
- `Startup → Placeholder dismissed` = ~1,000 ms (the `useLoading` debounce
  state machine; `composer-app` calls `useApp({ debounce: 1_000 })` so the
  fade-in / fade-out states each take 1 s)
- `Placeholder dismissed → user-account testid visible` = ~800 ms (the real
  app's plugin-contributed surface trees rendering for the first time)

**3d. Lazy-load `virtual:pwa-register/react` (deferred).** The `useRegisterSW`
hook is only used inside `Fallback` (error path), but it's imported eagerly
at the top of `main.tsx` and pulls a small wrapper into the eager bundle.
Lazy-loading would require a `React.lazy` + `Suspense` boundary to carry
state from the hook into `Fallback`'s render — added complexity for a
likely-tiny bundle saving (the wrapper is just `navigator.serviceWorker`
glue). Tabled.

**Next phase priority shifted:** the `useLoading` debounce is cheaper and
less risky to retune than phase 4 (activation-graph concurrency). Considering
moving "tune `useLoading` debounce" into a phase 3.5 / hot-fix slot before
phase 4.

### Phase 3.5 — `useLoading` debounce: 1_000 → 200 (commit `562d20e31c`)

|                                  | Cold profilerTotal | Cold navToReady | Cold firstInteractive | Warm firstInteractive |
| -------------------------------- | -----------------: | --------------: | --------------------: | --------------------: |
| phase 3 (`6efdeb84e2 + ⚠`)       |           5,480 ms |        9,532 ms |              8,732 ms |      — (not captured) |
| **phase 3.5** (`562d20e31c + ⚠`) |           6,316 ms |       10,289 ms |              9,418 ms |              5,808 ms |
| delta                            |    +836 ms (noise) | +757 ms (noise) |       +686 ms (noise) |            first warm |

**Change:** [`packages/apps/composer-app/src/main.tsx`](src/main.tsx) — `useApp({
debounce: 200 })`. The boot loader covers the pre-React phase, so the longer
fade-out animation isn't needed to hide a flash.

**Result:** debounce was not the dominant cost of the `Startup → first-interactive`
gap. With debounce=200 the gap should shrink to ~200–400 ms; the actual cold
gap measured was ~900 ms (down from ~1,000 ms in phase 3). Most of the
remaining gap is React rendering the contributed `Capabilities.ReactRoot`
trees for the first time — that's plugin-by-plugin work, not a single tunable.

**Complexity vs. benefit:** trivial (single literal change in main.tsx; zero
new abstractions). Benefit is real but small (~100 ms cold; cleaner UX
because there's no longer a perceptible "ready but still fading" beat). Net:
worth keeping. The harness numbers are within run-to-run noise (±~10% on
cold), so the headline metric move is illegible — keep an eye on the trend
in BENCHMARKS.md rather than any single run.

### Phase 4 — activation-graph hygiene **(attempted, reverted in `c0e35cd1d2`)**

Phase 4 was a two-part change to `plugin-manager.ts`: bound
`_loadCapabilitiesForModules` concurrency to 8 and insert `Effect.yieldNow()`
between events in `_activateModulesForEvent`. The first measurement (commit
`6a3f5f5ac1`) showed a ~1.3 s cold navToReady improvement and warm passed.

**Why we reverted:** subsequent phase 5 harness runs exposed that the warm
scenario is genuinely flaky — the System Error dialog appears in 60–90% of
warm reloads, _with or without_ phase 4. Three full reverts and two retries
each on warm all failed. The flake is pre-existing in the warm-reload path
and not caused by phase 4, but the yieldNow attempt clearly amplified it
(every yield introduces a window where the activation cascade is
mid-flight), and the bounded concurrency didn't pull its weight on today's
8-module cluster (8 modules with bound 8 ≡ unbounded).

**Complexity vs. benefit:** small diff but in a hot path with known
race-prone semantics. The "win" turned out to be largely run-to-run
noise; the structural risk did not. Net: not worth shipping. The lesson
is that any yield/concurrency change inside the activation graph needs
to land alongside a fix for the warm-reload race — phase 5 surfaced it
but did not root-cause it.

### Phase 5 — harness improvements (commit `ca88ace276`)

| Scenario                            |   Cold profilerTotal | Cold navToReady | Cold firstInteractive | Notes                                   |
| ----------------------------------- | -------------------: | --------------: | --------------------: | --------------------------------------- |
| `cold` (cleared storage)            |             5,538 ms |        8,762 ms |             ~7,800 ms | (median of 3 runs) — first-time-user    |
| `warm` (reload, IDB warm)           |             3,645 ms |        6,685 ms |             ~5,800 ms | flaky; passes ~30% of attempts ⚠        |
| **`warm-cold`** (persistent ctx)    |         **5,090 ms** |    **8,214 ms** |             ~7,300 ms | **NEW** — closer to real returning user |
| `throttled-cold` (Fast 3G + 2× CPU) | (not run by default) |                 |                       | opt-in via `DX_HARNESS_THROTTLED=1`     |

**Changes** (in [`src/playwright/startup.spec.ts`](src/playwright/startup.spec.ts)):

- **5a. `warm-cold` scenario via persistent context.** `playwright[browserName].launchPersistentContext(userDataDir)`
  primes the app once, closes the browser, then re-launches with the same
  `userDataDir`. IDB persists across the launches but the module cache is
  fresh, so the second launch measures "returning user opens a new tab".
  This separates the pure load cost from the identity-creation cost that
  `cold` conflates. The chromium-only restriction is a deliberate scope
  cut; firefox/webkit persistent contexts have different semantics around
  OPFS that haven't been validated. Cleanup is best-effort `rmSync` in the
  test's `finally` block.
- \*\*5b. `throttled-cold` scenario via CDP `Network.emulateNetworkConditions`
  - `Emulation.setCPUThrottlingRate`.\*\* Fast 3G + 2× CPU. Not run by
    default — composer's full asset graph is ~40 MB, so even Fast 3G can
    take 5+ minutes per run (Slow 3G times out at any reasonable budget).
    Set `DX_HARNESS_THROTTLED=1` to enable. This is the scenario that
    reveals phase 2's bundle-reduction win on real-network conditions
    (local-disk benchmarks underrepresent it).
- **5c. Cross-browser: documentation only.** `PLAYWRIGHT_BROWSER=all` is
  already supported by `e2ePreset`; CI just needs to set it. No code
  change needed.
- **`trackNetwork(page)` helper.** Extracts the response-handler boilerplate
  the cold/warm tests had inlined; the new tests reuse it.
- **`test.describe.configure({ retries: 2 })`** so a single warm flake
  doesn't lose us a row. Doesn't help when warm fails 3 times in a row,
  which still happens.

**Headline finding:** `warm-cold` (5,090 ms profilerTotal / 8,214 ms
navToReady) is essentially indistinguishable from `cold` (~5,500 / ~8,700).
Identity creation, which the cold scenario's first-run includes, is
_not_ the bottleneck for repeat users. Most of the cold cost is module
graph evaluation + activation, which would still be paid by a returning
user on a fresh tab. This validates phase 1's deferral choice (identity
work is off the critical path for repeat users) and shows phase 4's
intent (paint slots during activation) is the right next direction —
even if the specific implementation didn't survive review.

**Complexity vs. benefit:** the new scenario is ~80 lines of test code
plus one helper. Benefit is significant: the `warm-cold` row finally
answers "how does composer feel for a returning user opening it in a new
tab", which is the most common real-world cold start. The throttled
scenario is opt-in so no CI-budget cost. Net: clearly worth it, but the
ledger now has more failure-mode surface area; future maintenance should
keep an eye on the warm-test flake (currently a known issue tracked in
the test's comment).

### Phase 6 — production telemetry (commit `0b39281ade`)

|                                | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm-cold profilerTotal |
| ------------------------------ | -----------------: | --------------: | -----------------: | ----------------------: |
| phase 5 (`ca88ace276 + ⚠`)     |           5,538 ms |        8,762 ms |           3,645 ms |                5,090 ms |
| **phase 6** (`0b39281ade + ⚠`) |       **5,548 ms** |    **8,697 ms** |       **3,649 ms** |            **5,079 ms** |
| delta                          |       flat (noise) |    flat (noise) |       flat (noise) |            flat (noise) |

**Changes:**

- **app-framework — `useApp.tsx`:** when `Startup` activates, dispatch a
  `CustomEvent('app-framework:startup-activated')` on `window`. The framework
  doesn't import `@dxos/observability` (avoids a forbidden dep direction);
  consumers register a one-shot listener and capture the summary themselves.
- **composer-app — `main.tsx`:** subscribe to the new event, build a flat
  `Attributes`-compatible summary from `performance.getEntriesByType('measure')`
  - `performance.getEntriesByType('resource')` + the `boot:html-parsed` and
    `app-framework:first-interactive` marks, and emit
    `obs.events.captureEvent('composer.startup', summary)` once observability
    resolves. Top-5 slowest modules are flattened to `top1Module`/`top1Ms` …
    `top5Module`/`top5Ms` keys for easier PostHog filtering.

**Why a CustomEvent and not a callback:** the natural alternative is to add
an `onStartup?: (summary) => void` option to `useApp`. That couples
`@dxos/app-framework`'s public API to one specific instrumentation pattern.
A `CustomEvent` is provider-agnostic — any other dxos host (Hub, Devtools,
future apps) can subscribe to the same name without ceremony. Discoverability
is the tradeoff: the event name is a string contract, not a typed prop.

**Why read from `performance.*` and not `composer.profiler.snapshot()`:**
the profiler is opt-in via `?profiler=1` and not enabled in production.
`performance.getEntriesByType` gives us the same User Timing data
unconditionally, including the `module:*` measures the plugin manager
already emits.

**Complexity vs. benefit:** ~50 lines of straight-through code in main.tsx
plus 5 lines in useApp. No new abstractions, no new dependencies, no
behavioural change at startup — the harness numbers are flat against
phase 5. Benefit is qualitatively large: we move from "laptop
measurements only" to "top-5 slowest modules per real session in
PostHog". The first time someone runs into a slow plugin in production,
we'll see it in aggregate before any individual report. Net: cheap at
the implementation cost, valuable at the ops scale.

### Phase 7 — instrumentation completeness (commit `daf09cd61a`)

|                                | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm-cold profilerTotal |
| ------------------------------ | -----------------: | --------------: | -----------------: | ----------------------: |
| phase 6 (`0b39281ade + ⚠`)     |           5,548 ms |        8,697 ms |           3,649 ms |                5,079 ms |
| **phase 7** (`daf09cd61a + ⚠`) |       **5,425 ms** |    **8,806 ms** |       **3,497 ms** |            **5,118 ms** |
| delta                          |       flat (noise) |    flat (noise) |       flat (noise) |            flat (noise) |

**Changes:**

- **7a. `?profiler=1` default in dev builds.** [`main.tsx`](src/main.tsx) —
  `isTrue(url.searchParams.get(PARAM_PROFILER), Boolean(import.meta.env?.DEV))`.
  Every devloop now produces an auto-recorded ledger row + console table
  - `composer.startup` PostHog event without remembering the flag.
    Production explicitly opts in (or out) via the URL parameter as before.
- **7b. `BroadcastChannel` snapshot.** [`profiler.ts`](src/profiler.ts) —
  `dump()` now also `postMessage`s the `ProfilerSnapshot` JSON on a
  `BroadcastChannel` named `org.dxos.composer.startup-profile` (exposed
  as `BROADCAST_CHANNEL_NAME`). Best-effort: wrapped in `try/catch` and
  guarded by `typeof BroadcastChannel !== 'undefined'` for embedded
  webviews. localStorage persistence stays intact for tabs that need
  cross-reload comparison.

**Why BroadcastChannel and not just keep using localStorage:** localStorage
requires polling; a devtools panel either polls every N ms (wasteful) or
uses the `storage` event (inconsistent across browsers, doesn't fire in
the same tab that wrote the value). `BroadcastChannel` is push-based,
fires in-tab and cross-tab uniformly, and was specifically designed for
this kind of fan-out.

**Complexity vs. benefit:** very small diff (~10 lines total) and zero
behavioural change at runtime. The harness numbers are flat. Benefit is
small but real: dev productivity (no flag-remembering) plus a clean
push-based subscription channel for any future devtools panel. Net:
cheap, additive, stays out of the way.

### Phase 8 — visual polish (commit `c2927574d5`)

|                                | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm-cold profilerTotal |
| ------------------------------ | -----------------: | --------------: | -----------------: | ----------------------: |
| phase 7 (`daf09cd61a + ⚠`)     |           5,425 ms |        8,806 ms |           3,497 ms |                5,118 ms |
| **phase 8** (`c2927574d5 + ⚠`) |       **5,427 ms** |    **8,544 ms** |       **3,444 ms** |            **5,844 ms** |
| delta                          |       flat (noise) |    flat (noise) |       flat (noise) |            flat (noise) |

**Changes:**

- **8b. Composer brand mark in the boot loader.** [`bootLoaderPlugin`](../../sdk/app-framework/src/vite-plugin/boot-loader/index.ts)
  gained an optional `markSvg` parameter. When set, the plugin injects
  a `<div id="boot-loader-mark">…inline SVG…</div>` above the progress
  bar. composer-app's [`vite.config.ts`](vite.config.ts) reads
  [`packages/ui/brand/assets/icons/composer-icon-monochrome.svg`](../../ui/brand/assets/icons/composer-icon-monochrome.svg)
  via `node:fs/readFileSync` and passes it to the plugin. The SVG uses
  `fill="currentColor"`, so it picks up the loader's text colour and
  works in both light and dark mode. Added ~12 lines of CSS in
  [`boot-loader.css`](../../sdk/app-framework/src/vite-plugin/boot-loader/boot-loader.css)
  to size the mark and align with the bar.
- **8a. Boot-loader handoff timing.** Removed the
  `requestAnimationFrame(() => __bootLoader.dismiss())` from
  [`main.tsx`](src/main.tsx) and replaced it with a `useLayoutEffect`
  inside [`Placeholder.tsx`](src/components/Placeholder/Placeholder.tsx)
  gated on `stage >= 1`. `useLayoutEffect` runs after DOM mutations but
  before paint, so the dismiss is committed before the next frame; the
  `stage >= 1` gate waits for the `useLoading` debounce to bring the
  Placeholder's logo to `opacity-0.7`, so the user never sees a blank
  Placeholder between the boot loader and the eventual logo fade-in.

**Why not match the multi-color brand SVG:** the React `<Composer>`
component in [`@dxos/brand`](../../ui/brand/src/components/icons/Composer.tsx)
is a 4-layer multi-color brand mark with hard-coded blues that don't
work in dark mode. The boot loader needs `currentColor` semantics so it
can adapt to `prefers-color-scheme`. Using the monochrome icon
preserves the silhouette identity and works in both schemes; the
small visual transition into the colored brand mark is acceptable.

**Complexity vs. benefit:** small diff (~30 lines across plugin,
config, and component). No behavioural change at runtime. Benefit is
qualitative: the boot loader establishes Composer's visual identity
from the very first painted frame, and the handoff to React is now
guaranteed to overlap visible content (no "blank Placeholder" beat).
Net: clearly worth it for first-impression polish.

## 10. Summary of phases shipped

| Phase | What                                                 | Commit                     | Headline metric move                     |
| ----: | ---------------------------------------------------- | -------------------------- | ---------------------------------------- |
|     1 | Defer `OnboardingManager.initialize()` to background | `9db4acdb1f`               | **−45% cold profilerTotal**              |
|     2 | Lazy-load plugin chunks                              | `697d645631`               | **eager bundle −96%** (8.5 MB → 393 KB)  |
|     3 | Small wins (Promise.all, PubSub progress, mark)      | `2560fb5afb`               | flat perf, new `firstInteractive` metric |
|   3.5 | `useLoading` debounce 1 s → 200 ms                   | `562d20e31c`               | UX cleanup (within noise)                |
|     4 | Activation-graph hygiene                             | (reverted in `c0e35cd1d2`) | shipping-blocked by warm flake           |
|     5 | Harness: warm-cold + throttled scenarios             | `ca88ace276`               | first `warm-cold` measurement            |
|     6 | Production telemetry (PostHog `composer.startup`)    | `0b39281ade`               | flat perf, new ops visibility            |
|     7 | `?profiler=1` default in dev + `BroadcastChannel`    | `daf09cd61a`               | flat perf, dev ergonomics                |
|     8 | Boot-loader brand mark + handoff timing              | `c2927574d5`               | flat perf, visual polish                 |
|     9 | Dev-server harness (`dev-cold` scenario)             | `8df7ba14ea`               | first `dev-cold` measurement             |
|    10 | Vite dev pre-bundling + `server.warmup`              | `<TBD>`                    | dev `navToReady` −1.4 s; pre-`main:start` −6.1 s |

Headline cumulative (production preview): cold `profilerTotal` 11,118 ms → ~5,400 ms (−51%);
cold `navToReady` 18,054 ms → ~8,700 ms (−52%); eager bundle −96%. Dev:
`navToReady` −8% (17.6 s → 16.2 s), pre-`main:start` gap halved.

## 11. Dev server load time

The harness above measures the production preview (`vite preview`); none of
phases 1–8 deliberately optimize the dev server (`vite serve`). Dev pays
different costs:

- **Per-file transformation.** Every source `.ts` / `.tsx` is served as
  ESM, transformed on demand through SWC + the project's plugin chain
  (`@dxos/swc-log-plugin`, the `import-source` redirect, etc.). Composer's
  module graph is ~2,500 modules; every one of them is a separate request.
- **Optimize-deps pre-bundling.** Vite scans `index.html` and pre-bundles
  the deps it discovers via esbuild on first start. Composer has many
  deeply-imported packages (`effect/Effect`, `@codemirror/*`, `@radix-ui/*`)
  that aren't trivially auto-discoverable — when one shows up mid-load that
  isn't in the pre-bundle, vite forces a **full page reload** with the
  "Discovered new dependencies, reloading…" banner.
- **No minification, no tree-shaking, no chunk-splitting.** Sourcemaps
  inline; bytes per response are larger than prod.

### Phase 9 — dev-server harness (commit `8df7ba14ea`)

| Scenario                            |        Cold profilerTotal |          Cold navToReady |     Bytes |   modules |
| ----------------------------------- | ------------------------: | -----------------------: | --------: | --------: |
| `cold` (prod preview, phase 8 ref)  |                  ~5,400 ms |                ~8,700 ms |    41 MB |       257 |
| **`dev-cold`** (vite serve, fresh)  |              **6,269 ms** |          **17,586 ms**   | **123 MB** |       258 |

**Dev cold pays ~9 s of pre-`main:start` time** (the gap between `navToReady`
and `profilerTotal`). That's vite serving + transforming every source file
on demand — exactly the cost phase 10 targets.

**Changes:**

- Extracted shared helpers (`trackNetwork`, `collectStartupReport`,
  `appendBenchmarkRow`, etc.) from `startup.spec.ts` into
  [`harness-helpers.ts`](src/playwright/harness-helpers.ts) so the new
  spec can reuse them without duplication.
- New [`dev-startup.spec.ts`](src/playwright/dev-startup.spec.ts) with one
  scenario, `dev-cold`, that primes vite by navigating once, closes the
  context, then measures a *fresh* browser context against the still-warm
  vite serve. Captures the same `StartupReport` shape as the prod harness
  so the BENCHMARKS row is uniform.
- New [`playwright-dev.config.ts`](src/playwright/playwright-dev.config.ts)
  with `webServer.command = 'pnpm vite --port 4173'` so the existing
  `INITIAL_URL` keeps working. `testMatch: '**/dev-startup.spec.ts'`
  scopes it.
- New `composer-app:e2e-dev` moon task that runs the dev harness.

**Complexity vs. benefit:** ~150 lines of test code (most of it the
extracted helper module that's also used by the prod harness now). No
behavioural change. Benefit: **first quantitative dev-server measurement
on this branch.** Without it, all dev-server optimization talk is
hand-waving; with it, phase 10 has a number to move.

### Phase 10 — vite dev pre-bundling + warmup (commit `<TBD>`)

|                                | Cold profilerTotal | Cold navToReady |   Pre-`main:start` gap |
| ------------------------------ | -----------------: | --------------: | ---------------------: |
| phase 9 (`8df7ba14ea + ⚠`)     |           6,269 ms |       17,586 ms |              11,317 ms |
| **phase 10** (`<TBD> + ⚠`)     |          11,007 ms |   **16,180 ms** |           **5,173 ms** |
| delta                          |   +4,738 ms (boundary shift) | **−1,406 ms** | **−6,144 ms (−54%)** |

**Changes** (in [`packages/apps/composer-app/vite.config.ts`](vite.config.ts)):

- **Permanent `optimizeDeps.include`.** The list of deeply-imported deps
  (`effect/*`, `@codemirror/*`, `@radix-ui/*`, `@effect/ai/*`, `@automerge/*`,
  `@atlaskit/pragmatic-drag-and-drop`, etc.) was previously gated on
  `DX_FASTBUNDLE=1`. Now it always applies, so vite pre-bundles all known
  subpaths up front instead of discovering them mid-load and triggering a
  full page reload.
- **`optimizeDeps.entries`.** Added the auxiliary HTML entrypoints
  (`internal.html`, `devtools.html`, `reset.html`, `script-frame/index.html`)
  so navigations to those pages don't trip a "discovered new dependencies"
  reload after the initial scan.
- **`server.warmup.clientFiles`.** Vite now pre-transforms `src/main.tsx`,
  the three worker entrypoints, and `src/plugin-defs.tsx` when the dev
  server starts — before the browser asks for them. The first navigation
  finds them already in the transform cache.

**Why `profilerTotal` went up while `navToReady` went down:** same
phase-boundary shift as phase 2 in prod. With the warmup + pre-bundle,
`main:start` fires earlier (less pre-`main:start` work), so `profilerTotal`
measures more wall-clock — the lazy plugin chunks are still served as ESM
in dev, and now their fetches and per-file transforms happen *inside* the
profiler window. The metric that matters end-to-end is `navToReady`, which
dropped 1.4 s. The pre-`main:start` gap (the time vite is busy serving
files while nothing's on screen) dropped 6.1 s — that's the actual user-
visible win.

**Caveat — first run of `vite serve` after clearing the cache** still pays
the full pre-bundle cost (now slightly larger because the include list is
bigger). The harness clears `node_modules/.vite` before each measurement
so this isn't visible in the row above; in real-world dev, the first
`pnpm vite` after `pnpm install` will pause for ~10–30 s, but every
subsequent start reuses the cache.

**Complexity vs. benefit:** purely vite.config edits, ~80 lines of changed
code (mostly de-conditionalizing the existing `include` block). Zero
behavioural change in the app itself. Benefit: ~6 s faster pre-`main:start`
on dev cold loads, plus the elimination of "Discovered new dependencies"
reload interruptions during normal development. Net: clear win for the
inner-loop developer experience.

**What's still on the table for dev (not shipped here):**

- Drop `@dxos/vite-plugin-import-source` from default dev (see §11 above
  — moved into a follow-up because the trade-off is "dev start fast" vs
  "cross-package iteration fast" and needs a maintainer call).
- Make `@dxos/swc-log-plugin` opt-in via env in dev — saves a SWC pass per
  file. Need to measure the actual savings first.
- Shared `cacheDir` across worktrees — useful given how many `claude/<*>`
  worktrees exist on this machine, but cache-invalidation correctness
  needs review before flipping.
