# Composer `serve-min` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in `moon run composer-app:serve-min` that starts the Composer dev server with a minimal plugin set and without pre-building all ~208 `@dxos` deps.

**Architecture:** Vite dev already resolves `@dxos/*` to source (`importSource` plugin), so `serve-min` replaces the `^:build` dependency with an explicit list of the only packages whose `dist` is consumed (the `importSource` exclude list + `protocols` codegen + `plugin-sketch` assets). `DX_PLUGIN_SET=minimal` swaps `plugin-defs.tsx` for `plugin-defs.minimal.tsx` via a vite alias; `main.tsx` is untouched.

**Tech Stack:** Vite 8 (rolldown), moon tasks, DXOS app-framework plugins.

## Global Constraints

- Spec: `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md`.
- Existing `serve` / `bundle` tasks must be unaffected.
- Minimal plugin set = core infrastructure + Markdown + Assistant (+ functional deps discovered at boot).
- No compatibility shims; no casts; comments say why, once.
- `pnpm format` before every commit.

---

### Task 1: `plugin-defs.minimal.tsx`

**Files:**
- Create: `packages/apps/composer-app/src/plugin-defs.minimal.tsx`

**Interfaces:**
- Produces: `getPlugins(config: PluginConfig): Plugin.Plugin[]`, `getDefaults(config: PluginConfig): string[]` — same runtime surface as `plugin-defs.tsx` (types come from `plugin-defs.tsx` via type-only import, erased at transform time so the vite alias cannot self-loop).

- [ ] **Step 1: Write the file**

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { AttentionPlugin } from '@dxos/plugin-attention/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { DeckPlugin } from '@dxos/plugin-deck/plugin';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { NavTreePlugin } from '@dxos/plugin-navtree/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { OnboardingPlugin } from '@dxos/plugin-onboarding/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
import { StatusBarPlugin } from '@dxos/plugin-status-bar/plugin';
import { ThemePlugin } from '@dxos/plugin-theme/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { isTruthy } from '@dxos/util';

import type { PluginConfig } from './plugin-defs';
import { downloadLogs } from './util';

/**
 * Minimal plugin registry for fast dev startup (DX_PLUGIN_SET=minimal, `serve-min`).
 * Core infrastructure + Markdown + Assistant only — see the serve-min spec.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
];

export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => {
  const { appKey, config: clientConfig, services, observability, logStore, isDev, isLocal, isMobile } = config;
  return [
    AssistantPlugin(),
    AttentionPlugin(),
    ClientPlugin({
      config: clientConfig,
      services,
      shareableLinkOrigin: window.location.origin,
      onReset: () =>
        Effect.sync(() => {
          localStorage.clear();
          window.location.pathname = '/';
        }),
    }),
    DeckPlugin(),
    GraphPlugin(),
    MarkdownPlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
    }),
    OnboardingPlugin({ generateExemplarSpace: false }),
    ProcessManagerPlugin(),
    RegistryPlugin(),
    SettingsPlugin(),
    SpacePlugin({ observability: true, shareableLinkOrigin: window.location.origin }),
    StatusBarPlugin(),
    ThemePlugin({ appName: 'Composer', noCache: isDev, platform: isMobile ? 'mobile' : 'desktop' }),
    ThreadPlugin(),
  ].filter(isTruthy);
};
```

Note: exact option shapes must match `plugin-defs.tsx` usage; unused destructured flags (`isLocal`) may be dropped at implementation time. Plugins may need to be added during Task 4 boot verification (e.g. `StackPlugin` if Deck requires it) — add, don't restructure.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "composer-app: minimal plugin defs for serve-min"
```

### Task 2: vite alias + warmup gating

**Files:**
- Modify: `packages/apps/composer-app/vite.config.ts` (`resolve.alias` array ~line 286; `server.warmup.clientFiles` ~line 120)

**Interfaces:**
- Consumes: `plugin-defs.minimal.tsx` from Task 1.
- Produces: `DX_PLUGIN_SET=minimal` env contract used by Task 3.

- [ ] **Step 1: Add near the top (after `isFastBundle`)**

```ts
// DX_PLUGIN_SET=minimal (serve-min task) swaps the full plugin registry for
// plugin-defs.minimal.tsx without touching main.tsx.
const isMinimalPluginSet = process.env.DX_PLUGIN_SET === 'minimal';
```

- [ ] **Step 2: In `resolve.alias`, prepend**

```ts
...(isMinimalPluginSet
  ? [{ find: /^\.\/plugin-defs$/, replacement: path.resolve(dirname, 'src/plugin-defs.minimal.tsx') }]
  : []),
```

- [ ] **Step 3: In `server.warmup.clientFiles`, replace `'./src/plugin-defs.tsx'` with**

```ts
isMinimalPluginSet ? './src/plugin-defs.minimal.tsx' : './src/plugin-defs.tsx',
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "composer-app: DX_PLUGIN_SET=minimal vite alias"
```

### Task 3: moon `serve-min` task

**Files:**
- Modify: `packages/apps/composer-app/moon.yml`

**Interfaces:**
- Consumes: `DX_PLUGIN_SET` contract from Task 2.
- Produces: `moon run composer-app:serve-min`.

- [ ] **Step 1: Add task** (verify `plugin-sketch` build produces `dist/assets` first — `composer-app:prebuild` copies from it)

```yaml
  # Minimal-plugin dev server: skips `^:build` — vite dev resolves @dxos/* from
  # source (importSource) — and builds only packages whose dist is consumed.
  # Keep the dep list in sync with the importSource `exclude` list in
  # vite.config.ts. DX_PLUGIN_SET=minimal swaps in plugin-defs.minimal.tsx.
  serve-min:
    command: pnpm exec vite dev
    env:
      DX_PLUGIN_SET: minimal
    preset: server
    deps:
      - prebuild
      - plugin-sketch:build
      - client-services:build
      - config:build
      - lit-grid:build
      - lit-ui:build
      - lock-file:build
      - network-manager:build
      - observability:build
      - protocols:build
      - random-access-storage:build
      - teleport:build
```

- [ ] **Step 2: Verify graph excludes plugins**

Run: `moon action-graph composer-app:serve-min | grep -c "plugin-"`
Expected: only `plugin-sketch` targets (assets) — no other `plugin-*:build`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "composer-app: serve-min task with narrow build deps"
```

### Task 4: Boot verification

**Files:**
- Possibly modify: `plugin-defs.minimal.tsx` (add missing plugins), `.claude/launch.json` (worktree copy) for preview.

- [ ] **Step 1:** `moon run composer-app:serve-min` (background/preview, free port via `-- --port 5273`). Time the run; note build count vs full `serve`.
- [ ] **Step 2:** Open the app; check console for activation errors. Iterate: add any plugin whose absence breaks activation (keep additions minimal, note each in the spec).
- [ ] **Step 3:** Functional check — identity/onboarding flow, create a markdown document, open assistant panel.
- [ ] **Step 4:** `pnpm format`, commit fixes.

```bash
pnpm format && git add -A && git commit -m "composer-app: serve-min boot fixes"
```

### Task 5: Workstream 2 — dev-server hang investigation

No code prescribed; investigation with evidence before fixes (systematic-debugging).

- [ ] **Step 1: Evidence** — vite/rolldown version; `awaitWriteFinish` settings; theme/Tailwind scan surface (which file invalidations trigger monorepo-wide rescans); optimizeDeps config; DxosLogPlugin behavior on bursts.
- [ ] **Step 2: Reproduce** — with `serve` (or `serve-min`) running, script an edit burst (touch ~100 source files across packages), then probe responsiveness (`curl -m 5` a module URL); on hang, capture a CPU sample of the node process (`sample <pid> 5`).
- [ ] **Step 3: Diagnose** — attribute the hang (Tailwind rescan queue vs optimizer re-run vs watcher storm vs log plugin). Compare full vs minimal graph to answer "possibly related?".
- [ ] **Step 4: Fix or file** — implement a config-level fix if root cause is clear and low-risk; otherwise document findings + recommendation in the spec and TASKS.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "composer-app: dev-server hang investigation findings"
```
