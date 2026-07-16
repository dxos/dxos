# compute-runtime / edge-compute Split + Remote/Edge Monitors & Invocation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `@dxos/compute-runtime` + `@dxos/functions` + `@dxos/functions-runtime` into two packages — `@dxos/compute-runtime` (local runtime + `Remote*` interface tags) and `@dxos/edge-compute` (EDGE-specific code: scripts, functions, deploy, and the `Edge*` implementations of the `Remote*` tags) — and give process/trigger monitors and operation invocation a uniform local+remote aggregation model.

**Architecture:** Every cross-runtime concern is split into an **interface** (`Remote<Thing>`, a namespace module exporting a `Context.Tag` named `Service`, living in `@dxos/compute-runtime`) and an **implementation** (`Edge<Thing>`, a namespace module exporting a `layer`, living in `@dxos/edge-compute`). Monitors (`Process.ProcessMonitorService`, `Trigger.TriggerMonitorService`, tags already in `@dxos/compute`) get **aggregate layers in `@dxos/compute-runtime`** that merge the local runtime with the `Remote*` tag; `@dxos/compute-runtime` also ships `layerNoop` for each `Remote*` tag so local-only apps work without `@dxos/edge-compute`. `EdgeOperationInvoker` supersedes `RemoteFunctionExecutionService`.

**Tech Stack:** TypeScript, Effect (`Context`/`Layer`/`Effect`), `@effect-atom/atom`, `@dxos/echo`, `@dxos/edge-client`, `moon` build/test, `vitest`.

## Global Constraints

- **Namespace-module conventions** (`docs/style/namespace-modules.md`) apply to every new module: PascalCase filename == namespace name; first body line `// @import-as-namespace`; re-export from `index.ts` as `export * as <Name> from './<Name>'`; **members are unprefixed** (inside `RemoteProcessManager.ts` export `Service`/`Manager`, not `RemoteProcessManagerService`); `errors.ts` and `testing/` are exported directly (exception).
- **Interface = `Remote*`, implementation = `Edge*`.** `Remote*` modules live in `@dxos/compute-runtime` and export a `Context.Tag` named `Service` (+ the service `interface`). `Edge*` modules live in `@dxos/edge-compute` and export a `layer` (+ constructors) that provide the matching `Remote*.Service`.
- **New package is private.** `@dxos/edge-compute/package.json` MUST set `"private": true`.
- **Workspace deps use `workspace:*`**; `peerDependencies` use `workspace:^`. Add deps via `pnpm add --filter "@dxos/edge-compute" --save-catalog "<pkg>"` (external) or `--save-workspace` semantics for `@dxos` (edit to `workspace:*`).
- **No compat shims / re-exports when moving code.** Every call site is updated to the new import in the same task (CLAUDE.md non-negotiable).
- **No casts to silence the type-checker** (`as any`, `as unknown as T`, `!`). Fix types at the source.
- **`@dxos/compute-runtime` must not import `@dxos/edge-client` or `@dxos/client`.** If a file being moved into it imports either, it belongs in `@dxos/edge-compute` instead — this is the litmus test for placement.
- **Test after every task:** `moon run <pkg>:build` and, where the task touches logic, `moon run <pkg>:test`. Full sweep before the final task: `moon exec --on-failure continue --quiet :build`.
- **Commit messages:** `scope: description` (scope `compute-runtime`, `edge-compute`, or the touched package).
- Ignore the `Auth token DEPOT_TOKEN does not exist` remote-cache warning.

---

## Package End-State

### `@dxos/compute-runtime` (local runtime + `Remote*` interfaces)

Existing (unchanged): `ProcessManager.ts`, `ProcessHandle.ts`, `ProcessOperationInvoker.ts`, `process-manager-service.ts`, `process-store.ts`, `process-trace.ts`, `trace-buffer.ts`, `LayerStack.ts`, `process-id.ts`, `storage-service-layer.ts`, `errors.ts`, `testing/`.

Moved in from `@dxos/functions` (local, no client/edge): `sdk.ts`, `services/local-function-execution.ts`, `services/function-invocation-service.ts` (router), `services/service-container.ts`, `services/service-registry.ts`, `services/credentials.ts`, `services/tracing.ts`, `types/url.ts`, `protocol/protocol.ts`.

Moved in from `@dxos/functions-runtime` (local): `triggers/*` except aggregate monitor (`trigger-dispatcher.ts`, `trigger-state-store.ts`, `feed-position.ts`, `input-builder.ts`, `jsonata` helpers), `executor/executor.ts`, `FeedTraceSink.ts`, `object-template.ts`, `trace.ts`, `translations.ts`, `url.ts`, `process/*` (`Service.ts`, `StorageService.ts`), `agent-service/*` (see Decision D1).

New namespace modules:
- `RemoteOperationInvoker.ts` — tag `Service` (supersedes `RemoteFunctionExecutionService`).
- `RemoteProcessManager.ts` — tag `Service` + `layerNoop`.
- `RemoteTriggerManager.ts` — tag `Service` + `layerNoop`.
- `ProcessMonitor.ts` — aggregate `layer` providing `Process.ProcessMonitorService`.
- `TriggerMonitor.ts` — aggregate `layer` providing `Trigger.TriggerMonitorService` (generalized from the current `trigger-monitor.ts`).

### `@dxos/edge-compute` (EDGE code + `Edge*` implementations)

Moved in from `@dxos/functions-runtime`: `edge/functions.ts` (`createEdgeClient`), `edge/functions-service-client.ts` (`FunctionsServiceClient`: deploy/invoke), `bundler/*`, `native/*`, deploy scripts (`scripts/build-modules.mjs`, `scripts/upload-modules.mjs`, `scripts/secrets.mjs`) + the `publish-runtime` npm script.

Moved in from `@dxos/functions`: `protocol/functions-ai-http-client.ts` (talks to EDGE AI).

New namespace modules (impls providing `Remote*.Service`):
- `EdgeOperationInvoker.ts` — `layer`/`fromClient` providing `RemoteOperationInvoker.Service`.
- `EdgeProcessManager.ts` — `layer`/`fromClient` providing `RemoteProcessManager.Service`.
- `EdgeTriggerManager.ts` — `layer`/`fromClient` providing `RemoteTriggerManager.Service`.

Deps: `@dxos/compute-runtime`, `@dxos/compute`, `@dxos/edge-client`, `@dxos/client`, `@dxos/functions-runtime-cloudflare`, `@dxos/echo`, `@dxos/effect`, `@dxos/keys`, `@dxos/log`, `@dxos/context`, `@effect-atom/atom`, `effect`.

### Unchanged

`@dxos/functions-runtime-cloudflare` stays (deploy target, wrapped by `@dxos/edge-compute`). `@dxos/compute` (tags/schemas) stays; only new/edited members are the monitor tags it already owns.

## Decisions to confirm before Phase 3

- **D1 — `agent-service/` home.** It runs agent processes locally (`Process.make`) but imports `@dxos/assistant`. **Default: move to `@dxos/compute-runtime`** and add `@dxos/assistant` as a **peerDependency** (`workspace:^`), matching how `@dxos/functions-runtime` peers it today. Alternative: a third small package. Pick before Task 3.4.
- **D2 — router rename.** The local-vs-remote router `FunctionInvocationService` is kept as-is in `@dxos/compute-runtime`, only swapping its remote dependency from `RemoteFunctionExecutionService` → `RemoteOperationInvoker.Service`. A full rename to `OperationInvocationRouter` is out of scope.
- **D3 — EDGE process-tree endpoint.** `EdgeTriggerManager` has an endpoint today (`EdgeHttpClient.getTriggersDispatcherStatus`). `EdgeProcessManager` has **no** process-tree endpoint yet; ship it returning an empty tree (identical to `layerNoop`) with a `TODO(edge)` until the endpoint lands. Confirm this is acceptable.

---

## Phase 1 — `Remote*` interface tags in `@dxos/compute-runtime`

No moves yet; purely additive. Enables downstream code to target interfaces.

### Task 1.1: `RemoteOperationInvoker` interface

**Files:**
- Create: `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.ts`
- Modify: `packages/core/compute/compute-runtime/src/index.ts`
- Test: `packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts`

**Interfaces:**
- Produces: namespace `RemoteOperationInvoker` with `interface Invoker { invoke<I, O>(ctx: DxosContext, deployedId: string, input: I): Effect.Effect<O> }` and `class Service extends Context.Tag('@dxos/compute-runtime/RemoteOperationInvoker')<Service, Invoker>`. Also `layerNoop: Layer.Layer<Service>` that dies on invoke (no remote configured).

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';

import { Context as DxosContext } from '@dxos/context';

import * as RemoteOperationInvoker from './RemoteOperationInvoker';

describe('RemoteOperationInvoker', () => {
  test('resolves the Service tag from a provided layer', async ({ expect }) => {
    const stub: RemoteOperationInvoker.Invoker = {
      invoke: <I, O>(_ctx: DxosContext, _deployedId: string, input: I) => Effect.succeed(input as unknown as O),
    };
    const program = Effect.gen(function* () {
      const invoker = yield* RemoteOperationInvoker.Service;
      return yield* invoker.invoke(DxosContext.default(), 'fn-1', { value: 42 });
    });
    const result = await Effect.runPromise(
      program.pipe(Effect.provideService(RemoteOperationInvoker.Service, stub)),
    );
    expect(result).toEqual({ value: 42 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run compute-runtime:test -- src/RemoteOperationInvoker.test.ts`
Expected: FAIL — module `./RemoteOperationInvoker` not found.

- [ ] **Step 3: Write the module**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { Context as DxosContext } from '@dxos/context';

/**
 * Invokes operations deployed to a remote runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeOperationInvoker` in
 * `@dxos/edge-compute`. Supersedes the former `RemoteFunctionExecutionService`.
 */
export interface Invoker {
  /**
   * Invoke a deployed operation by its deployment id.
   */
  invoke<I, O>(ctx: DxosContext, deployedId: string, input: I): Effect.Effect<O>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteOperationInvoker')<Service, Invoker>() {}

/**
 * No-op remote invoker for local-only deployments. Dies if a remote
 * invocation is attempted, since no remote runtime is configured.
 */
export const layerNoop: Layer.Layer<Service> = Layer.succeed(Service, {
  invoke: () => Effect.die(new Error('No remote operation invoker configured')),
});
```

- [ ] **Step 4: Barrel export**

In `packages/core/compute/compute-runtime/src/index.ts` add (keep alphabetical within the group):

```ts
export * as RemoteOperationInvoker from './RemoteOperationInvoker';
```

- [ ] **Step 5: Run test + build**

Run: `moon run compute-runtime:test -- src/RemoteOperationInvoker.test.ts` → PASS
Run: `moon run compute-runtime:build` → success

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/compute-runtime/src/RemoteOperationInvoker.ts packages/core/compute/compute-runtime/src/RemoteOperationInvoker.test.ts packages/core/compute/compute-runtime/src/index.ts
git commit -m "compute-runtime: add RemoteOperationInvoker interface"
```

### Task 1.2: `RemoteProcessManager` interface

**Files:**
- Create: `packages/core/compute/compute-runtime/src/RemoteProcessManager.ts`
- Modify: `packages/core/compute/compute-runtime/src/index.ts`
- Test: `packages/core/compute/compute-runtime/src/RemoteProcessManager.test.ts`

**Interfaces:**
- Consumes: `Process.Info` from `@dxos/compute`; `Atom` from `@effect-atom/atom`.
- Produces: namespace `RemoteProcessManager` with `interface Manager { readonly processTree: Effect.Effect<readonly Process.Info[]>; readonly processTreeAtom: Atom.Atom<readonly Process.Info[]> }`, `class Service extends Context.Tag('@dxos/compute-runtime/RemoteProcessManager')<Service, Manager>`, and `layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry>` backed by an empty atom.

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as RemoteProcessManager from './RemoteProcessManager';

describe('RemoteProcessManager', () => {
  test('layerNoop yields an empty process tree', async ({ expect }) => {
    const program = Effect.gen(function* () {
      const manager = yield* RemoteProcessManager.Service;
      return yield* manager.processTree;
    });
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(RemoteProcessManager.layerNoop),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, Registry.make())),
      ),
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run compute-runtime:test -- src/RemoteProcessManager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Process } from '@dxos/compute';

/**
 * Read-only view of processes running on a remote runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeProcessManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly processTree: Effect.Effect<readonly Process.Info[]>;
  readonly processTreeAtom: Atom.Atom<readonly Process.Info[]>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteProcessManager')<Service, Manager>() {}

/**
 * Empty remote manager for local-only deployments.
 */
export const layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
    registry.mount(processTreeAtom);
    return {
      processTree: Effect.sync(() => registry.get(processTreeAtom)),
      processTreeAtom,
    } satisfies Manager;
  }),
);
```

- [ ] **Step 4: Barrel export**

```ts
export * as RemoteProcessManager from './RemoteProcessManager';
```

- [ ] **Step 5: Run test + build**

Run: `moon run compute-runtime:test -- src/RemoteProcessManager.test.ts` → PASS
Run: `moon run compute-runtime:build` → success

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/compute-runtime/src/RemoteProcessManager.ts packages/core/compute/compute-runtime/src/RemoteProcessManager.test.ts packages/core/compute/compute-runtime/src/index.ts
git commit -m "compute-runtime: add RemoteProcessManager interface"
```

### Task 1.3: `RemoteTriggerManager` interface

**Files:**
- Create: `packages/core/compute/compute-runtime/src/RemoteTriggerManager.ts`
- Modify: `packages/core/compute/compute-runtime/src/index.ts`
- Test: `packages/core/compute/compute-runtime/src/RemoteTriggerManager.test.ts`

**Interfaces:**
- Consumes: `Trigger.State`, `Trigger.InvokeOptions` from `@dxos/compute`; `Atom` from `@effect-atom/atom`.
- Produces: namespace `RemoteTriggerManager` with `interface Manager { readonly triggers: Atom.Atom<readonly Trigger.State[]>; readonly invokeTrigger: (options: Trigger.InvokeOptions) => Effect.Effect<void> }`, `class Service extends Context.Tag('@dxos/compute-runtime/RemoteTriggerManager')<Service, Manager>`, and `layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry>`.

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as RemoteTriggerManager from './RemoteTriggerManager';

describe('RemoteTriggerManager', () => {
  test('layerNoop yields no triggers', async ({ expect }) => {
    const registry = Registry.make();
    const program = Effect.gen(function* () {
      const manager = yield* RemoteTriggerManager.Service;
      return registry.get(manager.triggers);
    });
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(RemoteTriggerManager.layerNoop),
        Effect.provide(Layer.succeed(Registry.AtomRegistry, registry)),
      ),
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run compute-runtime:test -- src/RemoteTriggerManager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trigger } from '@dxos/compute';

/**
 * Read-only view + invocation surface for triggers registered on a remote
 * runtime (EDGE).
 *
 * Interface only: the EDGE implementation is `EdgeTriggerManager` in
 * `@dxos/edge-compute`.
 */
export interface Manager {
  readonly triggers: Atom.Atom<readonly Trigger.State[]>;
  readonly invokeTrigger: (options: Trigger.InvokeOptions) => Effect.Effect<void>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteTriggerManager')<Service, Manager>() {}

/**
 * Empty remote trigger manager for local-only deployments.
 */
export const layerNoop: Layer.Layer<Service, never, Registry.AtomRegistry> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const triggers = Atom.make<readonly Trigger.State[]>([]);
    registry.mount(triggers);
    return {
      triggers,
      invokeTrigger: () => Effect.die(new Error('No remote trigger manager configured')),
    } satisfies Manager;
  }),
);
```

- [ ] **Step 4: Barrel export**

```ts
export * as RemoteTriggerManager from './RemoteTriggerManager';
```

- [ ] **Step 5: Run test + build**

Run: `moon run compute-runtime:test -- src/RemoteTriggerManager.test.ts` → PASS
Run: `moon run compute-runtime:build` → success

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/compute-runtime/src/RemoteTriggerManager.ts packages/core/compute/compute-runtime/src/RemoteTriggerManager.test.ts packages/core/compute/compute-runtime/src/index.ts
git commit -m "compute-runtime: add RemoteTriggerManager interface"
```

---

## Phase 2 — Local runtime consolidation into `@dxos/compute-runtime`

Move the non-edge halves of `@dxos/functions` and `@dxos/functions-runtime` into `@dxos/compute-runtime`, updating all imports. Nothing edge-touching moves here (that is Phase 3). Because CLAUDE.md forbids shims, each task updates the old package's barrel and all consumers in the same commit.

> **Placement litmus test (apply to every file moved in Phase 2):** if the file imports `@dxos/edge-client` or `@dxos/client`, STOP — it belongs in `@dxos/edge-compute` (Phase 3), not here.

### Task 2.1: Add local-runtime deps to `@dxos/compute-runtime`

**Files:**
- Modify: `packages/core/compute/compute-runtime/package.json`

- [ ] **Step 1: Add workspace deps** needed by the incoming local code (not already present): `@dxos/ai`, `@dxos/async`, `@dxos/context`, `@dxos/debug`, `@dxos/echo-client`, `@dxos/protocols`, `@dxos/schema`, `@dxos/util`, `@dxos/link`, `@dxos/node-std`, `@effect/platform`. Edit `package.json` dependencies to `workspace:*` for each `@dxos` entry; add `@effect/platform: "catalog:"`. Per Decision D1, add `"@dxos/assistant": "workspace:^"` under `peerDependencies`.

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 3: Build (still green — nothing consumes new deps yet)**

Run: `moon run compute-runtime:build` → success

- [ ] **Step 4: Commit**

```bash
git add packages/core/compute/compute-runtime/package.json pnpm-lock.yaml
git commit -m "compute-runtime: add deps for local runtime consolidation"
```

### Task 2.2: Move `@dxos/functions` local modules into `@dxos/compute-runtime`

**Files:**
- Move (git mv) into `packages/core/compute/compute-runtime/src/`:
  - `functions/src/sdk.ts`
  - `functions/src/services/{local-function-execution.ts,function-invocation-service.ts,service-container.ts,service-registry.ts,credentials.ts,tracing.ts}` → `compute-runtime/src/services/`
  - `functions/src/types/url.ts` → `compute-runtime/src/functions-url.ts` (avoid clashing with the incoming `functions-runtime/src/url.ts`; see Task 2.3)
  - `functions/src/protocol/protocol.ts` → `compute-runtime/src/protocol.ts`
- Modify: `compute-runtime/src/index.ts` (add exports for moved surfaces, matching prior `@dxos/functions` barrel names).
- Delete after move: emptied `@dxos/functions` directories.
- Modify: every consumer importing the moved symbols from `@dxos/functions` (see command below).

**Interfaces:**
- Consumes: `RemoteOperationInvoker.Service` (Task 1.1) — `function-invocation-service.ts` will switch its remote dependency to it in Task 4.3; in this task keep it compiling by importing the tag but leaving behavior as the local-only path (the router already falls back to local when no `deployedId`).
- Produces: same public symbols `@dxos/functions` exported (`FunctionInvocationService`, `LocalFunctionExecutionService`, `ServiceContainer`, `ServiceRegistry`, credentials/tracing helpers, `FUNCTIONS_META_KEY`, protocol types, url helpers) — now from `@dxos/compute-runtime`.

- [ ] **Step 1: Enumerate consumers**

Run: `rg -l "@dxos/functions\"" packages --glob 'package.json'` and `rg -n "from '@dxos/functions'" packages --glob '*.ts'`
Record the list; each must be repointed to `@dxos/compute-runtime`.

- [ ] **Step 2: git mv the files** into the paths listed above.

- [ ] **Step 3: Fix internal imports** in the moved files (relative paths, and `../edge` in `function-invocation-service.ts`/`local-function-execution.ts` — the remote path becomes `RemoteOperationInvoker.Service`; keep the local executor import relative).

- [ ] **Step 4: Update `compute-runtime/src/index.ts`** to export the moved modules (follow namespace-modules: `sdk.ts` and `services/*` that are `@import-as-namespace` get `export * as <Name>`; direct-export files stay `export *`).

- [ ] **Step 5: Repoint every consumer** `from '@dxos/functions'` → `from '@dxos/compute-runtime'`, and swap `"@dxos/functions": "workspace:*"` → `"@dxos/compute-runtime": "workspace:*"` in each consumer `package.json` (dedupe if already present).

- [ ] **Step 6: Delete `@dxos/functions`** package directory and remove it from any workspace listing.

Run: `pnpm install`

- [ ] **Step 7: Build the touched graph**

Run: `moon run compute-runtime:build` → success
Run: `moon exec --on-failure continue --quiet :build` (spot the consumers) → resolve any missed import.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "compute-runtime: absorb @dxos/functions local modules; remove @dxos/functions"
```

### Task 2.3: Move `@dxos/functions-runtime` local modules into `@dxos/compute-runtime`

**Files:**
- Move (git mv) into `packages/core/compute/compute-runtime/src/`:
  - `functions-runtime/src/triggers/{trigger-dispatcher.ts,trigger-state-store.ts,feed-position.ts,input-builder.ts}` and any `jsonata` helper (+ their `.test.ts`) → `compute-runtime/src/triggers/`
  - `functions-runtime/src/executor/executor.ts` → `compute-runtime/src/executor.ts`
  - `functions-runtime/src/FeedTraceSink.ts` (+ test) → `compute-runtime/src/FeedTraceSink.ts`
  - `functions-runtime/src/object-template.ts` (+ test) → `compute-runtime/src/object-template.ts`
  - `functions-runtime/src/trace.ts` → `compute-runtime/src/functions-trace.ts` (avoid clash with existing `process-trace.ts` semantics; keep name distinct)
  - `functions-runtime/src/translations.ts` → `compute-runtime/src/translations.ts`
  - `functions-runtime/src/url.ts` → `compute-runtime/src/url.ts`
  - `functions-runtime/src/process/{Service.ts,StorageService.ts}` → merge into existing `compute-runtime/src/` (note `process/StorageService.ts` re-exports `@dxos/compute/StorageService`; reconcile with existing `storage-service-layer.ts`).
- Modify: `compute-runtime/src/index.ts` — add `export * as TriggerDispatcher …` etc. matching the old `functions-runtime` barrel (minus the aggregate monitor, which is rebuilt in Phase 4).
- Leave in `functions-runtime` for now: `edge/`, `bundler/`, `native/`, `agent-service/` (D1), `services/{remote-function-execution-service,function-invocation-service copy}`, `testing/`, `assistant-session-tests/`. These are handled in Phase 3.

**Interfaces:**
- Consumes: `ProcessManager` (already in compute-runtime).
- Produces: `TriggerDispatcher`, `TriggerStateStore`, `FeedTraceSink`, executor, object-template, trace/url/translations exported from `@dxos/compute-runtime`.

- [ ] **Step 1: Confirm no edge imports** in the files above:

Run: `rg -n "@dxos/edge-client|@dxos/client\b" packages/core/compute/functions-runtime/src/triggers packages/core/compute/functions-runtime/src/executor packages/core/compute/functions-runtime/src/FeedTraceSink.ts packages/core/compute/functions-runtime/src/object-template.ts`
Expected: no matches. If any match, exclude that file and re-scope it to Phase 3.

- [ ] **Step 2: git mv** the files, fixing relative imports.

- [ ] **Step 3: Update `compute-runtime/src/index.ts`** with the moved namespaces/exports.

- [ ] **Step 4: Repoint consumers** of these specific symbols from `@dxos/functions-runtime` → `@dxos/compute-runtime` (the edge/agent/testing symbols still resolve from `@dxos/functions-runtime` until Phase 3). Update consumer `package.json` to include `@dxos/compute-runtime` where needed (do NOT drop `@dxos/functions-runtime` yet — it still exports edge/agent code).

- [ ] **Step 5: Update `@dxos/functions-runtime` deps** — it now depends on `@dxos/compute-runtime` for the moved locals; adjust its internal imports (e.g. `triggers/trigger-monitor.ts` imports `TriggerDispatcher` → now `from '@dxos/compute-runtime'`).

Run: `pnpm install`

- [ ] **Step 6: Build**

Run: `moon run compute-runtime:build && moon run functions-runtime:build` → success
Run: `moon run compute-runtime:test -- src/triggers/trigger-dispatcher.test.ts` → PASS (moved test still green).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "compute-runtime: absorb functions-runtime local runtime (triggers, executor, trace)"
```

---

## Phase 3 — `@dxos/edge-compute` package + `Edge*` implementations

### Task 3.1: Scaffold `@dxos/edge-compute`

**Files:**
- Create: `packages/core/compute/edge-compute/package.json`
- Create: `packages/core/compute/edge-compute/src/index.ts`
- Create: `packages/core/compute/edge-compute/moon.yml` (copy shape from `functions-runtime/moon.yml`)
- Create: `packages/core/compute/edge-compute/tsconfig.json` (copy from a sibling)

**Interfaces:**
- Produces: empty package barrel; `"private": true`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@dxos/edge-compute",
  "version": "0.10.0",
  "description": "EDGE compute: function deploy, scripts, and Edge implementations of Remote* runtime interfaces.",
  "private": true,
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "default": "./dist/lib/neutral/testing/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/client": "workspace:*",
    "@dxos/compute": "workspace:*",
    "@dxos/compute-runtime": "workspace:*",
    "@dxos/context": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/edge-client": "workspace:*",
    "@dxos/effect": "workspace:*",
    "@dxos/errors": "workspace:*",
    "@dxos/functions-runtime-cloudflare": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/keys": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/protocols": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect-atom/atom": "catalog:",
    "@effect/platform": "catalog:",
    "effect": "catalog:"
  },
  "peerDependencies": {
    "effect": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write placeholder `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

- [ ] **Step 3: Install + build**

Run: `pnpm install && moon run edge-compute:build`
Expected: success (empty package compiles).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "edge-compute: scaffold package"
```

### Task 3.2: Move EDGE client + deploy/bundler/scripts into `@dxos/edge-compute`

**Files:**
- git mv from `functions-runtime/src/` → `edge-compute/src/`:
  - `edge/functions.ts` → `edge-compute/src/edge-client.ts` (exports `createEdgeClient`)
  - `edge/functions-service-client.ts` → `edge-compute/src/FunctionsServiceClient.ts`
  - `bundler/*` → `edge-compute/src/bundler/`
  - `native/*` → `edge-compute/src/native/`
- git mv `functions/src/protocol/functions-ai-http-client.ts` → `edge-compute/src/FunctionsAiHttpClient.ts` (was already moved-around in 2.2; if it went to compute-runtime by mistake, relocate here — it imports edge AI).
- git mv `functions-runtime/scripts/*` → `edge-compute/scripts/`; move the `publish-runtime`/`secrets` npm scripts into `edge-compute/package.json`.
- Modify: `edge-compute/src/index.ts` to export the moved surfaces.
- Repoint consumers of these edge symbols from `@dxos/functions-runtime` → `@dxos/edge-compute`.

**Interfaces:**
- Produces: `createEdgeClient(client): EdgeHttpClient`, `FunctionsServiceClient` (`fromClient`, `deploy`, `invoke`), bundler/native exports, from `@dxos/edge-compute`.

- [ ] **Step 1: git mv** the files; fix relative imports (`../errors` → local `errors.ts` if needed; import `Operation` from `@dxos/compute`).

- [ ] **Step 2: Move the cloudflare dynamic imports** (`bundler/bundler.ts`, `native/bundler.ts` call `import('@dxos/functions-runtime-cloudflare')`) — dependency already declared in Task 3.1.

- [ ] **Step 3: Export** from `edge-compute/src/index.ts`:

```ts
export * from './edge-client';
export * as FunctionsServiceClient from './FunctionsServiceClient';
export * from './bundler';
export * from './native';
```

- [ ] **Step 4: Repoint consumers** (`rg -n "createEdgeClient|FunctionsServiceClient" packages --glob '*.ts'`) to `@dxos/edge-compute`; update their `package.json`.

- [ ] **Step 5: Install + build**

Run: `pnpm install && moon run edge-compute:build`
Run: `moon run functions-runtime:build` (should still build — edge symbols now gone from it).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "edge-compute: move edge client, deploy, bundler, scripts"
```

### Task 3.3: `EdgeOperationInvoker` (supersedes `RemoteFunctionExecutionService`)

**Files:**
- Create: `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts`
- Delete: `functions-runtime/src/services/remote-function-execution-service.ts` (superseded)
- Modify: `edge-compute/src/index.ts`
- Test: `packages/core/compute/edge-compute/src/EdgeOperationInvoker.test.ts`

**Interfaces:**
- Consumes: `RemoteOperationInvoker.Service`/`Invoker` (Task 1.1); `createEdgeClient` (Task 3.2); `ClientService` from `@dxos/client`.
- Produces: namespace `EdgeOperationInvoker` with `fromClient(client: Client, spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service>` and `layer: Layer.Layer<RemoteOperationInvoker.Service, never, ClientService>` (reads spaceId from context via a small option), each providing `RemoteOperationInvoker.Service`.

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';

import { RemoteOperationInvoker } from '@dxos/compute-runtime';
import { Context as DxosContext } from '@dxos/context';

import * as EdgeOperationInvoker from './EdgeOperationInvoker';

describe('EdgeOperationInvoker', () => {
  test('provides RemoteOperationInvoker.Service backed by a fake edge client', async ({ expect }) => {
    const layer = EdgeOperationInvoker.fromEdgeClient({
      invokeFunction: async (_ctx, { functionId }, input) => ({ functionId, input }),
    } as any);
    const program = Effect.gen(function* () {
      const invoker = yield* RemoteOperationInvoker.Service;
      return yield* invoker.invoke(DxosContext.default(), '/fn-7', { a: 1 });
    });
    const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));
    expect(result).toEqual({ functionId: 'fn-7', input: { a: 1 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run edge-compute:test -- src/EdgeOperationInvoker.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module** (port the `RemoteFunctionExecutionService.fromClient` body; expose a seam `fromEdgeClient` for testing)

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client, ClientService } from '@dxos/client';
import { FunctionError } from '@dxos/compute';
import { RemoteOperationInvoker } from '@dxos/compute-runtime';
import { type Context as DxosContext } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';

import { createEdgeClient } from './edge-client';

type EdgeClient = ReturnType<typeof createEdgeClient>;

const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOperationInvoker.Invoker => ({
  invoke: <I, O>(ctx: DxosContext, deployedId: string, input: I): Effect.Effect<O> =>
    Effect.gen(function* () {
      const cleanedId = deployedId.replace(/^\//, '');
      return yield* Effect.promise(() =>
        getEdgeClient().invokeFunction(ctx, { functionId: cleanedId, spaceId }, input),
      ).pipe(
        Effect.mapError(FunctionError.wrap()),
        Effect.orDie,
      );
    }),
});

/** For tests: provide a pre-built edge client. */
export const fromEdgeClient = (edgeClient: EdgeClient, spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service> =>
  Layer.succeed(RemoteOperationInvoker.Service, make(() => edgeClient, spaceId));

/** Build from a `Client`, deferring edge-client creation until first invoke (identity may be absent at boot). */
export const fromClient = (client: Client, spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service> => {
  let cached: EdgeClient | undefined;
  return Layer.succeed(RemoteOperationInvoker.Service, make(() => (cached ??= createEdgeClient(client)), spaceId));
};

/** Build from the ambient `ClientService`. */
export const layer = (spaceId?: SpaceId): Layer.Layer<RemoteOperationInvoker.Service, never, ClientService> =>
  Layer.effect(
    RemoteOperationInvoker.Service,
    Effect.gen(function* () {
      const client = yield* ClientService;
      let cached: EdgeClient | undefined;
      return make(() => (cached ??= createEdgeClient(client)), spaceId);
    }),
  );
```

- [ ] **Step 4: Delete the superseded service** and repoint the router.

Delete `functions-runtime/src/services/remote-function-execution-service.ts`. Find remaining references:

Run: `rg -n "RemoteFunctionExecutionService" packages --glob '*.ts'`
Each site is either (a) the router (handled in Task 4.3) or (b) test mocks — replace test mocks with `EdgeOperationInvoker.fromEdgeClient` or `RemoteOperationInvoker.Service` stubs.

- [ ] **Step 5: Export + build + test**

Add `export * as EdgeOperationInvoker from './EdgeOperationInvoker';` to `edge-compute/src/index.ts`.
Run: `moon run edge-compute:test -- src/EdgeOperationInvoker.test.ts` → PASS
Run: `moon run edge-compute:build` → success

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "edge-compute: add EdgeOperationInvoker superseding RemoteFunctionExecutionService"
```

### Task 3.4: Relocate `agent-service/` (Decision D1)

**Files:**
- Per D1 default: git mv `functions-runtime/src/agent-service/*` → `compute-runtime/src/agent-service/` (+ `assistant-session-tests/`, `testing/assistant-test-layer.ts` as needed).
- Modify: `compute-runtime/src/index.ts` to export `AgentService`, `AGENT_PROCESS_KEY`, delegation types.
- Repoint consumers `@dxos/functions-runtime` → `@dxos/compute-runtime` for these symbols.

**Interfaces:**
- Produces: `AgentService` namespace (implements `@dxos/compute/AgentService` tag), `AGENT_PROCESS_KEY`, `Delegation`/`DelegationStrategy`.

- [ ] **Step 1: git mv** the directory; fix imports (`@dxos/assistant` is now a peer of compute-runtime — Task 2.1).

- [ ] **Step 2: Export** from `compute-runtime/src/index.ts` mirroring the old `agent-service/index.ts`.

- [ ] **Step 3: Repoint consumers** (`rg -n "getSession|hydrate|AGENT_PROCESS_KEY|AgentService" packages --glob '*.ts'` for `@dxos/functions-runtime` importers).

- [ ] **Step 4: Install + build + test**

Run: `pnpm install && moon run compute-runtime:build`
Run: `moon run compute-runtime:test -- src/agent-service/AgentService.test.ts` → PASS (may need memoized fixtures; if it fails on missing memoized conversation, that is a pre-existing harness concern — note and skip per testing-assistant-conversations skill).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "compute-runtime: relocate agent-service (local agent process runtime)"
```

### Task 3.5: Retire `@dxos/functions-runtime`

**Files:**
- Move any residual (`errors.ts`, `url.ts`, `translations.ts`, `testing/`) to their correct home (local → compute-runtime, edge → edge-compute).
- Delete `packages/core/compute/functions-runtime/` and its `moon.yml`.
- Grep the repo for any leftover `@dxos/functions-runtime` imports/deps and repoint.

- [ ] **Step 1: Sweep**

Run: `rg -n "@dxos/functions-runtime\b" packages --glob '*.ts' --glob 'package.json'`
Repoint each to `@dxos/compute-runtime` or `@dxos/edge-compute` per the litmus test.

- [ ] **Step 2: Delete the package**; `pnpm install`.

- [ ] **Step 3: Full build**

Run: `moon exec --on-failure continue --quiet :build`
Resolve any dangling import.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "functions-runtime: remove package after split into compute-runtime + edge-compute"
```

---

## Phase 4 — Aggregate monitors + routing

### Task 4.1: `ProcessMonitor` aggregate layer (compute-runtime)

**Files:**
- Create: `packages/core/compute/compute-runtime/src/ProcessMonitor.ts`
- Modify: `packages/core/compute/compute-runtime/src/ProcessManager.ts` (stop providing `Process.ProcessMonitorService` from `ProcessManager.layer`; keep exposing `manager.monitor` as the local input).
- Modify: `compute-runtime/src/index.ts`
- Test: `packages/core/compute/compute-runtime/src/ProcessMonitor.test.ts`

**Interfaces:**
- Consumes: `ProcessManagerService` (local `manager.monitor.processTreeAtom`), `RemoteProcessManager.Service` (`processTreeAtom`), `Registry.AtomRegistry`.
- Produces: `ProcessMonitor.layer: Layer.Layer<Process.ProcessMonitorService, never, ProcessManagerService | RemoteProcessManager.Service | Registry.AtomRegistry>` whose `processTree`/`processTreeAtom` is the concatenation of local + remote trees.

- [ ] **Step 1: Write the failing test** — provide local `ProcessManager.layer` + `RemoteProcessManager.layerNoop`, spawn a trivial process, assert the aggregate tree contains it (and equals local when remote is empty).

```ts
//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Process } from '@dxos/compute';

import * as ProcessMonitor from './ProcessMonitor';
import * as ProcessManager from './ProcessManager';
import * as RemoteProcessManager from './RemoteProcessManager';

describe('ProcessMonitor', () => {
  test('aggregate tree equals local tree when remote is empty', async ({ expect }) => {
    const registry = Registry.make();
    const program = Effect.gen(function* () {
      const monitor = yield* Process.ProcessMonitorService;
      return yield* monitor.processTree;
    });
    const layer = ProcessMonitor.layer.pipe(
      Layer.provideMerge(RemoteProcessManager.layerNoop),
      // ProcessManager.layer + its deps (kvStore, serviceResolver, handlerProvider, traceSink) — reuse the
      // test harness composition from ProcessManager.test.ts.
      Layer.provide(Layer.succeed(Registry.AtomRegistry, registry)),
    );
    const result = await Effect.runPromise(program.pipe(Effect.provide(layer as any)));
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `moon run compute-runtime:test -- src/ProcessMonitor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Process } from '@dxos/compute';

import { ProcessManagerService } from './process-manager-service';
import * as RemoteProcessManager from './RemoteProcessManager';

/**
 * Aggregate {@link Process.ProcessMonitorService} that merges the local
 * {@link ProcessManagerService} process tree with the remote
 * ({@link RemoteProcessManager.Service}) one. Provide
 * {@link RemoteProcessManager.layerNoop} for local-only deployments.
 */
export const layer: Layer.Layer<
  Process.ProcessMonitorService,
  never,
  ProcessManagerService | RemoteProcessManager.Service | Registry.AtomRegistry
> = Layer.effect(
  Process.ProcessMonitorService,
  Effect.gen(function* () {
    const manager = yield* ProcessManagerService;
    const remote = yield* RemoteProcessManager.Service;
    const registry = yield* Registry.AtomRegistry;

    const aggregate = Atom.make((get) => [...get(manager.monitor.processTreeAtom), ...get(remote.processTreeAtom)]);
    registry.mount(aggregate);

    return {
      processTree: Effect.sync(() => registry.get(aggregate)),
      processTreeAtom: aggregate,
    } satisfies Process.Monitor;
  }),
);
```

- [ ] **Step 4: Edit `ProcessManager.layer`** to no longer merge `Process.ProcessMonitorService` (return only `ProcessManagerService`). Update its return type. Keep `manager.monitor` accessible via `ProcessManagerService`.

- [ ] **Step 5: Update the process-manager capability** (`packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:145`) — it currently reads `Process.ProcessMonitorService` from the `ProcessManager` runtime. Ensure `ProcessMonitor.layer` (+ a `RemoteProcessManager` layer) is provided there. In app-framework (no edge) that means `RemoteProcessManager.layerNoop`.

- [ ] **Step 6: Export + build + test**

Add `export * as ProcessMonitor from './ProcessMonitor';`.
Run: `moon run compute-runtime:test -- src/ProcessMonitor.test.ts` → PASS
Run: `moon run compute-runtime:test -- src/ProcessManager.test.ts` → PASS (fix the `ProcessMonitor` describe block there to provide `ProcessMonitor.layer` + `RemoteProcessManager.layerNoop`).
Run: `moon run compute-runtime:build && moon run app-framework:build` → success

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "compute-runtime: aggregate ProcessMonitor over local + RemoteProcessManager"
```

### Task 4.2: `TriggerMonitor` aggregate layer (compute-runtime)

**Files:**
- Create: `packages/core/compute/compute-runtime/src/TriggerMonitor.ts` (generalize the moved `triggers/trigger-monitor.ts` to also read `RemoteTriggerManager.Service`; then delete the old `trigger-monitor.ts`).
- Modify: `compute-runtime/src/index.ts`
- Test: `packages/core/compute/compute-runtime/src/TriggerMonitor.test.ts` (port `trigger-monitor.test.ts`, add a remote-merge case).

**Interfaces:**
- Consumes: `TriggerDispatcher` (local, moved in Task 2.3), `Database.Service`, `Registry.AtomRegistry`, `RemoteTriggerManager.Service`.
- Produces: `TriggerMonitor.layer: Layer.Layer<Trigger.TriggerMonitorService, never, TriggerDispatcher | Database.Service | Registry.AtomRegistry | RemoteTriggerManager.Service>`. `triggers` atom = local-derived states (from dispatcher+db, `environment: 'local'`) concatenated with `remote.triggers`. `invokeTrigger` routes by the trigger's `remote` flag: `remote === true` → `remote.invokeTrigger`, else local `dispatcher.invokeTrigger`. `localDispatcherEnabled` unchanged.

- [ ] **Step 1: Write the failing test** — port existing cases; add: provide `RemoteTriggerManager.layerNoop`, assert local-only behavior unchanged; then provide a fake remote with one trigger and assert the aggregate `triggers` atom includes it.

- [ ] **Step 2: Run to verify it fails**

Run: `moon run compute-runtime:test -- src/TriggerMonitor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module** — copy `trigger-monitor.ts` body; add `const remote = yield* RemoteTriggerManager.Service;`, mount a derived atom that concatenates the local `states` with `registry.get(remote.triggers)`, and branch `invokeTrigger` on `options.trigger.remote`.

```ts
// key additions over the current trigger-monitor.ts:
const remote = yield* RemoteTriggerManager.Service;
// ...existing local deriveState producing `triggersAtom`...
const aggregate = Atom.make((get) => [...get(triggersAtom), ...get(remote.triggers)]);
registry.mount(aggregate);
const monitor: Trigger.Monitor = {
  triggers: aggregate,
  get localDispatcherEnabled() {
    return registry.get(dispatcher.state).enabled;
  },
  invokeTrigger: (options) =>
    options.trigger.remote === true ? remote.invokeTrigger(options) : dispatcher.invokeTrigger(options).pipe(Effect.asVoid),
};
```

- [ ] **Step 4: Delete** the moved `triggers/trigger-monitor.ts` + its test; export `export * as TriggerMonitor from './TriggerMonitor';`.

- [ ] **Step 5: Build + test**

Run: `moon run compute-runtime:test -- src/TriggerMonitor.test.ts` → PASS
Run: `moon run compute-runtime:build` → success

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "compute-runtime: aggregate TriggerMonitor over local dispatcher + RemoteTriggerManager"
```

### Task 4.3: Route `FunctionInvocationService` through `RemoteOperationInvoker`

**Files:**
- Modify: `packages/core/compute/compute-runtime/src/services/function-invocation-service.ts` (moved in Task 2.2).
- Test: extend `function-invocation-service.test.ts`.

**Interfaces:**
- Consumes: `RemoteOperationInvoker.Service` (replaces the old `RemoteFunctionExecutionServiceTag`), `LocalFunctionExecutionService`.
- Produces: unchanged `FunctionInvocationService` behavior — routes to `RemoteOperationInvoker.Service.invoke` when `functionDef.meta.deployedId` is set, else local.

- [ ] **Step 1: Write the failing test** — provide `RemoteOperationInvoker.Service` stub that tags input; assert an op with `meta.deployedId` routes remote, one without routes local.

- [ ] **Step 2: Run to verify it fails**

Run: `moon run compute-runtime:test -- src/services/function-invocation-service.test.ts`
Expected: FAIL — still referencing old remote tag.

- [ ] **Step 3: Rewrite the remote branch**

```ts
import { RemoteOperationInvoker } from '../RemoteOperationInvoker'; // via barrel or relative
// ...
const remote = yield* RemoteOperationInvoker.Service;
// ...
if (functionDef.meta?.deployedId) {
  return yield* remote.invoke<I, O>(DxosContext.default(), functionDef.meta.deployedId, input);
}
return yield* localExecutionService.invokeFunction(functionDef, input);
```

Update the layer requirement type from `RemoteFunctionExecutionService` to `RemoteOperationInvoker.Service`.

- [ ] **Step 4: Build + test**

Run: `moon run compute-runtime:test -- src/services/function-invocation-service.test.ts` → PASS
Run: `moon run compute-runtime:build` → success

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "compute-runtime: route FunctionInvocationService through RemoteOperationInvoker"
```

### Task 4.4: `EdgeProcessManager` + `EdgeTriggerManager` impls (edge-compute)

**Files:**
- Create: `packages/core/compute/edge-compute/src/EdgeTriggerManager.ts`
- Create: `packages/core/compute/edge-compute/src/EdgeProcessManager.ts`
- Modify: `edge-compute/src/index.ts`
- Test: `edge-compute/src/EdgeTriggerManager.test.ts`

**Interfaces:**
- Consumes: `RemoteTriggerManager.Service`/`Manager`, `RemoteProcessManager.Service`/`Manager` (compute-runtime); `EdgeHttpClient.getTriggersDispatcherStatus` (edge-client); `createEdgeClient` (Task 3.2); `Registry.AtomRegistry`.
- Produces: `EdgeTriggerManager.fromClient(client, spaceId): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry>` (polls status into `triggers` atom, `invokeTrigger` via edge). `EdgeProcessManager.fromClient(client): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry>` — per D3, returns empty tree with `TODO(edge)` until an endpoint exists (implement as `RemoteProcessManager.layerNoop` re-exported under the `Edge` name for wiring symmetry).

- [ ] **Step 1: Write the failing test** for `EdgeTriggerManager` with a fake edge client returning one dispatcher status; assert the `triggers` atom maps it into a `Trigger.State` with `environment: 'edge'`.

- [ ] **Step 2: Run to verify it fails**

Run: `moon run edge-compute:test -- src/EdgeTriggerManager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement both modules** (poll/refresh `triggers` from `getTriggersDispatcherStatus`; `invokeTrigger` calls the edge invoke endpoint). Follow namespace-modules: `// @import-as-namespace`, export `fromClient`/`fromEdgeClient`/`layer`.

- [ ] **Step 4: Export + build + test**

Add `export * as EdgeTriggerManager …` / `export * as EdgeProcessManager …`.
Run: `moon run edge-compute:test -- src/EdgeTriggerManager.test.ts` → PASS
Run: `moon run edge-compute:build` → success

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "edge-compute: add EdgeTriggerManager and EdgeProcessManager"
```

---

## Phase 5 — Rewire application wiring & final sweep

### Task 5.1: Update `plugin-routine` LayerSpecs

**Files:**
- Modify: `packages/plugins/plugin-routine/src/capabilities/layer-specs.ts`
- Modify: `packages/plugins/plugin-routine/package.json`

**Interfaces:**
- Consumes: `TriggerDispatcher`, `TriggerMonitor.layer`, `ProcessMonitor.layer`, `RemoteTriggerManager`, `RemoteProcessManager`, `RemoteOperationInvoker` (compute-runtime); `EdgeTriggerManager`, `EdgeProcessManager`, `EdgeOperationInvoker` (edge-compute).

- [ ] **Step 1:** Replace the `TriggerMonitorLayer` import (was `@dxos/functions-runtime`) with `TriggerMonitor.layer` from `@dxos/compute-runtime`. Replace `RemoteFunctionExecutionService.fromClient(...)` spec with `EdgeOperationInvoker.layer(...)` providing `RemoteOperationInvoker.Service`. Add specs providing `RemoteTriggerManager.Service` (via `EdgeTriggerManager.fromClient` when `edgeFeatures.agents`, else `RemoteTriggerManager.layerNoop`) and `RemoteProcessManager.Service` (via `EdgeProcessManager.fromClient`/`layerNoop`). Add a `ProcessMonitorSpec` providing `Process.ProcessMonitorService` via `ProcessMonitor.layer`.

- [ ] **Step 2:** Update `plugin-routine/package.json`: add `@dxos/edge-compute` (`workspace:*`); the edge dependency for triggers/deploy now comes from there. Keep `@dxos/compute-runtime`.

- [ ] **Step 3: Build**

Run: `pnpm install && moon run plugin-routine:build` → success

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "plugin-routine: wire aggregate monitors + Edge* impls"
```

### Task 5.2: Update remaining consumers + `app-framework` process-manager capability

**Files:**
- Modify: `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts`
- Modify: any remaining package importing the old package names.

- [ ] **Step 1: Provide `RemoteProcessManager.layerNoop`** and `ProcessMonitor.layer` in the app-framework process-manager runtime composition (app-framework has no edge, so noop). Confirm `Process.ProcessMonitorService` still resolves at `:145`.

- [ ] **Step 2: Sweep for stragglers**

Run: `rg -n "@dxos/functions\b|@dxos/functions-runtime\b|RemoteFunctionExecutionService" packages --glob '*.ts' --glob 'package.json'`
Expected: no results (all migrated).

- [ ] **Step 3: Build app-framework**

Run: `moon run app-framework:build` → success

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "app-framework: provide aggregate ProcessMonitor with noop remote"
```

### Task 5.3: Full build + test + lint sweep

- [ ] **Step 1: Build everything**

Run: `moon exec --on-failure continue --quiet :build`
Fix any remaining import/type errors.

- [ ] **Step 2: Test the compute stack**

Run: `MOON_CONCURRENCY=4 moon run compute-runtime:test edge-compute:test -- --no-file-parallelism`
Expected: PASS (memoized-LLM agent tests may need regeneration — follow the `regenerate-memoized-llm` skill only if they fail on missing fixtures).

- [ ] **Step 3: Lint + format**

Run: `moon run :lint -- --fix && pnpm format`

- [ ] **Step 4: No-cast audit** — ensure the migration introduced no `as any`/`as unknown as`/`!`. 

Run: `rg -n " as any| as unknown as |!\." packages/core/compute/compute-runtime/src packages/core/compute/edge-compute/src`
Fix any that this change introduced.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "compute: finalize compute-runtime/edge-compute split"
```

---

## Self-Review

- **Spec coverage:**
  - Two-package end-state (`compute-runtime` + `edge-compute`, dissolving `functions` + `functions-runtime`) → Phases 2, 3, 5.
  - `Remote*` interfaces in compute-runtime → Phase 1 (1.1–1.3).
  - `Edge*` impls in edge-compute → Tasks 3.3, 4.4.
  - Local/remote **process** monitor → `RemoteProcessManager` (1.2), `ProcessMonitor.layer` (4.1), `EdgeProcessManager` (4.4).
  - Local/remote **trigger** monitor → `RemoteTriggerManager` (1.3), `TriggerMonitor.layer` (4.2), `EdgeTriggerManager` (4.4).
  - **Operation invocation** local/remote → `RemoteOperationInvoker` (1.1), router (4.3), `EdgeOperationInvoker` (3.3).
  - `EdgeOperationInvoker` supersedes `RemoteFunctionExecutionService` → Task 3.3 (delete + replace).
  - edge scripts/function/deploy in edge-compute → Task 3.2.
  - namespace-modules conventions → Global Constraints + every new module carries `// @import-as-namespace` and unprefixed `Service`/`Manager`/`Invoker`/`layer` members.
- **Naming consistency:** interface tags `RemoteOperationInvoker.Service`, `RemoteProcessManager.Service`, `RemoteTriggerManager.Service`; impls `EdgeOperationInvoker.{fromClient,fromEdgeClient,layer}`, `EdgeProcessManager.fromClient`, `EdgeTriggerManager.fromClient`; aggregates `ProcessMonitor.layer`, `TriggerMonitor.layer`. Used identically across tasks.
- **Open decisions surfaced:** D1 (agent-service home), D2 (router kept, not renamed), D3 (no EDGE process-tree endpoint yet) — each has a recommended default so execution is not blocked.

## Execution Handoff

Plan saved to `agents/superpowers/plans/2026-07-16-compute-runtime-edge-compute-split.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Confirm Decisions **D1/D3** (and D2 if you disagree) before starting Phase 3.
