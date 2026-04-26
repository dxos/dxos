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
| phase 2 (`697d645631 + ⚠`)     |           5,664 ms |        9,780 ms |     — (not captured)  |           3,568 ms |
| **phase 3** (`2560fb5afb + ⚠`)      |       **5,480 ms** |    **9,532 ms** |          **8,732 ms** |           3,555 ms |
| delta                          |   −184 ms (noise)  | −248 ms (noise) |        first capture  |  −13 ms (noise)    |

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
| phase 3 (`6efdeb84e2 + ⚠`)       |           5,480 ms |        9,532 ms |              8,732 ms |     — (not captured)  |
| **phase 3.5** (`562d20e31c + ⚠`)      |           6,316 ms |       10,289 ms |              9,418 ms |              5,808 ms |
| delta                            |   +836 ms (noise)  | +757 ms (noise) |     +686 ms (noise)   |          first warm   |

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

### Phase 4 — activation-graph hygiene (commit `<TBD>`)

|                                | Cold profilerTotal | Cold navToReady | Cold firstInteractive | Warm profilerTotal |
| ------------------------------ | -----------------: | --------------: | --------------------: | -----------------: |
| phase 3.5 (`562d20e31c + ⚠`)   |           6,316 ms |       10,289 ms |              9,418 ms |           3,499 ms |
| **phase 4** (`<TBD> + ⚠`)      |       **5,633 ms** |    **8,940 ms** |          **8,181 ms** |           3,526 ms |
| delta                          |       −683 ms      |  **−1,349 ms**  |     **−1,237 ms**     | flat (noise)       |

**Changes** (in [`packages/sdk/app-framework/src/core/plugin-manager.ts`](../../sdk/app-framework/src/core/plugin-manager.ts)):

- **4a. Bound `_loadCapabilitiesForModules` concurrency to 8** (was
  `'unbounded'`). Today's largest cluster is 8 modules (composer-app's
  `*.AppGraphBuilder`s on `ClientReady`); 8 preserves that fan-out's
  parallelism while protecting future fan-outs of 50+ modules from starving
  the JS event loop.
- **4b. `Effect.yieldNow()` between events**, not between modules. Inserted
  inside `_activateModulesForEvent` after `_contributeCapabilitiesForModules`
  resolves but before `_activateRelatedEvents('after')` runs. An earlier
  attempt (yield between *modules*, inside `_contributeCapabilitiesForModules`)
  made the warm scenario fail with a System Error dialog — same `allOf`
  resolver race the existing TODO warned about. Yielding only at event
  boundaries gives React's reconciler a paint slot without interrupting an
  event mid-flight.

**Why it works:** before phase 4, the 8-module `*.AppGraphBuilder` fan-out
on `ClientReady` ran with no yields, so React's setStartupProgress (and
later, the Placeholder unmount) couldn't paint until the entire cascade
finished. With a yield at every event boundary, React gets a render slot
between events; the wall-clock from `Startup` activated to user-account
testid drops by ~1.3 s on cold.

**Complexity vs. benefit:** small diff in framework code (one yield, one
literal in concurrency option), but the change is in a hot path with known
race-prone semantics — phase 4 includes a debug history of *one failed
attempt*, captured as comments in [`_contributeCapabilitiesForModules`](../../sdk/app-framework/src/core/plugin-manager.ts).
The fix landed on the second try after the warm-scenario regression.
Benefit is the largest single wall-clock win since phase 1 (−1.3 s cold
navToReady). Net: clearly worth it, but *only because the harness caught
the regression*; without that, this would have shipped broken on warm
loads.
