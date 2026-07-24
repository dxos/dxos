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

**`packages/apps/composer-app/src/plugin-defs.minimal.tsx`**

- Exports the same surface as `plugin-defs.tsx`: `getPlugins`, `getDefaults`,
  `PluginConfig`, `State` (types re-exported from `plugin-defs.tsx` — no
  restructuring of the full file).
- Plugin set: Client, Space, Graph, Attention, Theme, layout (Deck /
  SimpleLayout / Spotlight per platform flags), NavTree, Settings, Registry,
  Observability, ProcessManager, StatusBar, plus Markdown and Assistant and
  any plugins Assistant functionally requires (e.g. Thread) — resolved during
  implementation by booting the app.

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
