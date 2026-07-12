# Progress Monitor Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an app-toolkit capability that lets plugins provide and subscribe to live progress monitors, wired to inbox sync and shown both inline (MailboxArticle) and in an R0 rail popover.

**Architecture:** A pure leaf package `@dxos/progress` holds the shared progress primitives (extracted from `@dxos/pipeline`, which becomes a consumer). `@dxos/app-toolkit` wraps a progress registry in a jotai-style atom (`@effect-atom`) as the `ProgressRegistry` capability, with hooks and a `ProgressMeter` component. A new always-on `plugin-progress` contributes the registry and an `AppSurface.StatusIndicator` popover. `plugin-inbox` sync registers a monitor; `MailboxArticle` renders the meter.

**Tech Stack:** TypeScript, Effect, `@effect-atom/atom-react`, `@dxos/app-framework` capabilities, `@dxos/react-ui`, moon, vitest.

## Global Constraints

- New packages set `"private": true` in `package.json` (removed later by a human).
- In-repo dependencies use `workspace:*`; external deps use `catalog:` (add with `pnpm add --filter "<project>" --save-catalog "<package>"`).
- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`). `as const` is fine.
- Named exports, no default exports except plugin capability modules (which use `export default Capability.makeModule(...)` per the established pattern).
- Every file starts with the copyright header:
  ```ts
  //
  // Copyright 2026 DXOS.org
  //
  ```
- Comments state *why*, end with a period, JSDoc public functions.
- Format with `npx oxfmt --write` before every commit (CI checks `oxfmt --check`, not prettier).
- TDD: write the failing test first, watch it fail, implement minimally, watch it pass, commit.
- Build one package: `moon run <package>:build`. Test one file: `moon run <package>:test -- path/to/file.test.ts`. Lint & fix: `moon run :lint -- --fix`.
- Never create/rename/switch branches or worktrees; work only in the assigned worktree.

---

## File Structure

**New package `@dxos/progress`** (`packages/core/compute/progress/`) — pure primitives:
- `src/Progress.ts` — types (`TaskProgress`, `ProgressSnapshot`, `TaskHandle`, `ProgressApi`), `make()`, `deriveEta()`.
- `src/index.ts` — namespace re-export.
- `src/Progress.test.ts` — unit tests.
- `package.json`, `moon.yml`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `LICENSE`.

**Modified `@dxos/pipeline`** (`packages/core/compute/pipeline/`):
- `src/Progress.ts` — delete the duplicated pure impl; re-export `@dxos/progress` and keep only the Effect `Progress` Tag + `layer`.
- `package.json`, `tsconfig.json` — add `@dxos/progress` dependency + reference.

**Modified `@dxos/app-toolkit`** (`packages/sdk/app-toolkit/`):
- `src/app-framework/AppCapabilities.ts` — add `ProgressRegistry` capability type + tag.
- `src/app-framework/progress-registry.ts` — `createProgressRegistry(registry)` factory.
- `src/app-framework/progress-registry.test.ts` — factory tests.
- `src/ui/hooks/useProgress.ts` — `useProgress`, `useProgressMonitors`.
- `src/ui/hooks/index.ts` — export the hooks.
- `src/ui/components/ProgressMeter.tsx` — the meter component.
- `src/ui/components/ProgressMeter.stories.tsx` — stories.
- `src/ui/components/index.ts` — export the component.
- `package.json`, `tsconfig.json` — add `@dxos/progress`.

**New package `@dxos/plugin-progress`** (`packages/plugins/plugin-progress/`):
- `dx.config.ts`, `src/meta.ts`, `src/plugin.ts`, `src/ProgressPlugin.ts`, `src/index.ts`.
- `src/capabilities/{index.ts,progress-registry.ts,react-surface.tsx}`.
- `src/components/{index.ts,ProgressStatusIndicator.tsx,ProgressStatusIndicator.stories.tsx}`.
- `src/translations.ts`.
- `package.json`, `moon.yml`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `LICENSE`.

**Modified `@dxos/composer-app`** (`packages/apps/composer-app/`):
- `src/plugin-defs.tsx` — import + register `ProgressPlugin` and its meta key (always-on).

**Modified `@dxos/plugin-inbox`** (`packages/plugins/plugin-inbox/`):
- `src/operations/google/gmail/sync.ts` — register/advance/remove a progress monitor.
- `src/containers/MailboxArticle/MailboxArticle.tsx` — render `ProgressMeter`.

---

## Task 1: `@dxos/progress` leaf package (shared core)

**Files:**
- Create: `packages/core/compute/progress/package.json`
- Create: `packages/core/compute/progress/moon.yml`
- Create: `packages/core/compute/progress/tsconfig.json`
- Create: `packages/core/compute/progress/vitest.config.ts`
- Create: `packages/core/compute/progress/README.md`
- Create: `packages/core/compute/progress/src/index.ts`
- Create: `packages/core/compute/progress/src/Progress.ts`
- Test: `packages/core/compute/progress/src/Progress.test.ts`

**Interfaces:**
- Produces:
  - `type TaskStatus = 'pending' | 'running' | 'done' | 'error'`
  - `type TaskProgress = { name: string; label?: string; current: number; total?: number; status: TaskStatus; startedAt?: string; updatedAt: string; elapsedMs?: number; estimatedMs?: number; note?: string; error?: string }`
  - `type ProgressSnapshot = { updatedAt: string; tasks: readonly TaskProgress[] }`
  - `interface TaskHandle { advance(by?: number): void; set(current: number): void; total(total: number): void; estimate(remainingMs: number): void; note(text: string): void; done(): void; fail(error: string): void; remove(): void }`
  - `interface ProgressApi { task(name, options?): TaskHandle; seed(tasks): void; snapshot(): ProgressSnapshot; subscribe(listener): () => void }`
  - `const make: () => ProgressApi`
  - `const deriveEta: (task: TaskProgress) => number | undefined`

- [ ] **Step 1: Scaffold the package files**

Create `packages/core/compute/progress/package.json`:

```json
{
  "name": "@dxos/progress",
  "version": "0.9.0",
  "description": "Shared progress primitives (registry, snapshots, ETA) for pipelines and app surfaces.",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "default": "./dist/lib/neutral/index.mjs",
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "scripts": {},
  "dependencies": {},
  "devDependencies": {
    "vitest": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Create `packages/core/compute/progress/moon.yml`:

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--platform=neutral'
```

Create `packages/core/compute/progress/tsconfig.json`:

```json
{
  "extends": "../../../../tsconfig.base.json",
  "include": [
    "src"
  ],
  "references": []
}
```

Create `packages/core/compute/progress/vitest.config.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
```

Create `packages/core/compute/progress/README.md`:

```markdown
# @dxos/progress

Shared progress primitives: an in-memory progress registry, snapshots, and a
derived-ETA helper. Consumed by `@dxos/pipeline` (its `Progress` Effect service)
and `@dxos/app-toolkit` (the `ProgressRegistry` capability).
```

Copy `LICENSE` from a sibling: `cp packages/core/compute/pipeline/LICENSE packages/core/compute/progress/LICENSE`.

- [ ] **Step 2: Write the failing test**

Create `packages/core/compute/progress/src/Progress.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Progress from './Progress';

describe('Progress', () => {
  test('seed registers pending tasks', () => {
    const progress = Progress.make();
    progress.seed([{ name: 'a', total: 3 }, { name: 'b' }]);
    const snapshot = progress.snapshot();
    expect(snapshot.tasks.map((task) => task.name)).toEqual(['a', 'b']);
    expect(snapshot.tasks.every((task) => task.status === 'pending')).toBe(true);
    expect(snapshot.tasks.find((task) => task.name === 'a')?.total).toBe(3);
  });

  test('task advances, records timing, sets total/estimate, and completes', () => {
    const progress = Progress.make();
    const handle = progress.task('a', { total: 3, label: 'A' });
    handle.advance();
    handle.advance();
    handle.total(4);
    handle.estimate(1_000);
    let task = progress.snapshot().tasks[0];
    expect(task.current).toBe(2);
    expect(task.total).toBe(4);
    expect(task.estimatedMs).toBe(1_000);
    expect(task.label).toBe('A');
    expect(task.status).toBe('running');
    expect(task.startedAt).toBeDefined();
    expect(task.elapsedMs).toBeGreaterThanOrEqual(0);

    handle.set(4);
    handle.done();
    task = progress.snapshot().tasks[0];
    expect(task.current).toBe(4);
    expect(task.status).toBe('done');
  });

  test('fail records the error and status', () => {
    const progress = Progress.make();
    progress.task('a').fail('boom');
    const task = progress.snapshot().tasks[0];
    expect(task.status).toBe('error');
    expect(task.error).toBe('boom');
  });

  test('remove drops the task from the registry', () => {
    const progress = Progress.make();
    const handle = progress.task('a');
    expect(progress.snapshot().tasks).toHaveLength(1);
    handle.remove();
    expect(progress.snapshot().tasks).toHaveLength(0);
  });

  test('subscribers are notified on change until unsubscribed', () => {
    const progress = Progress.make();
    let notifications = 0;
    const unsubscribe = progress.subscribe(() => notifications++);
    const handle = progress.task('a');
    handle.advance();
    const afterTwo = notifications;
    expect(afterTwo).toBeGreaterThanOrEqual(2);

    unsubscribe();
    handle.advance();
    expect(notifications).toBe(afterTwo);
  });

  describe('deriveEta', () => {
    test('returns the producer estimate when present', () => {
      const eta = Progress.deriveEta({
        name: 'a',
        current: 2,
        total: 10,
        status: 'running',
        updatedAt: new Date().toISOString(),
        elapsedMs: 4_000,
        estimatedMs: 500,
      });
      expect(eta).toBe(500);
    });

    test('falls back to a linear estimate from elapsed/current', () => {
      const eta = Progress.deriveEta({
        name: 'a',
        current: 2,
        total: 10,
        status: 'running',
        updatedAt: new Date().toISOString(),
        elapsedMs: 4_000,
      });
      // 4000ms / 2 done × 8 remaining = 16000ms.
      expect(eta).toBe(16_000);
    });

    test('returns undefined when total or progress is unknown', () => {
      const base = { name: 'a', current: 0, status: 'running' as const, updatedAt: new Date().toISOString() };
      expect(Progress.deriveEta(base)).toBeUndefined();
      expect(Progress.deriveEta({ ...base, total: 10 })).toBeUndefined();
      expect(Progress.deriveEta({ ...base, current: 3, elapsedMs: 100 })).toBeUndefined();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `moon run progress:test -- src/Progress.test.ts`
Expected: FAIL — cannot resolve `./Progress` (module not created yet).

- [ ] **Step 4: Write the implementation**

Create `packages/core/compute/progress/src/Progress.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** Lifecycle of a tracked task (a pipeline run, a sync, a benchmark stage, …). */
export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

/** Live progress for one task: `current`/`total` is the item (e.g. message) index. */
export type TaskProgress = {
  /** Stable key within a registry. */
  readonly name: string;
  /** Human display name, shown by UIs. */
  readonly label?: string;
  readonly current: number;
  readonly total?: number;
  readonly status: TaskStatus;
  readonly startedAt?: string;
  readonly updatedAt: string;
  readonly elapsedMs?: number;
  /** Producer-supplied estimate of remaining time (ms); see {@link deriveEta}. */
  readonly estimatedMs?: number;
  readonly note?: string;
  readonly error?: string;
};

export type ProgressSnapshot = {
  readonly updatedAt: string;
  readonly tasks: readonly TaskProgress[];
};

/** Handle for updating one task; returned by {@link ProgressApi.task}. */
export interface TaskHandle {
  /** Advance the item index by `by` (default 1). */
  readonly advance: (by?: number) => void;
  /** Set the absolute item index. */
  readonly set: (current: number) => void;
  /** Set (or revise) the expected total. */
  readonly total: (total: number) => void;
  /** Set the producer's estimate of remaining time (ms). */
  readonly estimate: (remainingMs: number) => void;
  readonly note: (text: string) => void;
  readonly done: () => void;
  readonly fail: (error: string) => void;
  /** Remove this task from the registry (e.g. when a transient monitor completes). */
  readonly remove: () => void;
}

/**
 * A live progress registry. It is subscribable — every mutation notifies listeners, so a reactive
 * consumer (e.g. a browser panel) updates instantly while file/log sinks throttle.
 */
export interface ProgressApi {
  /** Registers (or resumes) a task and marks it running; returns a handle to update it. */
  readonly task: (name: string, options?: { total?: number; label?: string }) => TaskHandle;
  /** Pre-registers tasks as `pending` (so an orchestrator can show the full list up front). */
  readonly seed: (tasks: readonly { name: string; total?: number; label?: string }[]) => void;
  readonly snapshot: () => ProgressSnapshot;
  /** Subscribe to snapshots; returns an unsubscribe. The listener fires on every change. */
  readonly subscribe: (listener: (snapshot: ProgressSnapshot) => void) => () => void;
}

type MutableTask = {
  name: string;
  label?: string;
  current: number;
  total?: number;
  status: TaskStatus;
  startedAt?: string;
  updatedAt: string;
  elapsedMs?: number;
  estimatedMs?: number;
  note?: string;
  error?: string;
};

/** Construct a standalone progress registry. */
export const make = (): ProgressApi => {
  const tasks = new Map<string, MutableTask>();
  const listeners = new Set<(snapshot: ProgressSnapshot) => void>();
  const now = (): string => new Date().toISOString();

  const snapshot = (): ProgressSnapshot => ({
    updatedAt: now(),
    tasks: [...tasks.values()].map((task) => ({ ...task })),
  });

  const emit = (): void => {
    if (listeners.size > 0) {
      const current = snapshot();
      for (const listener of listeners) {
        listener(current);
      }
    }
  };

  const touch = (task: MutableTask, mutate: (task: MutableTask) => void): void => {
    mutate(task);
    task.updatedAt = now();
    if (task.startedAt) {
      task.elapsedMs = Date.parse(task.updatedAt) - Date.parse(task.startedAt);
    }
    emit();
  };

  const task: ProgressApi['task'] = (name, options = {}) => {
    const started = now();
    const entry: MutableTask = tasks.get(name) ?? { name, current: 0, status: 'pending', updatedAt: started };
    entry.label = options.label ?? entry.label;
    entry.total = options.total ?? entry.total;
    entry.status = 'running';
    entry.startedAt = entry.startedAt ?? started;
    entry.updatedAt = started;
    tasks.set(name, entry);
    emit();
    return {
      advance: (by = 1) => touch(entry, (item) => (item.current += by)),
      set: (current) => touch(entry, (item) => (item.current = current)),
      total: (total) => touch(entry, (item) => (item.total = total)),
      estimate: (remainingMs) => touch(entry, (item) => (item.estimatedMs = remainingMs)),
      note: (text) => touch(entry, (item) => (item.note = text)),
      done: () => touch(entry, (item) => (item.status = 'done')),
      fail: (error) => touch(entry, (item) => ((item.status = 'error'), (item.error = error))),
      remove: () => {
        tasks.delete(name);
        emit();
      },
    };
  };

  const seed: ProgressApi['seed'] = (defs) => {
    for (const def of defs) {
      if (!tasks.has(def.name)) {
        tasks.set(def.name, {
          name: def.name,
          label: def.label,
          total: def.total,
          current: 0,
          status: 'pending',
          updatedAt: now(),
        });
      }
    }
    emit();
  };

  const subscribe: ProgressApi['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };

  return { task, seed, snapshot, subscribe };
};

/**
 * Estimated remaining time (ms): the producer's `estimatedMs` if present, else a naive linear
 * estimate `elapsedMs / current × (total − current)` when the total and some progress are known;
 * `undefined` when it cannot be estimated.
 */
export const deriveEta = (task: TaskProgress): number | undefined => {
  if (task.estimatedMs !== undefined) {
    return task.estimatedMs;
  }
  if (task.total !== undefined && task.current > 0 && task.current < task.total && task.elapsedMs !== undefined) {
    return (task.elapsedMs / task.current) * (task.total - task.current);
  }
  return undefined;
};
```

Create `packages/core/compute/progress/src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * as Progress from './Progress';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run progress:test -- src/Progress.test.ts`
Expected: PASS (all cases).

Then install so the workspace resolves the new package:

Run: `pnpm install`
Expected: adds `@dxos/progress` to the workspace (no errors).

- [ ] **Step 6: Format, build, commit**

```bash
npx oxfmt --write packages/core/compute/progress
moon run progress:build
git add packages/core/compute/progress pnpm-lock.yaml
git commit -m "feat(progress): shared progress primitives leaf package"
```

Expected: build succeeds; commit created.

---

## Task 2: Rewire `@dxos/pipeline` to consume `@dxos/progress`

**Files:**
- Modify: `packages/core/compute/pipeline/src/Progress.ts`
- Modify: `packages/core/compute/pipeline/package.json`
- Modify: `packages/core/compute/pipeline/tsconfig.json`

**Interfaces:**
- Consumes: `@dxos/progress` (`Progress.make`, `Progress.ProgressApi`, `Progress.TaskProgress`, etc.).
- Produces (unchanged public surface): `Progress.Progress` (Effect Tag), `Progress.layer`, and re-exported `make`/types via `export * as Progress from './Progress'` in the pipeline index.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add --filter "@dxos/pipeline" "@dxos/progress@workspace:*"`
Expected: `@dxos/progress: workspace:*` added to pipeline `dependencies`.

Add the project reference to `packages/core/compute/pipeline/tsconfig.json` `references` array:

```json
    {
      "path": "../progress"
    }
```

(Place it alongside the existing `../../../common/effect` and `../../../common/log` references.)

- [ ] **Step 2: Replace the pure impl with delegation**

Replace the entire contents of `packages/core/compute/pipeline/src/Progress.ts` with:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { Progress as ProgressCore } from '@dxos/progress';

// The registry primitives now live in @dxos/progress so both the pipeline (this Effect service) and
// the app-toolkit ProgressRegistry capability share one implementation. Re-export them so existing
// `Progress.*` call sites (Stage.track, ProgressReporter) keep resolving unchanged.
export * from '@dxos/progress/Progress';

export class Progress extends Context.Tag('@dxos/pipeline/Progress')<Progress, ProgressCore.ProgressApi>() {
  /** A fresh in-memory registry. */
  static layer: Layer.Layer<Progress> = Layer.sync(Progress, () => ProgressCore.make());
}
```

> Note: `export * from '@dxos/progress/Progress'` requires that subpath to resolve. `@dxos/progress` only exports `.` (the namespace). To re-export the flat members, instead import and re-export explicitly. Use this body if the subpath does not resolve:
>
> ```ts
> import { Progress as ProgressCore } from '@dxos/progress';
> export type TaskStatus = ProgressCore.TaskStatus;
> export type TaskProgress = ProgressCore.TaskProgress;
> export type ProgressSnapshot = ProgressCore.ProgressSnapshot;
> export type TaskHandle = ProgressCore.TaskHandle;
> export type ProgressApi = ProgressCore.ProgressApi;
> export const make = ProgressCore.make;
> export const deriveEta = ProgressCore.deriveEta;
> ```
>
> Prefer the explicit re-export block (it does not depend on a subpath export). Keep the `Progress` Tag + `layer` below it.

Final `Progress.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { Progress as ProgressCore } from '@dxos/progress';

// The registry primitives now live in @dxos/progress so the pipeline (this Effect service) and the
// app-toolkit ProgressRegistry capability share one implementation.
export type TaskStatus = ProgressCore.TaskStatus;
export type TaskProgress = ProgressCore.TaskProgress;
export type ProgressSnapshot = ProgressCore.ProgressSnapshot;
export type TaskHandle = ProgressCore.TaskHandle;
export type ProgressApi = ProgressCore.ProgressApi;
export const make = ProgressCore.make;
export const deriveEta = ProgressCore.deriveEta;

export class Progress extends Context.Tag('@dxos/pipeline/Progress')<Progress, ProgressCore.ProgressApi>() {
  /** A fresh in-memory registry. */
  static layer: Layer.Layer<Progress> = Layer.sync(Progress, () => ProgressCore.make());
}
```

- [ ] **Step 3: Delete the now-duplicated pipeline Progress test**

The core logic is now tested in `@dxos/progress`. Delete the pipeline copy so there is a single source of truth:

```bash
git rm packages/core/compute/pipeline/src/Progress.test.ts
```

- [ ] **Step 4: Run pipeline tests to verify delegation**

Run: `moon run pipeline:test`
Expected: PASS. `ProgressReporter` and `Stage.track` still compile and pass (they import `* as Progress from './Progress'`, which now re-exports the core plus the Tag).

- [ ] **Step 5: Build, format, commit**

```bash
npx oxfmt --write packages/core/compute/pipeline
moon run pipeline:build
git add packages/core/compute/pipeline
git commit -m "refactor(pipeline): consume @dxos/progress shared core"
```

Expected: build + tests green; commit created.

---

## Task 3: `ProgressRegistry` capability + factory + hooks (app-toolkit)

**Files:**
- Modify: `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts`
- Create: `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
- Test: `packages/sdk/app-toolkit/src/app-framework/progress-registry.test.ts`
- Create: `packages/sdk/app-toolkit/src/ui/hooks/useProgress.ts`
- Modify: `packages/sdk/app-toolkit/src/ui/hooks/index.ts`
- Modify: `packages/sdk/app-toolkit/package.json`
- Modify: `packages/sdk/app-toolkit/tsconfig.json`

**Interfaces:**
- Consumes: `Progress` from `@dxos/progress`; `Atom`, `Registry` from `@effect-atom/atom-react`; `Capability` from `@dxos/app-framework`.
- Produces:
  - `type ProgressMonitor = Progress.TaskHandle`
  - `type ProgressRegistry = { snapshotAtom: Atom.Atom<Progress.ProgressSnapshot>; monitorAtom: (name: string) => Atom.Atom<Progress.TaskProgress | undefined>; register: (name: string, options?: { label?: string; total?: number }) => ProgressMonitor; snapshot: () => Progress.ProgressSnapshot }`
  - `const AppCapabilities.ProgressRegistry` (capability tag, id `org.dxos.app-toolkit.capability.progressRegistry`)
  - `const createProgressRegistry: (registry: Registry.Registry) => ProgressRegistry`
  - `const useProgress: (name: string) => Progress.TaskProgress | undefined`
  - `const useProgressMonitors: () => readonly Progress.TaskProgress[]`

- [ ] **Step 1: Add the dependency**

Run: `pnpm add --filter "@dxos/app-toolkit" "@dxos/progress@workspace:*"`
Expected: `@dxos/progress: workspace:*` added to app-toolkit `dependencies`.

Add to `packages/sdk/app-toolkit/tsconfig.json` `references` (match the relative depth of existing `@dxos` references in that file, e.g. `../../core/compute/progress`):

```json
    {
      "path": "../../core/compute/progress"
    }
```

- [ ] **Step 2: Write the failing factory test**

Create `packages/sdk/app-toolkit/src/app-framework/progress-registry.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { createProgressRegistry } from './progress-registry';

describe('createProgressRegistry', () => {
  test('register surfaces a task in the snapshot atom', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);

    const monitor = progress.register('sync/a', { label: 'Mailbox A', total: 10 });
    let snapshot = registry.get(progress.snapshotAtom);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0].name).toBe('sync/a');
    expect(snapshot.tasks[0].label).toBe('Mailbox A');
    expect(snapshot.tasks[0].total).toBe(10);

    monitor.advance(3);
    snapshot = registry.get(progress.snapshotAtom);
    expect(snapshot.tasks[0].current).toBe(3);
  });

  test('monitorAtom isolates one task and is stable per name', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    progress.register('sync/a', { label: 'A' }).set(2);
    progress.register('sync/b', { label: 'B' }).set(5);

    const atomA = progress.monitorAtom('sync/a');
    expect(progress.monitorAtom('sync/a')).toBe(atomA); // memoized
    expect(registry.get(atomA)?.current).toBe(2);
    expect(registry.get(progress.monitorAtom('sync/b'))?.current).toBe(5);
  });

  test('remove drops the task from the snapshot', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const monitor = progress.register('sync/a', { label: 'A' });
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(1);
    monitor.remove();
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
    expect(registry.get(progress.monitorAtom('sync/a'))).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `moon run app-toolkit:test -- src/app-framework/progress-registry.test.ts`
Expected: FAIL — `createProgressRegistry` not found.

- [ ] **Step 4: Add the capability type to AppCapabilities.ts**

In `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts`, add an import near the other `@dxos` imports (top of file, after the existing `@dxos/*` imports):

```ts
import { Progress } from '@dxos/progress';
```

Then append this block at the end of the file (after the last capability):

```ts
/** A transient progress monitor handle — the update side of one registry entry. */
export type ProgressMonitor = Progress.TaskHandle;

/**
 * A registry of live progress providers, exposed as reactive atoms. Producers `register` a monitor
 * (keyed by a stable `name`, with a display `label`), advance/complete it, and `remove()` it when
 * done. Consumers read the aggregate `snapshotAtom` (e.g. the R0 rail popover) or a single provider's
 * `monitorAtom(name)` (e.g. an article's inline meter). Contributed by an always-loaded host
 * (`plugin-progress`); backed by the shared `@dxos/progress` core.
 */
export type ProgressRegistry = Readonly<{
  /** Aggregate snapshot of all active providers. */
  snapshotAtom: Atom.Atom<Progress.ProgressSnapshot>;
  /** One provider's reactive state, by name (stable/memoized per name). */
  monitorAtom: (name: string) => Atom.Atom<Progress.TaskProgress | undefined>;
  /** Register (or resume) a provider and mark it running. */
  register: (name: string, options?: { label?: string; total?: number }) => ProgressMonitor;
  /** Non-reactive read of the current snapshot. */
  snapshot: () => Progress.ProgressSnapshot;
}>;

/**
 * @category Capability
 */
export const ProgressRegistry = Capability$.make<ProgressRegistry>(
  'org.dxos.app-toolkit.capability.progressRegistry',
);
```

> `Atom` is already imported at the top of `AppCapabilities.ts` (`import { Atom } from '@effect-atom/atom-react'`).

- [ ] **Step 5: Implement the factory**

Create `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Progress } from '@dxos/progress';

import { type ProgressRegistry } from './AppCapabilities';

/**
 * Builds the {@link ProgressRegistry} capability value over an atom {@link Registry.Registry}. A
 * shared `@dxos/progress` core drives an in-memory snapshot; every mutation is mirrored into a
 * kept-alive writable atom (so a background producer can populate it before any surface subscribes),
 * and per-provider atoms are derived selectors memoized by name.
 */
export const createProgressRegistry = (registry: Registry.Registry): ProgressRegistry => {
  const core = Progress.make();
  const snapshotAtom = Atom.make<Progress.ProgressSnapshot>(core.snapshot()).pipe(Atom.keepAlive);
  core.subscribe((snapshot) => registry.set(snapshotAtom, snapshot));

  const monitorAtoms = new Map<string, Atom.Atom<Progress.TaskProgress | undefined>>();
  const monitorAtom = (name: string): Atom.Atom<Progress.TaskProgress | undefined> => {
    const existing = monitorAtoms.get(name);
    if (existing) {
      return existing;
    }
    const derived = Atom.map(snapshotAtom, (snapshot) => snapshot.tasks.find((task) => task.name === name));
    monitorAtoms.set(name, derived);
    return derived;
  };

  return {
    snapshotAtom,
    monitorAtom,
    register: (name, options) => core.task(name, options),
    snapshot: () => registry.get(snapshotAtom),
  };
};
```

- [ ] **Step 6: Run the factory test to verify it passes**

Run: `moon run app-toolkit:test -- src/app-framework/progress-registry.test.ts`
Expected: PASS.

- [ ] **Step 7: Add the hooks**

Create `packages/sdk/app-toolkit/src/ui/hooks/useProgress.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Progress } from '@dxos/progress';

import { AppCapabilities } from '../../app-framework';

/** All active progress providers (aggregate) — for the R0 rail popover / status UIs. */
export const useProgressMonitors = (): readonly Progress.TaskProgress[] => {
  const registry = useCapability(AppCapabilities.ProgressRegistry);
  return useAtomValue(registry.snapshotAtom).tasks;
};

/** One provider's live state, by name — for an inline meter. */
export const useProgress = (name: string): Progress.TaskProgress | undefined => {
  const registry = useCapability(AppCapabilities.ProgressRegistry);
  const atom = useMemo(() => registry.monitorAtom(name), [registry, name]);
  return useAtomValue(atom);
};
```

> Verify the `AppCapabilities` import path matches sibling hooks. `useLayout.ts` imports `AppCapabilities` from the package root barrel; if the relative path `../../app-framework` errors during build, change it to `import { AppCapabilities } from '@dxos/app-toolkit'` as `useLayout.ts` does. Prefer the same style as the sibling hooks in that directory.

Add to `packages/sdk/app-toolkit/src/ui/hooks/index.ts`:

```ts
export * from './useProgress';
```

- [ ] **Step 8: Build, format, commit**

```bash
npx oxfmt --write packages/sdk/app-toolkit
moon run app-toolkit:build
moon run app-toolkit:test -- src/app-framework/progress-registry.test.ts
git add packages/sdk/app-toolkit pnpm-lock.yaml
git commit -m "feat(app-toolkit): ProgressRegistry capability, factory, and hooks"
```

Expected: build + test green; commit created.

---

## Task 4: `ProgressMeter` component (app-toolkit/ui)

**Files:**
- Create: `packages/sdk/app-toolkit/src/ui/components/ProgressMeter.tsx`
- Create: `packages/sdk/app-toolkit/src/ui/components/ProgressMeter.stories.tsx`
- Modify: `packages/sdk/app-toolkit/src/ui/components/index.ts`

**Interfaces:**
- Consumes: `Progress` from `@dxos/progress`, `ThemedClassName`/`mx` from react-ui/theme, `useProgress` (stories only).
- Produces: `const ProgressMeter: (props: { state: Progress.TaskProgress } & ThemedClassName) => JSX.Element`, `const formatDuration: (ms: number) => string`.

- [ ] **Step 1: Create the component**

Create `packages/sdk/app-toolkit/src/ui/components/ProgressMeter.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Progress } from '@dxos/progress';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ProgressMeterProps = ThemedClassName<{
  state: Progress.TaskProgress;
}>;

/** Renders one progress provider's state as a labelled bar with count and ETA. */
export const ProgressMeter = ({ state, classNames }: ProgressMeterProps) => {
  const { current, total, label, name, status } = state;
  const indeterminate = total === undefined;
  const fraction = indeterminate ? 0 : total === 0 ? 1 : Math.min(1, current / total);
  const eta = Progress.deriveEta(state);

  return (
    <div role='group' className={mx('flex flex-col gap-1', classNames)}>
      <div className='flex justify-between gap-2 text-xs text-description'>
        <span className='truncate'>{label ?? name}</span>
        <span className='font-mono shrink-0'>{total !== undefined ? `${current} / ${total}` : `${current}`}</span>
      </div>
      <div
        role='progressbar'
        aria-valuenow={indeterminate ? undefined : current}
        aria-valuemax={total}
        className='relative h-1 rounded overflow-hidden bg-separator'
      >
        {indeterminate ? (
          <div className='absolute inset-y-0 w-1/3 rounded bg-accentSurface animate-pulse' />
        ) : (
          <div
            className={mx('absolute inset-y-0 start-0 rounded', status === 'error' ? 'bg-errorSurface' : 'bg-accentSurface')}
            style={{ width: `${fraction * 100}%` }}
          />
        )}
      </div>
      {status === 'error' && state.error ? (
        <div className='text-xs text-error-text truncate'>{state.error}</div>
      ) : (
        eta !== undefined &&
        status === 'running' && <div className='text-xs text-subdued'>{formatDuration(eta)} remaining</div>
      )}
    </div>
  );
};

ProgressMeter.displayName = 'ProgressMeter';

/** Compact human duration for an ETA (e.g. `12s`, `3m 05s`, `1h 02m`). */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1_000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3_600);
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};
```

> The color/token classes (`bg-separator`, `bg-accentSurface`, `bg-errorSurface`, `text-description`, `text-subdued`, `text-error-text`) follow Composer theme tokens. If any class does not resolve in the theme, consult the `composer-ui` skill and swap to the nearest existing token. Step 4 verifies this visually in Storybook.

- [ ] **Step 2: Export the component**

Add to `packages/sdk/app-toolkit/src/ui/components/index.ts`:

```ts
export * from './ProgressMeter';
```

- [ ] **Step 3: Add stories**

Create `packages/sdk/app-toolkit/src/ui/components/ProgressMeter.stories.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type Progress } from '@dxos/progress';
import { withTheme } from '@dxos/storybook-utils';

import { ProgressMeter } from './ProgressMeter';

const meta = {
  title: 'sdk/app-toolkit/ProgressMeter',
  component: ProgressMeter,
  decorators: [withTheme],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ProgressMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

const base = (overrides: Partial<Progress.TaskProgress>): Progress.TaskProgress => ({
  name: 'sync/mailbox',
  label: 'Syncing Inbox',
  current: 42,
  total: 120,
  status: 'running',
  startedAt: new Date(Date.now() - 8_000).toISOString(),
  updatedAt: new Date().toISOString(),
  elapsedMs: 8_000,
  ...overrides,
});

export const Determinate: Story = { args: { state: base({}), classNames: 'w-[240px]' } };

export const Indeterminate: Story = { args: { state: base({ total: undefined }), classNames: 'w-[240px]' } };

export const Error: Story = {
  args: { state: base({ status: 'error', error: 'Network unreachable' }), classNames: 'w-[240px]' },
};
```

> Confirm the storybook decorator import — match a sibling story in `packages/sdk/app-toolkit` (e.g. search for `withTheme` usage). If app-toolkit stories use a different decorator import, use that.

- [ ] **Step 4: Verify in Storybook**

The user runs Storybook on port 9009. Check it is up (do not start/kill the user's server):

Run: `curl -sSf http://localhost:9009 >/dev/null && echo up || echo down`

If up, open the `sdk/app-toolkit/ProgressMeter` stories and confirm the three variants render (bar fill ~35%, animated indeterminate bar, error state). If down, start a throwaway instance on another port:

Run: `moon run storybook-react:serve -- --port 9010` (background), then verify, then stop it.

Expected: all three variants render with resolvable theme colors. Fix any unresolved token per the note in Step 1.

- [ ] **Step 5: Format, build, commit**

```bash
npx oxfmt --write packages/sdk/app-toolkit
moon run app-toolkit:build
git add packages/sdk/app-toolkit
git commit -m "feat(app-toolkit): ProgressMeter component + stories"
```

Expected: build green; commit created.

---

## Task 5: `plugin-progress` package — scaffold + registry capability + register in app

**Files:**
- Create: `packages/plugins/plugin-progress/package.json`
- Create: `packages/plugins/plugin-progress/moon.yml`
- Create: `packages/plugins/plugin-progress/tsconfig.json`
- Create: `packages/plugins/plugin-progress/vitest.config.ts`
- Create: `packages/plugins/plugin-progress/dx.config.ts`
- Create: `packages/plugins/plugin-progress/README.md`
- Create: `packages/plugins/plugin-progress/src/meta.ts`
- Create: `packages/plugins/plugin-progress/src/index.ts`
- Create: `packages/plugins/plugin-progress/src/plugin.ts`
- Create: `packages/plugins/plugin-progress/src/ProgressPlugin.ts`
- Create: `packages/plugins/plugin-progress/src/translations.ts`
- Create: `packages/plugins/plugin-progress/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-progress/src/capabilities/progress-registry.ts`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`

**Interfaces:**
- Consumes: `createProgressRegistry`, `AppCapabilities.ProgressRegistry` from `@dxos/app-toolkit`; `Capabilities.AtomRegistry`, `Capability`, `Plugin`, `ActivationEvents` from `@dxos/app-framework`; `AppPlugin` from `@dxos/app-toolkit`.
- Produces: `const ProgressPlugin` (a `Plugin`), `meta` (with `profile.key === 'org.dxos.plugin.progress'`).

- [ ] **Step 1: Scaffold package config**

Create `packages/plugins/plugin-progress/package.json`:

```json
{
  "name": "@dxos/plugin-progress",
  "version": "0.10.0",
  "description": "Progress monitor plugin",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#capabilities": {
      "source": "./src/capabilities/index.ts",
      "types": "./dist/types/src/capabilities/index.d.ts",
      "default": "./dist/lib/neutral/capabilities/index.mjs"
    },
    "#components": {
      "source": "./src/components/index.ts",
      "types": "./dist/types/src/components/index.d.ts",
      "default": "./dist/lib/neutral/components/index.mjs"
    },
    "#meta": {
      "source": "./src/meta.ts",
      "types": "./dist/types/src/meta.d.ts",
      "default": "./dist/lib/neutral/meta.mjs"
    },
    "#plugin": {
      "source": "./src/ProgressPlugin.ts",
      "types": "./dist/types/src/ProgressPlugin.d.ts",
      "default": "./dist/lib/neutral/ProgressPlugin.mjs"
    },
    "#translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "default": "./dist/lib/neutral/translations.mjs"
    }
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./components": {
      "source": "./src/components/index.ts",
      "types": "./dist/types/src/components/index.d.ts",
      "default": "./dist/lib/neutral/components/index.mjs"
    },
    "./plugin": {
      "source": "./src/plugin.ts",
      "types": "./dist/types/src/plugin.d.ts",
      "default": "./dist/lib/neutral/plugin.mjs"
    },
    "./translations": {
      "source": "./src/translations.ts",
      "types": "./dist/types/src/translations.d.ts",
      "default": "./dist/lib/neutral/translations.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": [
    "dist",
    "dx.config.ts",
    "src"
  ],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/progress": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:",
    "react": "catalog:"
  },
  "devDependencies": {
    "@dxos/storybook-utils": "workspace:*",
    "@types/react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "effect": "catalog:",
    "react": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Create `packages/plugins/plugin-progress/moon.yml`:

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/ProgressPlugin.ts'
      - '--entryPoint=src/capabilities/index.ts'
      - '--entryPoint=src/components/index.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/plugin.ts'
      - '--entryPoint=src/translations.ts'
      - '--platform=neutral'
```

Create `packages/plugins/plugin-progress/tsconfig.json` (copy the `references` style from a sibling plugin such as `plugin-status-bar/tsconfig.json`, listing app-framework, app-toolkit, progress, react-ui, ui-theme, util):

```json
{
  "extends": "../../../../tsconfig.base.json",
  "include": [
    "src"
  ],
  "references": [
    { "path": "../../core/compute/progress" },
    { "path": "../../common/util" },
    { "path": "../../sdk/app-framework" },
    { "path": "../../sdk/app-toolkit" },
    { "path": "../../ui/react-ui" },
    { "path": "../../ui/ui-theme" }
  ]
}
```

> Verify each reference path resolves (compare to `plugin-status-bar/tsconfig.json`, which lists the exact relative paths for these packages). Fix any mismatched depth.

Create `packages/plugins/plugin-progress/vitest.config.ts` (copy `packages/plugins/plugin-status-bar/vitest.config.ts` verbatim, adjusting nothing but confirming the relative path to `vitest.base.config`).

Create `packages/plugins/plugin-progress/README.md`:

```markdown
# @dxos/plugin-progress

Always-on host for the progress-monitor capability. Contributes
`AppCapabilities.ProgressRegistry` and an R0 status-indicator popover listing
active progress providers.
```

Copy `LICENSE` from a sibling plugin.

- [ ] **Step 2: Create meta + config**

Create `packages/plugins/plugin-progress/dx.config.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.progress',
    name: 'Progress',
    author: 'DXOS',
    description: trim`
      Hosts the progress-monitor capability: a registry of live progress providers exposed as
      reactive atoms, plus an R0 status-indicator popover that lists all active providers.
    `,
  },
});
```

Create `packages/plugins/plugin-progress/src/meta.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);
```

- [ ] **Step 3: Create the registry capability module**

Create `packages/plugins/plugin-progress/src/capabilities/progress-registry.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, createProgressRegistry } from '@dxos/app-toolkit';

/**
 * Contributes the always-on {@link AppCapabilities.ProgressRegistry}. Built from the shared atom
 * registry so any plugin can register/subscribe to progress providers.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    return Capability.contributes(AppCapabilities.ProgressRegistry, createProgressRegistry(registry));
  }),
);
```

> Confirm `createProgressRegistry` is exported from the `@dxos/app-toolkit` root barrel. If it is not re-exported, add `export * from './progress-registry';` to `packages/sdk/app-toolkit/src/app-framework/index.ts` (Task 3 created the file but may not have exported it). Verify `app-framework/index.ts` re-exports `progress-registry`.

Create `packages/plugins/plugin-progress/src/capabilities/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export { default as ProgressRegistry } from './progress-registry';
export { default as ReactSurface } from './react-surface';
```

> `react-surface` is created in Task 6. To keep this task's build green, temporarily export only `ProgressRegistry` here and add `ReactSurface` in Task 6. Use this task-5 version:
>
> ```ts
> export { default as ProgressRegistry } from './progress-registry';
> ```

- [ ] **Step 4: Create translations, plugin, and barrels**

Create `packages/plugins/plugin-progress/src/translations.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/app-framework';

import { meta } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin name': 'Progress',
        'progress indicator label': 'Active progress',
        'no active progress label': 'No active tasks',
      },
    },
  },
];
```

> Confirm the `Resource` type import path — match `plugin-status-bar/src/translations.ts`. If translations there import from `@dxos/react-ui` or a different module, mirror that exactly.

Create `packages/plugins/plugin-progress/src/ProgressPlugin.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    activatesOn: ActivationEvents.Startup,
    activate: () => ProgressRegistry(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;
```

> Verify `Plugin.define` (no generic options needed here) and `AppPlugin.addTranslationsModule` match the signatures used in `DebugPlugin.tsx`. If `Plugin.define` requires an options type, use `Plugin.define(meta)` as debug does when there are no options, or `Plugin.define<Record<string, never>>(meta)`.

Create `packages/plugins/plugin-progress/src/plugin.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './ProgressPlugin';
```

Create `packages/plugins/plugin-progress/src/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './ProgressPlugin';
export { meta } from './meta';
```

- [ ] **Step 5: Install and build the plugin**

Run: `pnpm install`
Then: `moon run plugin-progress:build`
Expected: builds clean (only the registry capability + plugin wiring so far; no surface yet).

- [ ] **Step 6: Register the plugin in the composer app (always-on)**

In `packages/apps/composer-app/src/plugin-defs.tsx`:

1. Add the import alongside the other plugin imports (alphabetical by name, near `PaymentsPlugin`/`ObservabilityPlugin`):

```ts
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
```

2. Add `ProgressPlugin()` to the plugins array (the list around line 186+, alphabetical placement after `PaymentsPlugin()`):

```ts
    ProgressPlugin(),
```

3. Add its meta key to the always-enabled `core` key list (the block around line 125–135, with the other always-on plugin keys — NOT gated behind `isDev`/`isLabs`):

```ts
    ProgressPlugin.meta.profile.key,
```

4. Add the app dependency:

Run: `pnpm add --filter "@dxos/composer-app" "@dxos/plugin-progress@workspace:*"`

- [ ] **Step 7: Format, typecheck the app, commit**

```bash
npx oxfmt --write packages/plugins/plugin-progress packages/apps/composer-app/src/plugin-defs.tsx
moon run plugin-progress:build
moon run composer-app:build
git add packages/plugins/plugin-progress packages/apps/composer-app pnpm-lock.yaml
git commit -m "feat(plugin-progress): always-on ProgressRegistry host + app registration"
```

Expected: both builds green; commit created.

---

## Task 6: R0 status-indicator popover (plugin-progress)

**Files:**
- Create: `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx`
- Create: `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.stories.tsx`
- Create: `packages/plugins/plugin-progress/src/components/index.ts`
- Create: `packages/plugins/plugin-progress/src/capabilities/react-surface.tsx`
- Modify: `packages/plugins/plugin-progress/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-progress/src/ProgressPlugin.ts`

**Interfaces:**
- Consumes: `useProgressMonitors` + `ProgressMeter` + `AppSurface` from `@dxos/app-toolkit` / `@dxos/app-toolkit/ui`; `Popover`, `IconButton`, `Icon` from `@dxos/react-ui`; `Surface`, `Capabilities`, `Capability` from `@dxos/app-framework` / `/ui`.
- Produces: `const ProgressStatusIndicator` component; a `ReactSurface` capability module contributing an `AppSurface.StatusIndicator` surface.

- [ ] **Step 1: Create the indicator component**

Create `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ProgressMeter, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Icon, IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

/**
 * R0 rail status indicator: shows a badge with the active-provider count and, on click, a popover
 * listing every active provider as a {@link ProgressMeter}. Renders nothing when no provider is
 * active, so the rail stays clean when idle.
 */
export const ProgressStatusIndicator = () => {
  const { t } = useTranslation(meta.profile.key);
  const monitors = useProgressMonitors();
  const active = monitors.filter((monitor) => monitor.status === 'running' || monitor.status === 'pending');

  if (active.length === 0) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          variant='ghost'
          icon='ph--spinner-gap--regular'
          iconOnly
          label={t('progress indicator label')}
          classNames='w-(--dx-rail-item) animate-spin-slow'
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left'>
          <div className='flex flex-col gap-3 w-[260px] p-2'>
            {active.map((monitor) => (
              <ProgressMeter key={monitor.name} state={monitor} />
            ))}
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ProgressStatusIndicator.displayName = 'ProgressStatusIndicator';
```

> `animate-spin-slow` may not exist; if not, use `animate-spin` or drop the class. Verify the icon name `ph--spinner-gap--regular` exists (phosphor set is used across the repo, e.g. SyncStatus icons). Verify `--dx-rail-item` sizing against the sibling indicators rendered in `ComplementarySidebar.tsx` (they use `--dx-rail-item` in the container). Adjust to match neighbors in Step 4.

Create `packages/plugins/plugin-progress/src/components/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './ProgressStatusIndicator';
```

- [ ] **Step 2: Create the react-surface capability**

Create `packages/plugins/plugin-progress/src/capabilities/react-surface.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ProgressStatusIndicator } from '#components';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'progressStatusIndicator',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <ProgressStatusIndicator />,
      }),
    ]),
  ),
);
```

> Match the `Surface.create` / `Surface.makeFilter` / `AppSurface.StatusIndicator` usage to `plugin-debug/src/capabilities/react-surface.tsx` (Task context showed `id: 'debugStatus'` with `Surface.makeFilter(AppSurface.StatusIndicator)`).

- [ ] **Step 3: Wire the surface into the plugin**

Update `packages/plugins/plugin-progress/src/capabilities/index.ts` to add:

```ts
export { default as ReactSurface } from './react-surface';
```

Update `packages/plugins/plugin-progress/src/ProgressPlugin.ts` — add the surface module (import `ReactSurface` from `#capabilities`, add before `Plugin.make`):

```ts
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface(),
  }),
```

Resulting `ProgressPlugin.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    activatesOn: ActivationEvents.Startup,
    activate: () => ProgressRegistry(),
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;
```

- [ ] **Step 4: Add a story and verify visually**

Create `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.stories.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { Capabilities } from '@dxos/app-framework';
import { AppCapabilities, createProgressRegistry } from '@dxos/app-toolkit';
import { withTheme } from '@dxos/storybook-utils';

import { ProgressStatusIndicator } from './ProgressStatusIndicator';

// A standalone registry + capability provider so the indicator has data without the full app.
const registry = Registry.make();
const progress = createProgressRegistry(registry);
progress.register('sync/inbox', { label: 'Syncing Inbox', total: 120 }).set(42);
progress.register('sync/calendar', { label: 'Syncing Calendar' }).set(7);

const meta = {
  title: 'plugins/plugin-progress/ProgressStatusIndicator',
  component: ProgressStatusIndicator,
  decorators: [withTheme],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ProgressStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

> The story needs the `ProgressRegistry` capability and translations in context. If a lightweight capability provider decorator is not readily available, adapt this story to a sibling plugin's storybook decorator that provides capabilities (search `packages/plugins/*/src/**/*.stories.tsx` for `withPluginManager` or a capabilities decorator) and provide `AppCapabilities.ProgressRegistry = createProgressRegistry(registry)` and translations through it. If wiring a full capability context proves heavy, keep the story minimal by rendering `ProgressMeter` rows directly from `progress.snapshot().tasks` in a thin wrapper component instead — the goal is a visual check of the popover contents.

Verify in Storybook (reuse :9009 if up, else :9010 throwaway as in Task 4): the indicator shows a spinner button; clicking opens a left-side popover with two meters.

- [ ] **Step 5: Format, build, commit**

```bash
npx oxfmt --write packages/plugins/plugin-progress
moon run plugin-progress:build
git add packages/plugins/plugin-progress
git commit -m "feat(plugin-progress): R0 status-indicator popover of active providers"
```

Expected: build green; commit created.

- [ ] **Step 6: End-to-end app check (deferred to Task 8 verification)**

The rail button only appears while a provider is active; a full app check happens after inbox sync is wired (Task 8). No action here beyond the build.

---

## Task 7: Wire `runGmailSync` to a progress monitor (plugin-inbox)

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/operations/google/gmail/sync.ts`

**Interfaces:**
- Consumes: `AppCapabilities.ProgressRegistry` (via `Capability.getAll`, null-safe like the existing `StatsPanel` usage in this file), `Obj.getURI`.
- Produces: registers a monitor keyed by the mailbox URI, advances it per committed page, removes it at the end.

- [ ] **Step 1: Register the monitor after resolving the mailbox**

In `runGmailSync` (`sync.ts`), immediately after the existing block that resolves the `StatsPanel` compartments (around line 191, after `const statsCompartments = ...`), add:

```ts
    // Live progress monitor (optional — no host in headless/test runs, so `getAll` yields nothing).
    // Keyed by the mailbox URI so `MailboxArticle` and the R0 popover can subscribe to this run.
    const mailboxUri = Obj.getURI(mailbox).toString();
    const progressMonitors = (yield* Capability.getAll(AppCapabilities.ProgressRegistry)).map((registry) =>
      registry.register(mailboxUri, { label: mailbox.name ?? 'Mailbox' }),
    );
    const advanceProgress = (by: number) => progressMonitors.forEach((monitor) => monitor.advance(by));
```

- [ ] **Step 2: Advance the monitor as pages commit**

In the `collectStats` stage's `Effect.sync` (which runs `processed += 1` per mapped message), add a progress advance next to `publishStats()`:

Find:

```ts
        attachmentCount += mapped.attachments?.length ?? 0;
        publishStats();
        return mapped;
```

Replace with:

```ts
        attachmentCount += mapped.attachments?.length ?? 0;
        publishStats();
        advanceProgress(1);
        return mapped;
```

- [ ] **Step 3: Complete and remove the monitor at the end of the run**

After the final `publishStats();` and before `log('gmail sync complete', ...)` (near line 304), add:

```ts
    progressMonitors.forEach((monitor) => {
      monitor.done();
      monitor.remove();
    });
```

And in the operation handler's error path: the pipeline `runGmailSync` is wrapped in `Effect.withSpan('gmail-sync')`. Wrap the monitor lifecycle so a failure still removes it. Change the two-line completion above to run in an `Effect.ensuring` finalizer instead — replace the just-added block with a finalizer registered right after the monitors are created (Step 1). Add after `advanceProgress` definition in Step 1:

```ts
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => progressMonitors.forEach((monitor) => monitor.remove())),
    );
```

And keep a `done()` on the success path (before `log('gmail sync complete', ...)`):

```ts
    progressMonitors.forEach((monitor) => monitor.done());
```

> `Effect.addFinalizer` requires a `Scope` in the effect's context. `runGmailSync` returns `Effect.Effect<..., ..., GoogleMailApi | Database.Service | Resolver | Capability.Service | Operation.Service>` — it has no `Scope`. Rather than widen the signature, use `Effect.ensuring` around the pipeline run instead of `addFinalizer`. Concretely: do NOT add `addFinalizer`; instead wrap the whole `Effect.gen` body's tail. The simplest correct form given this file's structure: keep the success-path `done()` + `remove()` from the earlier version, and additionally attach `.pipe(Effect.tapError(() => Effect.sync(() => progressMonitors.forEach((m) => m.remove()))))` to the final returned effect. Implement it as:

Remove the `addFinalizer` idea. Use this final shape:
- Step 1 adds only the `progressMonitors` + `advanceProgress` (no finalizer).
- Step 3 (success path, before the final `log`):

```ts
    progressMonitors.forEach((monitor) => {
      monitor.done();
      monitor.remove();
    });
```

- Wrap the outer pipe (the existing `.pipe(Effect.withSpan('gmail-sync'))` at the end of `runGmailSync`) to also clear monitors on error:

Find:

```ts
  }).pipe(Effect.withSpan('gmail-sync'));
```

Replace with:

```ts
  }).pipe(
    Effect.tapError(() =>
      Effect.sync(() => progressMonitors.forEach((monitor) => monitor.fail('sync failed'))),
    ),
    Effect.withSpan('gmail-sync'),
  );
```

> `progressMonitors` is declared inside the `Effect.gen` body, so it is not in scope at the outer `.pipe`. Therefore the error handling must live INSIDE the `Effect.gen`. Use `Effect.gen`-internal handling: leave the outer pipe as `.pipe(Effect.withSpan('gmail-sync'))` unchanged, and instead guarantee removal by placing the success `done()`+`remove()` on the happy path AND relying on the monitor being transient. For the error case, wrap only the streaming section. The minimal, in-scope correct approach:

Wrap the `yield* gmailSource(...)...` streaming pipeline (the big `yield*` around lines 254–293) with error handling that fails the monitor, using `Effect.tapError`:

Find the start:

```ts
    yield* gmailSource({
```

Wrap the whole `yield* gmailSource(...).pipe(...)` expression by assigning it and tapping its error. Change `yield* gmailSource({ ... }).pipe( ... );` to:

```ts
    yield* gmailSource({
      userId,
      label,
      direction: resolvedDirection,
      start,
      end: rangeEnd,
      searchFilter: targetOptions.filter,
    }).pipe(
      // ... existing stages unchanged ...
      Effect.tapError((error) =>
        Effect.sync(() => progressMonitors.forEach((monitor) => monitor.fail(String(error)))),
      ),
    );
```

Add `Effect.tapError(...)` as the LAST entry in the existing `.pipe(...)` chain (after the `Effect.provide(SyncBinding.layer(...))` call). This keeps `progressMonitors` in scope. Then the success-path `done()` + `remove()` (added before the final `log`) runs only when the stream completes without error; on error the monitor is marked failed and left visible (per the spec's error handling). A separate always-remove is unnecessary — a failed transient monitor is intentionally retained until the next successful run replaces it or the surface unmounts.

- [ ] **Step 4: Verify the sync test still passes and asserts progress**

Find the existing sync test:

Run: `ls packages/plugins/plugin-inbox/src/operations/google/gmail/*.test.ts` (and search `grep -rl runGmailSync packages/plugins/plugin-inbox/src --include=*.test.ts`).

Add a test (or extend the existing sync test) that provides a `ProgressRegistry` and asserts a monitor is registered, advances, and completes. Because `runGmailSync` reads the registry via `Capability.getAll`, provide it through the same capability layer the test already uses for `Capability.Service`. Add this assertion pattern to the existing sync test file (adapt names to the file's existing harness):

```ts
// Within the existing sync test's Effect program, before running the sync:
const registry = Registry.make();
const progress = createProgressRegistry(registry);
// Provide AppCapabilities.ProgressRegistry = progress through the test's Capability layer,
// alongside the existing GoogleMailApi mock + Database + Resolver layers.
// After the sync completes:
// A transient monitor is removed on success, so assert via a subscription spy instead:
```

> Because the monitor is removed on success, assert against a subscription spy rather than the final snapshot. Add before running the sync:
>
> ```ts
> const seen: number[] = [];
> progress.snapshotAtom; // ensure created
> const unsub = registry.subscribe(progress.snapshotAtom, () => {
>   const task = registry.get(progress.snapshotAtom).tasks[0];
>   if (task) seen.push(task.current);
> });
> ```
>
> After the sync: `expect(Math.max(0, ...seen)).toBeGreaterThan(0)` (progress advanced at least once). Then `unsub()`.
>
> If wiring the capability into the existing test harness is non-trivial, instead add a focused unit test that calls `createProgressRegistry` + drives `advanceProgress` semantics directly is NOT sufficient (that is Task 3). The value here is the integration: the operation registers/advances. If the harness cannot easily inject the capability, document that in the commit message and cover it via the app-level check in Task 8 instead of a unit test — do not fake a passing assertion.

Run: `moon run plugin-inbox:test -- src/operations/google/gmail/<sync-test-file>.test.ts`
Expected: existing assertions still pass; the new progress assertion passes (or is deferred to Task 8 with a noted reason).

- [ ] **Step 5: Format, build, commit**

```bash
npx oxfmt --write packages/plugins/plugin-inbox
moon run plugin-inbox:build
git add packages/plugins/plugin-inbox
git commit -m "feat(inbox): provide a sync progress monitor from runGmailSync"
```

Expected: build + tests green; commit created.

---

## Task 8: Show the meter in `MailboxArticle` (plugin-inbox) + end-to-end check

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`

**Interfaces:**
- Consumes: `useProgress` from `@dxos/app-toolkit/ui`, `ProgressMeter` from `@dxos/app-toolkit/ui`, `Obj.getURI`.
- Produces: an inline meter rendered while the mailbox's monitor is active.

- [ ] **Step 1: Import the hook and component**

In `MailboxArticle.tsx`, add to the `@dxos/app-toolkit/ui` import (which already imports `useShowItem` and `AppSurface`):

```ts
import { type AppSurface, ProgressMeter, useProgress, useShowItem } from '@dxos/app-toolkit/ui';
```

> Preserve the existing `type AppSurface` import; merge the new names into the same statement.

- [ ] **Step 2: Subscribe to the mailbox's monitor**

Inside the `MailboxArticle` component, after `const id = attendableId ?? Obj.getURI(mailbox);`, add:

```ts
  // The sync operation registers a monitor keyed by the mailbox URI (see runGmailSync); subscribe so
  // the meter appears live during a sync and disappears when it completes (the monitor is removed).
  const mailboxUri = Obj.getURI(mailbox).toString();
  const progress = useProgress(mailboxUri);
```

- [ ] **Step 3: Render the meter in the panel statusbar**

Per the user's preferred placement, render the meter in a `Panel.Statusbar` at the bottom of the panel (NOT under the toolbar). The user has already sketched this region with a mock `state`; replace the mock with the real hook value and guard on an active monitor. Find the `<Panel.Statusbar>` block (currently holding a literal `state={{ … }}` mock) just before `</Panel.Root>` and replace it with:

```tsx
      {progress && (progress.status === 'running' || progress.status === 'error') && (
        <Panel.Statusbar>
          <ProgressMeter state={progress} classNames='is-full p-2 border-bs border-separator' />
        </Panel.Statusbar>
      )}
```

> Coordinate with the user before editing this file — they may be actively iterating on its visuals. Confirm the border/spacing tokens resolve in the theme (`border-separator` is valid per Task 4; `border-bs` is the block-start logical border — verify against `@dxos/react-ui`/Tailwind logical-border utilities and adjust if needed). Keep the `Obj.getURI(mailbox).toString()` key identical to the one `runGmailSync` registers (Task 7).

- [ ] **Step 4: Build**

Run: `moon run plugin-inbox:build`
Expected: builds clean.

- [ ] **Step 5: End-to-end verification in the running app**

This is the integration proof: a Gmail sync shows an inline meter in `MailboxArticle` and the R0 popover.

1. Follow `REPOSITORY_GUIDE.md` to launch Composer (the composer-app dev server). Use the preview tooling if available; do not kill the user's servers.
2. Open a Mailbox with a configured Gmail binding and trigger a sync (the same action used today to sync mail).
3. Confirm during the sync:
   - The R0 rail (right icon rail) shows the spinning progress button; clicking it opens a left-side popover with a `Syncing <mailbox>` meter counting up.
   - `MailboxArticle` shows the inline meter bar under the toolbar, advancing as messages commit.
   - When the sync completes, both the inline meter and the rail button disappear (monitor removed).
4. Capture a screenshot of the popover + inline meter for the PR (preview screenshot tool).

Fix any unresolved theme tokens (from Tasks 4/6/8 notes) discovered here by consulting the `composer-ui` skill and swapping to existing tokens; rebuild and re-verify.

- [ ] **Step 6: Format, commit**

```bash
npx oxfmt --write packages/plugins/plugin-inbox
git add packages/plugins/plugin-inbox
git commit -m "feat(inbox): show sync progress meter in MailboxArticle"
```

Expected: commit created.

- [ ] **Step 7: Full-workspace sanity (lint + affected tests)**

```bash
moon run :lint -- --fix
moon run progress:test
moon run pipeline:test
moon run app-toolkit:test
moon run plugin-progress:test
moon run plugin-inbox:test
```

Expected: lint clean; all listed test suites pass. Address any failures before opening a PR (use the `submit-pr` skill).

---

## Self-Review

**Spec coverage:**
- Capability that lets plugins provide + subscribe → Task 3 (`ProgressRegistry`, hooks). ✓
- Registry of providers exposing an atom → Task 3 (`snapshotAtom`, `monitorAtom`). ✓
- current/total/elapsed/estimate + display name → Task 1 (`TaskProgress` fields + `deriveEta`), `label` = display name. ✓
- Always available (not devtools-only) → Task 5 (`plugin-progress`, registered in `core` keys). ✓
- Dynamic per-task registration → Task 1 `task()`/`remove()`, Task 3 `register()`. ✓
- Reconcile with `@dxos/pipeline` (shared core) → Tasks 1–2. ✓
- Producer-supplied ETA, linear fallback → Task 1 `estimate()` + `deriveEta`. ✓
- MailboxArticle meter → Task 8. ✓
- R0 popover of all active providers → Task 6. ✓
- Testing (progress unit, pipeline green, registry, inbox, UI stories) → Tasks 1,2,3,4,6,7. ✓
- YAGNI holdouts (no persistence/history/cancellation) → honored (none added). ✓

**Placeholder scan:** No `TBD`/`TODO`/"implement later". The exploratory `>` notes give concrete fallbacks (explicit re-export block, token/decorator verification, capability import path) — each names the exact alternative to use, not a deferral.

**Type consistency:** `TaskProgress`/`TaskHandle`/`ProgressApi`/`make`/`deriveEta` (Task 1) are consumed unchanged by pipeline (Task 2) and app-toolkit (Task 3, aliased as `ProgressMonitor`/reused as `Progress.TaskProgress`). `createProgressRegistry(registry)` (Task 3) is called identically in Task 5 and stories (Tasks 6). `register(name, { label, total })` and `monitorAtom(name)` names match across Tasks 3/5/6/7. Monitor key = mailbox URI string in both Task 7 (register) and Task 8 (`useProgress`). ✓

**Known risk flagged for the implementer:** Task 7's error-path handling has a scoping constraint (`progressMonitors` is declared inside `Effect.gen`); the task resolves this by placing `Effect.tapError` as the last stage of the in-scope `.pipe(...)` chain rather than the outer pipe. Follow that final form.
