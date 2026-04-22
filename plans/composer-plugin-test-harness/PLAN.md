# Composer Plugin Test Harness

## Goals

- Spin up a realistic `PluginManager` in tests with the same bootstrapping that `useApp` performs.
- Fire activation events, assert on capabilities, invoke operations, and render surfaces.
- Work equally well in pure Node (no DOM) for logic/operation tests and in jsdom / happy-dom / vitest-browser for React tests.
- Plain `async/await` API so it composes cleanly with `@testing-library/react` and regular `it`/`describe`.
- Zero new heavy deps; reuse everything already in `@dxos/app-framework`.

## Package Placement

Two-layer split mirrors the existing boundary between `@dxos/app-framework` (low-level) and `@dxos/plugin-testing` (Composer-flavored presets):

- `@dxos/app-framework/testing` — primitive `TestHarness` + `createTestApp()`. No plugin dependencies. Reuses the existing subpath (already exported by `packages/sdk/app-framework/package.json`). Lives alongside `fromPlugins`/`withPluginManager` in `packages/sdk/app-framework/src/testing/`.
- `@dxos/app-framework/testing-react` — optional subpath for the RTL-dependent helpers (`render`, `renderSurface`), so Node-only tests don't pull in `react-dom`/RTL.
- `@dxos/plugin-testing` — already exports `corePlugins()`. Adds a `createComposerTestApp()` preset that layers `corePlugins()` + optional `ClientPlugin` on top of `createTestApp()`.

## API Surface

### Low-level: `@dxos/app-framework/testing`

```ts
export type TestAppOptions = {
  plugins: Plugin.Plugin[];
  core?: string[];                                  // defaults to all plugin ids
  enabled?: string[];
  setupEvents?: ActivationEvent.ActivationEvent[];  // fired alongside SetupReactSurface
  autoStart?: boolean;                              // default true; fires SetupReactSurface + Startup
  registerFrameworkCapabilities?: boolean;          // default true (PluginManager + AtomRegistry)
};

export interface TestHarness extends AsyncDisposable {
  readonly manager: PluginManager.PluginManager;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.Registry;

  fire(event: ActivationEvent.ActivationEvent | string): Promise<boolean>;
  reset(event: ActivationEvent.ActivationEvent | string): Promise<boolean>;

  get<T>(iface: Capability.InterfaceDef<T>): T;        // single, throws if missing
  getAll<T>(iface: Capability.InterfaceDef<T>): T[];
  waitForCapability<T>(iface: Capability.InterfaceDef<T>, opts?: { timeout?: number }): Promise<T>;
  waitForEvent(key: string, opts?: { timeout?: number }): Promise<void>;

  invoke<I, O>(op: Operation.Operation<I, O>, input: I): Promise<O>;   // via Capabilities.OperationInvoker

  enable(id: string): Promise<boolean>;
  disable(id: string): Promise<boolean>;

  dispose(): Promise<void>;                            // manager.shutdown()
  [Symbol.asyncDispose](): Promise<void>;              // alias for dispose(); enables `await using`
}

export const createTestApp = (opts: TestAppOptions): Promise<TestHarness>;

/** Vitest lifecycle helper: auto-dispose after each test. */
export const useTestApp = (opts: TestAppOptions | (() => TestAppOptions)): () => TestHarness;
```

Internals (small file, no new deps):

- Build the manager the same way as `useApp` does — see `packages/sdk/app-framework/src/ui/hooks/useApp.tsx` lines around `manager.capabilities.contribute({ interface: Capabilities.PluginManager, ... })` and the `SetupReactSurface` + `Startup` activation block.
- `fire` = `runPromise(manager.activate(event))`.
- `invoke` = `runPromise(invoker.invoke(op, input))` after `waitForCapability(Capabilities.OperationInvoker)`.
- `waitForCapability` = subscribe to `manager.capabilities` via the existing `Atom`/`Registry` mechanism or `manager.activation` PubSub with a promise race against a timeout.
- `dispose` = `runAndForwardErrors(manager.shutdown())` — already exercised by `packages/sdk/app-framework/src/ui/hooks/useApp.test.tsx`.

### React helpers: `@dxos/app-framework/testing-react`

```ts
import type { RenderOptions, RenderResult } from '@testing-library/react';

export type HarnessRenderOptions = RenderOptions & {
  /** Inject additional ReactContext capabilities under test. */
  reactContexts?: Array<FC<PropsWithChildren>>;
};

export const render: (harness: TestHarness, ui: React.ReactNode, options?: HarnessRenderOptions) => RenderResult;

/** Shorthand for <SurfaceComponent role=... data=... /> inside the harness. */
export const renderSurface: (
  harness: TestHarness,
  props: { role: string; data?: unknown; limit?: number; fallback?: ReactNode },
  options?: HarnessRenderOptions,
) => RenderResult;
```

Wraps UI in the same provider tree as `useApp`: `PluginManagerProvider`, `ContextProtocolProvider`, `RegistryContext.Provider`, and every contributed `Capabilities.ReactContext` (so a translation-dependent component works without bespoke setup).

### Composer preset: `@dxos/plugin-testing`

```ts
export type ComposerTestAppOptions = Omit<TestAppOptions, 'plugins'> & {
  plugins?: Plugin.Plugin[]; // added on top of core
  client?: boolean | ClientPluginOptions; // adds ClientPlugin, with optional config
};

export const createComposerTestApp = (opts?: ComposerTestAppOptions) =>
  createTestApp({
    ...opts,
    plugins: [
      ...corePlugins(),
      ...(opts?.client ? [ClientPlugin(opts.client === true ? {} : opts.client)] : []),
      ...(opts?.plugins ?? []),
    ],
  });
```

Builds on the existing `packages/plugins/plugin-testing/src/core.ts` `corePlugins()` list (Attention, Graph, Operation, Runtime, Settings, Theme). `StorybookPlugin` stays where it is; tests that want its layout can opt into it explicitly.

## Test Environments

- **Node-only tests** (operation firehose, capability wiring, activation ordering): no vitest environment needed; the harness works in bare Node.
- **React tests**: the test file's `vitest.config.ts` keeps setting `environment: 'jsdom'` or `'happy-dom'` (existing convention — see `packages/plugins/plugin-sheet/vitest.config.ts`, `packages/plugins/plugin-transcription/vitest.config.ts`). The React subpath is a peer dep on `@testing-library/react`.
- **Browser-vitest**: works unchanged — same `render` helper from RTL; nothing in the harness depends on Node APIs.

## Example Tests

### Activation firehose (Node-only)

```ts
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@dxos/app-framework/testing';
import { ActivationEvents } from '@dxos/app-framework';
import { MyPlugin } from '../MyPlugin';

describe('MyPlugin activation', () => {
  it('contributes its surface on SetupReactSurface', async () => {
    await using harness = await createTestApp({ plugins: [MyPlugin()] });
    const surfaces = harness.getAll(Capabilities.ReactSurface);
    expect(surfaces.some((s) => s.id === 'my.article')).toBe(true);
  });
});
```

### Operation invocation

```ts
const harness = await createComposerTestApp({ plugins: [ChessPlugin()] });
const result = await harness.invoke(MakeMove, { game, move: 'e4' });
expect(result.pgn).toContain('e4');
await harness.dispose();
```

### Surface render (jsdom)

```ts
import { render, renderSurface } from '@dxos/app-framework/testing-react';
const harness = await createComposerTestApp({ client: true, plugins: [ChessPlugin()] });
const view = renderSurface(harness, { role: 'article', data: { subject: chessGame } });
expect(await view.findByRole('grid')).toBeInTheDocument();
```

## Relationship to Existing Helpers

- `fromPlugins()` (Effect Layer) in `packages/sdk/app-framework/src/testing/service.ts` stays as-is for Effect/CLI tests. The async `TestHarness` is implemented in the same file family and can be trivially wrapped in a `Layer` later if needed.
- `withPluginManager` decorator in `packages/sdk/app-framework/src/testing/withPluginManager.tsx` is Storybook-specific and remains untouched. The new harness shares the same `setupPluginManager` shape so stories and tests activate plugins identically.

## What We Can Build With It

- **Plugin smoke tests**: every plugin has a `MyPlugin.test.ts` that boots it, activates known events, and asserts each advertised capability is contributed.
- **Operation integration tests**: invoke operations end-to-end through the real invoker + `OperationHandler` capabilities (no hand-rolled handler mocks).
- **Surface regression tests**: mount a plugin's article/card surfaces against an in-memory ECHO space (via `ClientPlugin`) and assert DOM output.
- **Activation-ordering tests**: fire multi-event sequences and assert `manager.getActive()` / `manager.getEventsFired()` match expectations (cheap, Node-only).
- **Multi-plugin scenarios**: boot two plugins together and verify cross-plugin graph/operation interactions, e.g. `plugin-space` + `plugin-chess`.
