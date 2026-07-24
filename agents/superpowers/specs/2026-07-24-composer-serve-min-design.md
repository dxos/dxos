# Composer minimal-plugin dev serve (`serve-min`)

Date: 2026-07-24
Status: approved

## Problem

`moon run composer-app:serve` depends on `^:build`, building all ~208 `@dxos`
dependencies (89 plugins) before `vite dev` starts. In dev, vite resolves
nearly all `@dxos/*` packages to source via the `importSource` plugin, so most
of that build output is never consumed. Consequences:

- Long cold start for the dev server.
- Large refactors invalidate the moon cache broadly → extremely long rebuilds,
  and occasional startup hangs that force cache deletion.

A related (to be investigated separately, workstream 2) symptom: the dev
server frequently hangs during heavy edit bursts and must be killed.

## Decisions (from brainstorming)

1. Primary pain is the moon pre-build (`^:build`), not vite transform time.
2. Minimal plugin set = core infrastructure + Markdown + Assistant.
3. Env-gated alternative plugin defs inside composer-app (not a separate
   package), keeping the door open for a separately deployed variant later.
4. Opt-in task (`serve-min`); existing `serve` untouched.

## Design

### Workstream 1: `serve-min`

**`packages/apps/composer-app/src/plugin-defs.core.tsx`** (added post-review)

- Single source of truth for the infrastructure plugins shared by both sets:
  Client, Space, Graph, Attention, Theme, layout (Deck / SimpleLayout /
  Spotlight per platform flags), NavTree, Settings, Registry, Observability,
  Onboarding, ProcessManager, StatusBar — including full-fidelity options
  (`ClientPlugin.onReset` target handling, Tauri link origin). Also owns the
  `State` / `PluginConfig` types; both defs files re-export them.

**`packages/apps/composer-app/src/plugin-defs.minimal.tsx`**

- Exports the same surface as `plugin-defs.tsx`: `getPlugins`, `getDefaults`,
  `PluginConfig`, `State`.
- `getPlugins` = `[...getCorePlugins(config), Assistant, Comments, Markdown,
  Thread]`. Content additions here must also be added to the minimal
  `optimizeDeps.entries` brace glob in vite.config.ts.

**`packages/apps/composer-app/vite.config.ts`**

- When `DX_PLUGIN_SET=minimal`, alias `./plugin-defs` →
  `./plugin-defs.minimal.tsx`. `main.tsx` is untouched; the full defs file
  never enters the dev module graph.

**`packages/apps/composer-app/moon.yml`**

- New task `serve-min`: `DX_PLUGIN_SET=minimal pnpm exec vite dev`, `preset:
server`, deps = explicit narrow list instead of `^:build`:
  - Builds for the `importSource` exclude list (`@dxos/config`,
    `@dxos/client-services`, `@dxos/observability`, `@dxos/network-manager`,
    `@dxos/teleport`, `@dxos/random-access-storage`, `@dxos/lock-file`,
    `@dxos/lit-*`) — moon pulls each target's transitive chain automatically.
  - `protocols` codegen chain (`prebuild` outputs land in `src/proto/gen`,
    which source resolution then reads).
  - `composer-app:prebuild` (copies `plugin-sketch` dist assets).
- A comment pairs the dep list with the `importSource` exclude list in
  vite.config.ts so drift is caught; the failure mode is an overt dev-server
  resolution error, not silent breakage.

### Workstream 2: dev-server hang investigation

Investigate the hang during heavy edit bursts (possibly related: smaller
module graph shrinks the Tailwind rescan and HMR invalidation surface).
Leads: the `awaitWriteFinish` watcher comment in vite.config.ts (theme CSS
invalidation → monorepo-wide Tailwind rescan queue), vite dep-optimizer
re-runs. Output: diagnosis + fix or a documented follow-up.

#### Findings (2026-07-24)

Prior mitigations (June 2026: `dist/**` watcher ignore for the `.d.ts` HMR
storm, trailing-edge theme-CSS reload coalescing in
`ui-theme/src/plugins/ThemePlugin.ts`, `awaitWriteFinish` burst coalescing)
address the historical storm causes; the residual hang has a different
profile:

- **Edit-burst repro (serve-min):** touching 350 in-graph files degraded
  module responses to ~1.9 s for a few seconds, full recovery in <10 s — no
  hang. The full app's graph is an order of magnitude larger and vite's
  transform pipeline is single-threaded, so the same wave there produces
  minutes of unresponsiveness that presents as a hang.
- **Dep-optimizer cost (measured):** the main checkout's optimizer cache is
  **3,545 files / 243 MB** (`packages/apps/composer-app/node_modules/.vite/deps`).
  Any invalidation of the optimizer key (lockfile, vite config, env in the
  cache key — typical fallout of a large refactor) re-bundles everything;
  requests for optimized deps block behind it. Measured on serve-min
  (1,844 dep files): ~20 s to first index response, ~45 s to page load after
  a cache wipe. The full app roughly doubles that, and interleaved requests
  against outdated dep hashes mid-optimization can loop (classic
  `504 outdated optimize dep` failure mode) — matching the observed "hangs
  on startup until the cache is deleted" ritual.
- **Broken first load mid-optimization:** loading the page while the
  optimizer runs produced a looping `Missing ThemeContext` crash inside the
  error dialog itself (`AlertDialog.Overlay` rendered outside a
  ThemeProvider) — the startup failure was unrecoverable-looking when a
  plain reload sufficed. Filed as a separate task.

**Conclusion:** the two reported symptoms (mid-edit hang, post-refactor
startup hang) share one root: the size of the full app's module graph and
optimizer set. `serve-min` bounds both (15 vs 89 plugin entries scanned,
~half the optimizer set, no 200-package pre-build) and is the recommended
daily-dev path. If a hang recurs under serve-min, capture `sample <vite pid>`
during the stall — that distinguishes transform load from optimizer
deadlock. A speculative optimizer pin (`optimizeDeps.noDiscovery` + explicit
include list) was deliberately not applied without a direct full-app repro.

## Verification

- `moon run composer-app:serve-min` on an alternate port boots to a usable
  deck; markdown doc creation and assistant open work.
- Task graph for `serve-min` contains no plugin builds (moon dry-run/query).
- Full `serve` and `bundle` unaffected (moon graph unchanged for them).

## Later (out of scope)

- `bundle-min` production build reusing the same alias for a separately
  deployed lite variant.
- Promoting the minimal defs into a `composer-lite` package if the deployed
  variant materializes.
