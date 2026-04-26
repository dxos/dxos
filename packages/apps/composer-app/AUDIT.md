# Composer-app Startup Performance Audit

This document is a static analysis of how composer-app starts, what we already
measure, what we can measure better, and how to make the loading experience
feel faster (and actually be faster). It is intentionally specific — every claim
points at code so the reader can verify or push back.

## 0. Baseline numbers (chromium, production preview build)

Captured by the harness in [`src/playwright/startup.spec.ts`](src/playwright/startup.spec.ts) on a developer laptop. Treat any single number as one data point — the auto-recorded ledger at [`BENCHMARKS.md`](BENCHMARKS.md) is the source of truth for trend.

| Phase | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm navToReady | Top cold module |
| --- | ---: | ---: | ---: | ---: | --- |
| 0. baseline (`f1cda8f`) | 11,118 ms | 18,054 ms | 3,166 ms | 7,677 ms | `welcome.onboarding` (5,948 ms) |
| 0. baseline re-run (`f1cda8f2f8`) | 8,554 ms | 13,485 ms | 3,210 ms | 7,405 ms | `welcome.onboarding` (4,917 ms) |
| **1. defer `OnboardingManager.initialize()`** (`e7f390ae3e` + ⚠) | **4,704 ms** | **9,596 ms** | 3,163 ms | 7,364 ms | `plugin.client.module.Client` (1,783 ms) |

Cold dropped 45% from the closer baseline (8.5 → 4.7 s). Warm is unchanged within noise — expected, because warm has the identity persisted and `initialize()` short-circuits. The cold-vs-warm gap shrank from ~5.4 s to ~1.5 s; what's left is mostly module-graph evaluation, not identity creation.

Updated cold top-10 after phase 1 (everything below is what's left to chase):

| Module | Cold ms |
| --- | ---: |
| `plugin.client.module.Client` | 1,783 |
| `plugin.transcription.module.transcription` | 1,141 |
| 7× `*.AppGraphBuilder` modules (pipeline, outliner, space, meeting, daily-summary, assistant) | 1,128–1,139 each |
| `plugin.assistant.module.LocalModelResolver` | 1,137 |
| `plugin.assistant.module.EdgeModelResolver` | 1,136 |

The 1,128–1,141 ms cluster is suspicious — those modules likely all activate on the same upstream signal (probably `ClientReady` from `plugin.client.module.Client` at 1,783 ms) and fan out simultaneously. Reducing concurrency or sequencing them is recommendation #5.

Production bundle, `out/composer/assets`: **2,558 JS chunk files**, **71 MB total**, with
`main-*.js` at **8.5 MB raw / 2.39 MB gzip**, `react-surface-*.js` at 5.7 MB raw, `dedicated-worker-*.js` at 3.5 MB raw.

Production bundle, `out/composer/assets`: **2,558 JS chunk files**, **71 MB total**, with
`main-*.js` at **8.5 MB raw / 2.39 MB gzip**, `react-surface-*.js` at 5.7 MB raw, `dedicated-worker-*.js` at 3.5 MB raw.

Three things jump out from these numbers and are reflected in §5:

1. ~~**`welcome.onboarding` alone is 5.9 s — over half the cold `profilerTotal`.**~~ **Resolved by phase 1** — `initialize()` is no longer awaited inside the module's activation; the manager is contributed synchronously and identity setup runs as a background side-effect. Cold dropped 45%.
2. **`navigationToReady` exceeds `profilerTotal` by ~5 s on cold (post-phase-1).** `Startup` activated ≠ user-account testid mounted. The gap shrank but didn't disappear with phase 1. Still want the extra `startup:user-account-mounted` mark.
3. **The first `await import` doesn't even *start* until +2.9 s on cold (post-phase-1; was +4.9 s)** — the eager `import` chain in `plugin-defs.tsx` is still paid synchronously before `main()`'s body runs. Lazy loading of non-core plugins is the next-largest lever.

## 1. The pipeline today

End-to-end, a cold load runs in this order. The first column is when the user
*could* see something on screen.

| Pixel state              | Phase                          | Code                                                                                                                 |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Blank                    | HTML download + parse          | `index.html`                                                                                                         |
| Blank                    | Module-graph fetch + evaluate  | bundle imports from `src/main.tsx`                                                                                   |
| Blank                    | `dynamic-imports` phase        | `main.tsx:97-104` — `await import('@dxos/config' / react-client / migrations / ./migrations)`                        |
| Blank                    | `config` phase                 | `main.tsx:111-138` — `setupConfig()`, IDB storage check                                                              |
| Blank                    | `services` phase               | `main.tsx:187-249` — `createClientServices` (worker spin-up, OPFS SQLite)                                            |
| Blank                    | `plugins-init` phase           | `main.tsx:251-283` — `getPlugins(conf)` constructs ~60 plugin instances (`plugin-defs.tsx`)                          |
| Blank → Placeholder      | `createRoot.render(<Main />)`  | `main.tsx:330-339` — first React commit                                                                              |
| Placeholder              | Plugin activation events       | `useApp` runs `manager.activate(SetupReactSurface)` then `Startup` (`useApp.tsx:210-214`)                            |
| Placeholder              | Module activation              | `_loadModule` per plugin (`plugin-manager.ts:746-829`)                                                               |
| Placeholder → App        | Done event fires               | `Startup` activated → `setReady(true)` (`useApp.tsx:192-199`)                                                        |
| App                      | First useful paint             | `App.tsx:36-43` — composes contexts, mounts `Capabilities.ReactRoot` components                                      |

Two very different concurrency stories live inside this:

1. **Pre-React** (everything before `createRoot.render`) is a classic top-level
   `await` chain. Nothing paints, nothing animates. The only signal the user has
   that the app is alive is the favicon.
2. **Post-React** is driven by the plugin manager via Effect fibers. A
   `setInterval(..., 100)` polls `manager.getActive()` and pushes
   `StartupProgress` into React state ([useApp.tsx:168-184](packages/sdk/app-framework/src/ui/hooks/useApp.tsx)). React *should* re-render on each tick, but:
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
- No mark for the *very first* moment the user sees anything — there was no
  boot loader.
- No e2e test that asserts "first paint happened, ready in N ms" — we had no
  regression detector for the slowest part of the app.

### 2.3 What this branch adds

- `Profiler.snapshot()` returns a structured `ProfilerSnapshot` JSON object
  (`profiler.ts`). `dump()` also persists the snapshot to
  `localStorage['org.dxos.composer.startup-profile']` so a second tab or a
  Playwright run can read it without scraping `console`.
- `performance.mark('boot:html-parsed')` is written from an inline script in
  `index.html` *before* the JS bundle is even fetched. This is the new "lower
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
  which *should* yield on every fiber suspension. But many module `activate()`
  bodies do significant **synchronous** work: schema registration, surface
  capability contributions, JS evaluation of dynamically imported plugin chunks.
- A single sync block ≥100 ms swallows any number of interval ticks.
- React 18 in concurrent mode defers commits even further when the main thread
  is busy.

So the recommendation is twofold:

### 3.1 Native-DOM boot loader (this branch)

`index.html` now contains an inline `<style>` and a small skeleton `<div
id="boot-loader">` *inside* `#root`. Crucially:

- The bar's animation is a CSS keyframe (`transform: translateX`). This animates
  on the **compositor thread**, not the main thread, so it keeps moving even
  while JS is parsing modules.
- A 7-line inline `<script>` exposes `window.__composerBoot.status(text)`. The
  three async-import phases in `main.tsx` push status text via this driver
  (`Loading framework…`, `Reading configuration…`, `Starting services…`,
  `Loading plugins…`).
- When `createRoot(document.getElementById('root')).render(<Main />)` runs,
  React replaces the boot-loader DOM with the Placeholder. The transition
  is unbroken: CSS-animated bar → React-rendered Placeholder.

This addresses the symptom for the **pre-React** window, which is the longest
blank screen on a cold load (every other phase happens *after* React is
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

- An HTTP request (or cache hit) per plugin entrypoint *and* its transitive deps
  (~thousands of files in dev).
- Synchronous evaluation of every imported module.
- A non-trivial cost in the production bundle's `manual chunks` even with
  Vite's tree shaking.

The plugin manager already supports a `pluginLoader` that returns plugins by id
([useApp.tsx:107-115](packages/sdk/app-framework/src/ui/hooks/useApp.tsx)).
Recommendation: replace the eager `import` block in `plugin-defs.tsx` with a
function that *constructs* a Plugin record where `module.activate` does
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
*need* the theme to be loaded before painting *something*.

### 4.5 SharedWorker creation

`createClientServices` instantiates `SharedWorker(./shared-worker, ...)`
([main.tsx:230-243](packages/apps/composer-app/src/main.tsx)). Spawning a
SharedWorker incurs a one-time cost (open second JS context, parse worker
bundle). This is unavoidable but worth measuring — the harness's
`profile.phases` will show it as the `services` phase.

### 4.6 Activation graph

`SetupReactSurface` and `Startup` are activated in `Effect.all([...])` at
[useApp.tsx:210-214](packages/sdk/app-framework/src/ui/hooks/useApp.tsx). The
plugin manager fans out *all* matching modules per event via
`Effect.allWith({ concurrency: 'unbounded' })` ([plugin-manager.ts:712](packages/sdk/app-framework/src/core/plugin-manager.ts)). With `Atom` writes on each
contribution, this can pile up React renders.

A bounded concurrency (e.g. 4–8) plus a single batched render via
`flushSync` after a whole event activates would smooth out paint cadence.

## 5. Recommendations (ranked, post-baseline)

Ordering rewritten after running the harness — the welcome onboarding cost was
not visible from static reading.

1. ✅ **Phase 1 (shipped):** Defer `OnboardingManager.initialize()` so it is
   not awaited inside the welcome.onboarding module's activation. The manager
   is contributed synchronously and identity creation continues as a
   background side-effect. Cold profilerTotal dropped 45% (8.5 → 4.7 s).
   See [`src/plugins/welcome/capabilities/onboarding.ts`](src/plugins/welcome/capabilities/onboarding.ts).
   *Caveat:* on a true first-run user (skipAuth path), the app shell now
   renders before identity exists — downstream code that reads
   `WelcomeCapabilities.Onboarding` already obtains the manager and observes
   identity state via existing `client.halo.identity` subscriptions, so this
   is OK. The first-run UX flash is unverified at the time of this writing
   (the e2e suite still passes, but no real first-run user has tested it).
2. **Lazy-load non-core plugins.** Convert `plugin-defs.tsx` from `import {
   FooPlugin } from '@dxos/plugin-foo'` to a record like
   `{ id: '@dxos/plugin-foo', activate: () => import('@dxos/plugin-foo').then(...)
   }` so the chunk is only requested when needed. Targets the `main-*.js`
   (8.5 MB raw / 2.39 MB gzip) chunk and the 4.9 s of pre-await sync graph
   evaluation. Biggest architectural win after #1.
3. **Pipeline the four `await import`s in `main.tsx`** with `Promise.all`.
   Tiny diff; measurable on `dynamic-imports` phase (300 ms today; should be
   <100 ms with HTTP/2 multiplexing).
4. **Add a `startup:user-account-mounted` mark** in the deck/space plugin so
   `profilerTotal` reflects "first interactive surface rendered" rather than
   just `Startup` activation. That eliminates the unaccounted ~7 s gap between
   `profilerTotal` and `navigationToReady`.
5. **Bound module activation concurrency** to 4–8 in `plugin-manager.ts`
   ([:712](packages/sdk/app-framework/src/core/plugin-manager.ts), [:683-684](packages/sdk/app-framework/src/core/plugin-manager.ts)).
   The 6 `*.AppGraphBuilder` modules clustering at ~1,560 ms each look like
   they're all waiting on the same upstream and serialising on contention; a
   bounded queue may both reduce contention and yield to React more often.
6. **Yield to the event loop inside `_loadModule`** between
   `_contributeCapabilities` and the next module — `yield* Effect.yieldNow()`.
   This is what unblocks React rendering the determinate progress indicator
   reliably.
7. **`scheduler.yield()` instead of `setInterval(100)`** in `useApp` for
   progress updates. Shorter latency to first observed update.
8. **Move `virtual:pwa-register/react` and PWA registration** into `Fallback`'s
   render path (it's only needed on error or update notifications), and make
   the PWA manifest fetch defer until `'idle'`.
9. **Track-only the slowest 5 modules in production observability** via
   PostHog so we have a real-world distribution, not just dev-laptop numbers.
   Build on top of `profiler.snapshot()`.
10. **Swap `cssText` of `#boot-loader` to use the brand Composer logo SVG** so
    the boot loader visually matches `Placeholder.tsx` — eliminates the slight
    flash when React replaces the DOM. Cheap, polish-grade.

## 6. Files changed in this PR

| File | Why |
| --- | --- |
| `index.html` | Native-DOM boot loader (CSS-animated, paints on first frame, status driver on `window.__composerBoot`). |
| `src/main.tsx` | Calls `bootStatus(...)` at each profiler phase; wires the boot driver. |
| `src/profiler.ts` | Adds `Profiler.snapshot()` returning `ProfilerSnapshot` JSON; persists to `localStorage` on `dump()`. |
| `src/components/Placeholder/Placeholder.tsx` | Renders the determinate progress indicator (un-comments the disabled block, threads `progress.activated`/`progress.total`). |
| `src/playwright/startup.spec.ts` | Cold + warm timing harness, plus a "boot loader paints before bundle parses" smoke test. Writes JSON to `test-results/composer-app/`. |
| `AUDIT.md` | This document. |

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

| | Cold profilerTotal | Cold navToReady | Warm profilerTotal | Warm navToReady |
| --- | ---: | ---: | ---: | ---: |
| baseline (`f1cda8f2f8`) | 8,554 ms | 13,485 ms | 3,210 ms | 7,405 ms |
| **phase 1** (`e7f390ae3e + ⚠`) | **4,704 ms** | **9,596 ms** | 3,163 ms | 7,364 ms |
| delta | **−45%** | **−29%** | unchanged (noise) | unchanged (noise) |

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
the target of recommendation #5.
