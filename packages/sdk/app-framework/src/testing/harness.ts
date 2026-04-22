//
// Copyright 2026 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';

import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Operation } from '@dxos/operation';

import { ActivationEvents, Capabilities } from '../common';
import { ActivationEvent, type Capability, type CapabilityManager, type Plugin, PluginManager } from '../core';

export type TestAppOptions = {
  /** Plugins to register. */
  plugins: Plugin.Plugin[];
  /** Plugin ids that are always enabled. Defaults to all provided plugin ids. */
  core?: string[];
  /** Plugin ids that are enabled by default in addition to core. */
  enabled?: string[];
  /** Additional activation events fired alongside SetupReactSurface. */
  setupEvents?: ActivationEvent.ActivationEvent[];
  /**
   * Whether to automatically fire SetupReactSurface + Startup during setup.
   * Defaults to true.
   */
  autoStart?: boolean;
  /**
   * Whether to register the PluginManager + AtomRegistry framework capabilities.
   * Defaults to true.
   */
  registerFrameworkCapabilities?: boolean;
};

/**
 * A running plugin manager plus helpers for driving it in tests.
 */
export interface TestHarness {
  readonly manager: PluginManager.PluginManager;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.Registry;

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
 */
export const createTestApp = async (opts: TestAppOptions): Promise<TestHarness> => {
  const {
    plugins,
    core = plugins.map((plugin) => plugin.meta.id),
    enabled,
    setupEvents = [],
    autoStart = true,
    registerFrameworkCapabilities = true,
  } = opts;

  const pluginLoader = (id: string) =>
    Effect.sync(() => {
      const plugin = plugins.find((plugin) => plugin.meta.id === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return plugin;
    });

  const manager = PluginManager.make({ pluginLoader, plugins, core, enabled });

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
      await runAndForwardErrors(
        Effect.all([
          ...setupEvents.map((event) => manager.activate(event)),
          manager.activate(ActivationEvents.SetupReactSurface),
          manager.activate(ActivationEvents.Startup),
        ]),
      );
    } catch (err) {
      await runAndForwardErrors(manager.shutdown()).catch(() => undefined);
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

  get registry(): Registry.Registry {
    return this.manager.registry;
  }

  fire(event: ActivationEvent.ActivationEvent | string): Promise<boolean> {
    return runAndForwardErrors(this.manager.activate(event));
  }

  reset(event: ActivationEvent.ActivationEvent | string): Promise<boolean> {
    return runAndForwardErrors(this.manager.reset(event));
  }

  get<T>(iface: Capability.InterfaceDef<T>): T {
    return this.manager.capabilities.get(iface);
  }

  getAll<T>(iface: Capability.InterfaceDef<T>): T[] {
    return this.manager.capabilities.getAll(iface);
  }

  waitForCapability<T>(iface: Capability.InterfaceDef<T>, opts?: { timeout?: number }): Promise<T> {
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
    return runAndForwardErrors(
      this.manager.capabilities.waitFor(iface).pipe(
        Effect.timeoutFail({
          duration: Duration.millis(timeout),
          onTimeout: () => timeoutError(iface.identifier),
        }),
      ),
    );
  }

  waitForEvent(event: ActivationEvent.ActivationEvent | string, opts?: { timeout?: number }): Promise<void> {
    const key = typeof event === 'string' ? event : ActivationEvent.eventKey(event);
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;

    const program = Effect.gen(this, function* () {
      const queue = yield* PubSub.subscribe(this.manager.activation);
      // Re-check after subscribing to avoid a race where the event fires
      // between the caller invoking this and the subscription being installed.
      if (this.manager.getEventsFired().includes(key)) {
        return;
      }
      while (true) {
        const message = yield* Queue.take(queue);
        if (message.event === key && message.state === 'activated') {
          return;
        }
      }
    }).pipe(
      Effect.scoped,
      Effect.timeoutFail({
        duration: Duration.millis(timeout),
        onTimeout: () => timeoutError(key),
      }),
    );

    return runAndForwardErrors(program);
  }

  async invoke<I, O>(op: Operation.Definition<I, O>, ...args: [input?: I]): Promise<O> {
    const invoker = await this.waitForCapability(Capabilities.OperationInvoker);
    const result = await invoker.invokePromise(op as any, ...(args as [any]));
    if (result.error) {
      throw result.error;
    }
    return result.data as O;
  }

  enable(id: string): Promise<boolean> {
    return runAndForwardErrors(this.manager.enable(id));
  }

  disable(id: string): Promise<boolean> {
    return runAndForwardErrors(this.manager.disable(id));
  }

  async dispose(): Promise<void> {
    await runAndForwardErrors(this.manager.shutdown());
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }
}

const timeoutError = (id: string) => new Error(`Timed out waiting for ${id}`);
