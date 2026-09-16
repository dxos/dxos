//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import type * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { ActivationEvents, Capabilities } from '../common/index.ts';
import { ActivationEvent, type Capability, type CapabilityManager, type Plugin, PluginManager } from '../core/index.ts';
import { activateDemandGatedModules } from './demand-gated.ts';

export type TestAppOptions = {
  /**
   * Plugins to register. Plugins whose `meta.profile.tags` includes `'system'` are treated as core
   * (force-enabled). For test convenience, plugins without a `'system'` tag are enabled by
   * default unless `enabled` is provided.
   */
  plugins: Plugin.Plugin[];
  /** Plugin ids that are enabled by default in addition to core. Defaults to all non-system plugin ids. */
  enabled?: string[];
  /** Additional activation events fired before Startup. */
  setupEvents?: ActivationEvent.ActivationEvent[];
  /**
   * Whether to automatically fire Startup during setup.
   * Defaults to true.
   */
  autoStart?: boolean;
  /**
   * Whether to register the PluginManager + AtomRegistry framework capabilities.
   * Defaults to true.
   */
  registerFrameworkCapabilities?: boolean;
  /**
   * Completes when the host is idle, gating the Idle wave. Off-browser the real wait resolves
   * immediately; pass `Effect.never` to keep idle-gated modules inactive, as on a browser cold boot.
   */
  whenIdle?: Effect.Effect<void>;
};

/**
 * A running plugin manager plus helpers for driving it in tests.
 */
export interface TestHarness {
  readonly manager: PluginManager.PluginManager;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.AtomRegistry;

  /** Activate the given event. Equivalent to `manager.activate(event)`. */
  fire(event: ActivationEvent.ActivationEvent | string): Promise<boolean>;
  /** Re-activate all modules that were activated by the given event. */
  reset(event: ActivationEvent.ActivationEvent | string): Promise<boolean>;

  /** Returns the first contributed capability for the given interface. Throws if none are present. */
  get<T>(iface: Capability.InterfaceDef<T>): T;
  /** Returns all contributed capabilities for the given interface. */
  getAll<T>(iface: Capability.InterfaceDef<T>): T[];
  /** Waits until at least one capability is contributed for the given interface. */
  waitForCapability<T>(iface: Capability.InterfaceDef<T>, opts?: { timeout?: number }): Promise<T>;
  /** Waits until the given activation event has completed. */
  waitForEvent(event: ActivationEvent.ActivationEvent | string, opts?: { timeout?: number }): Promise<void>;

  /** Invokes an operation through the `Capabilities.OperationInvoker` capability. */
  invoke<I, O>(op: Operation.Definition<I, O>, ...args: void extends I ? [input?: I] : [input: I]): Promise<O>;

  /**
   * Waits for `Capabilities.ProcessManagerRuntime` and runs the given effect on it.
   * Convenience around `waitForCapability(ProcessManagerRuntime).runPromise(effect)`.
   */
  runPromise<A, E>(
    effect: Effect.Effect<A, E, Capabilities.ProcessManagerRuntimeServices>,
    options?: { readonly timeout?: number; readonly signal?: AbortSignal },
  ): Promise<A>;

  enable(id: string): Promise<boolean>;
  disable(id: string): Promise<boolean>;

  /** Shuts down the underlying plugin manager. */
  dispose(): Promise<void>;

  /** Async-disposable support so tests can use `await using harness = ...`. */
  [Symbol.asyncDispose](): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Creates a TestHarness with the same bootstrap sequence that `useApp` performs,
 * minus the React provider tree.
 *
 * For Node-only tests, this is enough to fire activation events, read
 * capabilities, and invoke operations.
 *
 * For React tests, pass the returned harness to `render` or `renderSurface`
 * from `@dxos/app-framework/testing-react`.
 *
 * TODO(wittjosiah): Consider running activation tests under a browser runner.
 *   A plugin's `#capabilities` resolves to its `capabilities/node.ts` under the `node` export
 *   condition, so a Node-run activation test asserts the NODE barrel's wiring, not the one the
 *   app ships. The two are hand-maintained siblings and drifted silently — 35 modules were gated
 *   in `index.ts` and ungated in `node.ts` (found 2026-08-04; a `CreateObject` module read as
 *   startup-eager in tests while the browser build gated it correctly). They were realigned, but
 *   nothing keeps them that way, and a lint rule is the wrong instrument: the barrels legitimately
 *   diverge (node omits React surfaces entirely), so "same gates" is not a property that holds in
 *   general. Running these tests in a browser runner exercises the shipped barrel directly and
 *   makes the question moot.
 */
export const createTestApp = async (opts: TestAppOptions): Promise<TestHarness> => {
  const {
    plugins,
    enabled = plugins
      .filter(({ meta }) => !meta.profile.tags?.includes('system'))
      .map((plugin) => plugin.meta.profile.key),
    setupEvents = [],
    autoStart = true,
    registerFrameworkCapabilities = true,
    whenIdle,
  } = opts;

  const pluginLoader = (id: string) =>
    Effect.sync(() => {
      const plugin = plugins.find((plugin) => plugin.meta.profile.key === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return { plugin };
    });

  const manager = PluginManager.make({ pluginLoader, plugins, enabled, whenIdle });

  if (registerFrameworkCapabilities) {
    manager.capabilities.contribute({
      interface: Capabilities.PluginManager,
      implementation: manager,
      module: 'org.dxos.app-framework.plugin-manager',
    });
    manager.capabilities.contribute({
      interface: Capabilities.AtomRegistry,
      implementation: manager.registry,
      module: 'org.dxos.app-framework.atom-registry',
    });
  }

  if (autoStart) {
    try {
      await EffectEx.runAndForwardErrors(
        Effect.all([
          ...setupEvents.map((event) => manager.activate(event)),
          manager.activate(ActivationEvents.Startup),
        ]),
      );
      // In the app plugins start on demand (surface render), which a headless harness never
      // triggers — fire every start event before the test body runs so start-gated modules
      // are present.
      await EffectEx.runAndForwardErrors(activateDemandGatedModules(manager));
    } catch (err) {
      await EffectEx.runAndForwardErrors(manager.shutdown()).catch(() => undefined);
      throw err;
    }
  }

  return new TestHarnessImpl(manager);
};

class TestHarnessImpl implements TestHarness {
  constructor(readonly manager: PluginManager.PluginManager) {}

  get capabilities(): CapabilityManager.CapabilityManager {
    return this.manager.capabilities;
  }

  get registry(): Registry.AtomRegistry {
    return this.manager.registry;
  }

  fire(event: ActivationEvent.ActivationEvent | string): Promise<boolean> {
    return EffectEx.runAndForwardErrors(this.manager.activate(event));
  }

  reset(event: ActivationEvent.ActivationEvent | string): Promise<boolean> {
    return EffectEx.runAndForwardErrors(this.manager.reset(event));
  }

  get<T>(iface: Capability.InterfaceDef<T>): T {
    return this.manager.capabilities.get(iface);
  }

  getAll<T>(iface: Capability.InterfaceDef<T>): T[] {
    return this.manager.capabilities.getAll(iface);
  }

  waitForCapability<T>(iface: Capability.InterfaceDef<T>, opts?: { timeout?: number }): Promise<T> {
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
    return EffectEx.runAndForwardErrors(
      this.manager.capabilities.waitFor(iface).pipe(
        Effect.timeoutOrElse({
          duration: Duration.millis(timeout),
          orElse: () => Effect.fail(timeoutError(iface.identifier)),
        }),
      ),
    );
  }

  waitForEvent(event: ActivationEvent.ActivationEvent | string, opts?: { timeout?: number }): Promise<void> {
    const key = typeof event === 'string' ? event : ActivationEvent.eventKey(event);
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;

    const program = Effect.gen({ self: this }, function* () {
      const queue = yield* PubSub.subscribe(this.manager.activation);
      // Re-check after subscribing to avoid a race where the event fires
      // between the caller invoking this and the subscription being installed.
      if (this.manager.getEventsFired().includes(key)) {
        return;
      }
      while (true) {
        const message = yield* PubSub.take(queue);
        if (message.event === key && message.state === 'activated') {
          return;
        }
      }
    }).pipe(
      Effect.scoped,
      Effect.timeoutOrElse({
        duration: Duration.millis(timeout),
        orElse: () => Effect.fail(timeoutError(key)),
      }),
    );

    return EffectEx.runAndForwardErrors(program);
  }

  async invoke<I, O>(op: Operation.Definition<I, O>, ...args: [input?: I]): Promise<O> {
    const invoker = await this.waitForCapability(Capabilities.OperationInvoker);
    const result = await invoker.invokePromise(op as any, ...(args as [any]));
    if (result.error) {
      throw result.error;
    }
    return result.data as O;
  }

  async runPromise<A, E>(
    effect: Effect.Effect<A, E, Capabilities.ProcessManagerRuntimeServices>,
    options?: { readonly timeout?: number; readonly signal?: AbortSignal },
  ): Promise<A> {
    const runtime = await this.waitForCapability(Capabilities.ProcessManagerRuntime, { timeout: options?.timeout });
    return runtime.runPromise(effect, options?.signal ? { signal: options.signal } : undefined);
  }

  enable(id: string): Promise<boolean> {
    return EffectEx.runAndForwardErrors(this.manager.enable(id));
  }

  disable(id: string): Promise<boolean> {
    return EffectEx.runAndForwardErrors(this.manager.disable(id));
  }

  async dispose(): Promise<void> {
    await EffectEx.runAndForwardErrors(this.manager.shutdown());
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }
}

const timeoutError = (id: string) => new Error(`Timed out waiting for ${id}`);
