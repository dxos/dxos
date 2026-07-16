//
// Copyright 2025 DXOS.org
//

import { type Atom, Registry } from '@effect-atom/atom-react';
import { afterEach, assert, describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Match from 'effect/Match';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import * as TestClock from 'effect/TestClock';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents } from '../common';
import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import type * as CapabilityManager from './capability-manager';
import { DependencyCycleError, DuplicateProviderError, MissingProviderError, ProvidesMismatchError } from './errors';
import * as Plugin from './plugin';
import * as PluginManager from './plugin-manager';

const String = Capability.make<{ string: string }>('org.dxos.test.string');
const Number = Capability.make<{ number: number }>('org.dxos.test.number');
const Total = Capability.make<{ total: number }>('org.dxos.test.total');

const CountEvent = ActivationEvent.make('org.dxos.test.count');
const FailEvent = ActivationEvent.make('org.dxos.test.fail');

const testMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test'), name: 'Test' });

// TODO(wittjosiah): Factor out?
const atomCounter = (registry: Registry.Registry, atom: Atom.Atom<any>) => {
  let count = 0;
  let initial = true;
  const dispose = registry.subscribe(
    atom,
    () => {
      if (initial) {
        initial = false;
        return;
      }
      count++;
    },
    { immediate: true },
  );
  return {
    get count() {
      return count;
    },
    [Symbol.dispose]: dispose,
  };
};

describe('PluginManager', () => {
  let plugins: Plugin.Plugin[] = [];
  const pluginLoader = Effect.fn(function* (id: string) {
    const plugin = plugins.find((plugin) => plugin.meta.profile.key === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return { plugin };
  });

  afterEach(() => {
    plugins = [];
  });

  it.effect('should be able to add and remove plugins', () =>
    Effect.gen(function* () {
      const Test = Plugin.make(Plugin.define(testMeta));
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      const added = yield* manager.add(testMeta.profile.key);
      assert.strictEqual(added, testPlugin);
      assert.deepStrictEqual(manager.getPlugins(), [testPlugin]);
      assert.deepStrictEqual(manager.getEnabled(), []);
      const removed = yield* manager.remove(testMeta.profile.key);
      assert.isTrue(removed);
      assert.deepStrictEqual(manager.getPlugins(), []);
    }),
  );

  it.effect('should add plugin when locator differs from meta.profile.key', () =>
    Effect.gen(function* () {
      const Test = Plugin.make(Plugin.define(testMeta));
      const testPlugin = Test();

      const urlLocator = 'https://example.com/plugin.mjs';
      const urlLoader = Effect.fn(function* (locator: string) {
        if (locator === urlLocator) {
          return { plugin: testPlugin };
        }
        return yield* Effect.fail(new Error(`Unknown locator: ${locator}`));
      });

      const manager = PluginManager.make({ pluginLoader: urlLoader });
      const added = yield* manager.add(urlLocator);
      assert.strictEqual(added, testPlugin);
      assert.deepStrictEqual(manager.getPlugins(), [testPlugin]);
      assert.deepStrictEqual(manager.getEnabled(), []);
      yield* manager.enable(added.meta.profile.key);
      assert.deepStrictEqual(manager.getEnabled(), [testMeta.profile.key]);
    }),
  );

  it.effect('dev plugin shadows an existing plugin with the same id', () =>
    Effect.gen(function* () {
      const productionPlugin = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'Prod',
            activatesOn: ActivationEvents.Startup,
            activate: () => Effect.succeed(Capability.contributes(String, { string: 'prod' })),
          }),
        ),
      )();
      const devPlugin = Plugin.make(
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'Dev',
            activatesOn: ActivationEvents.Startup,
            activate: () => Effect.succeed(Capability.contributes(String, { string: 'dev' })),
          }),
        ),
      )();

      const loader = Effect.fn(function* (locator: string) {
        if (locator === 'prod') {
          return { plugin: productionPlugin };
        }
        if (locator === 'dev') {
          return { plugin: devPlugin, dev: true };
        }
        return yield* Effect.fail(new Error(`Unknown locator: ${locator}`));
      });

      const manager = PluginManager.make({ pluginLoader: loader });
      yield* manager.add('prod');
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.deepStrictEqual(
        manager.capabilities.getAll(String).map((value) => value.string),
        ['prod'],
      );

      // Loading the dev plugin with the same id swaps it into the id slot.
      yield* manager.add('dev');
      yield* manager.enable(testMeta.profile.key);
      assert.strictEqual(
        manager.getPlugins().find((plugin) => plugin.meta.profile.key === testMeta.profile.key),
        devPlugin,
      );
      yield* manager.reset(ActivationEvents.Startup);
      assert.deepStrictEqual(
        manager.capabilities.getAll(String).map((value) => value.string),
        ['dev'],
      );

      // Removing the dev plugin restores the original and re-enables it
      // because it was enabled at shadow time.
      yield* manager.remove(testMeta.profile.key);
      assert.strictEqual(
        manager.getPlugins().find((plugin) => plugin.meta.profile.key === testMeta.profile.key),
        productionPlugin,
      );
      assert.isTrue(manager.getEnabled().includes(testMeta.profile.key));
      yield* manager.reset(ActivationEvents.Startup);
      assert.deepStrictEqual(
        manager.capabilities.getAll(String).map((value) => value.string),
        ['prod'],
      );
    }),
  );

  it.effect('dev plugin add does not auto-enable a previously-disabled shadow target', () =>
    Effect.gen(function* () {
      const productionPlugin = Plugin.make(Plugin.define(testMeta))();
      const devPlugin = Plugin.make(Plugin.define(testMeta))();
      const loader = Effect.fn(function* (locator: string) {
        if (locator === 'prod') {
          return { plugin: productionPlugin };
        }
        if (locator === 'dev') {
          return { plugin: devPlugin, dev: true };
        }
        return yield* Effect.fail(new Error(`Unknown locator: ${locator}`));
      });

      const manager = PluginManager.make({ pluginLoader: loader });
      yield* manager.add('prod');
      // Production plugin is registered but explicitly NOT enabled.
      assert.deepStrictEqual(manager.getEnabled(), []);

      yield* manager.add('dev');
      yield* manager.remove(testMeta.profile.key);

      // Original is restored but stays disabled, matching its pre-shadow state.
      assert.strictEqual(
        manager.getPlugins().find((plugin) => plugin.meta.profile.key === testMeta.profile.key),
        productionPlugin,
      );
      assert.deepStrictEqual(manager.getEnabled(), []);
    }),
  );

  it.effect('should support factory pattern with options', () =>
    Effect.gen(function* () {
      type TestPluginOptions = { count: number };
      const TestPluginFactory = Plugin.define<TestPluginOptions>(testMeta).pipe(
        Plugin.addModule((options: TestPluginOptions) => ({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: `hello-${options.count}` })),
        })),
        Plugin.addModule({
          id: 'World',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'world' })),
        }),
        Plugin.make,
      );

      const plugin = TestPluginFactory({ count: 5 });
      plugins = [plugin];

      const manager = PluginManager.make({ plugins: [plugin], pluginLoader });
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      const strings = manager.capabilities.getAll(String);
      assert.strictEqual(strings.length, 2);
      assert.strictEqual(strings[0].string, 'hello-5');
      assert.strictEqual(strings[1].string, 'world');
    }),
  );

  it.effect('should be able to enable and disable plugins', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], pluginLoader });
      yield* manager.enable(testMeta.profile.key);
      assert.deepStrictEqual(manager.getEnabled(), [Test.meta.profile.key]);
      assert.deepStrictEqual(manager.getModules(), [testPlugin.modules[0]]);
      yield* manager.disable(testMeta.profile.key);
      assert.deepStrictEqual(manager.getEnabled(), []);
      assert.deepStrictEqual(manager.getModules(), []);
    }),
  );

  it.effect('should be able to activate plugins', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], pluginLoader });
      yield* manager.enable(Test.meta.profile.key);
      assert.deepStrictEqual(manager.getPlugins(), [testPlugin]);
      assert.deepStrictEqual(manager.getEnabled(), [Test.meta.profile.key]);
      assert.deepStrictEqual(manager.getModules(), [testPlugin.modules[0]]);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.deepStrictEqual(manager.getEventsFired(), []);
      yield* manager.activate(ActivationEvents.Startup);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.deepStrictEqual(manager.getEventsFired(), [ActivationEvents.Startup.id]);
    }),
  );

  it.effect('should handle activate returning void', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'NoCapabilities',
          activatesOn: ActivationEvents.Startup,
          activate: Effect.fnUntraced(function* () {}),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], pluginLoader });
      yield* manager.enable(Test.meta.profile.key);

      const result = yield* manager.activate(ActivationEvents.Startup);
      assert.isTrue(result);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
    }),
  );

  it.effect('should propagate errors thrown by module activate callbacks', () =>
    Effect.gen(function* () {
      plugins = [
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            activatesOn: FailEvent,
            id: 'Fail',
            activate: () => Effect.fail(new Error('test')),
          }),
          Plugin.make,
        )(),
      ];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      const error = yield* Effect.flip(manager.activate(FailEvent));
      assert.strictEqual(error.message, 'test');
    }),
  );

  it.effect('should catch and log defects (synchronous throws) in module activation', () =>
    Effect.gen(function* () {
      const DefectEvent = ActivationEvent.make('org.dxos.test.defect');
      const capturedErrors: LogEntry[] = [];
      const removeProcessor = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
        if (entry.level === LogLevel.ERROR) {
          capturedErrors.push(entry);
        }
      });

      plugins = [
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            activatesOn: DefectEvent,
            id: 'DefectInEffectSync',
            activate: () =>
              Effect.sync(() => {
                // This is a defect - a synchronous throw inside Effect.sync.
                throw new Error('defect in Effect.sync');
              }),
          }),
          Plugin.make,
        )(),
      ];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      const error = yield* Effect.flip(manager.activate(DefectEvent));

      // Verify the error was caught and propagated.
      assert.strictEqual(error.message, 'defect in Effect.sync');

      // Verify the error was logged with isDefect: true.
      const defectLog = capturedErrors.find(
        (entry) =>
          entry.message?.includes('module failed to activate') &&
          entry.context?.module === 'org.dxos.plugin.test.module.DefectInEffectSync',
      );
      assert.isNotNull(defectLog, 'Expected error log for defect');
      assert.strictEqual(defectLog?.context?.isDefect, true, 'Expected isDefect to be true for synchronous throw');

      removeProcessor();
    }),
  );

  it.effect('should catch and log defects when activate throws before returning Effect', () =>
    Effect.gen(function* () {
      const DefectEvent = ActivationEvent.make('org.dxos.test.defectImmediate');
      const capturedErrors: LogEntry[] = [];
      const removeProcessor = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
        if (entry.level === LogLevel.ERROR) {
          capturedErrors.push(entry);
        }
      });

      plugins = [
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            activatesOn: DefectEvent,
            id: 'DefectImmediate',
            activate: (): Effect.Effect<void> => {
              // This throws immediately before even returning an Effect.
              // This is the most severe type of defect.
              throw new Error('immediate throw before Effect');
            },
          }),
          Plugin.make,
        )(),
      ];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      const error = yield* Effect.flip(manager.activate(DefectEvent));

      // Verify the error was caught and propagated.
      assert.strictEqual(error.message, 'immediate throw before Effect');

      // Verify the error was logged with isDefect: true.
      const defectLog = capturedErrors.find(
        (entry) =>
          entry.message?.includes('module failed to activate') &&
          entry.context?.module === 'org.dxos.plugin.test.module.DefectImmediate',
      );
      assert.isNotNull(defectLog, 'Expected error log for immediate defect');
      assert.strictEqual(
        defectLog?.context?.isDefect,
        true,
        'Expected isDefect to be true for immediate throw before Effect',
      );

      removeProcessor();
    }),
  );

  it.effect('should fire activation events', () =>
    Effect.gen(function* () {
      plugins = [
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'Hello',
            activatesOn: ActivationEvents.Startup,
            activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
          }),
          Plugin.addModule({
            activatesOn: FailEvent,
            id: 'Fail',
            activate: () => Effect.fail(new Error('test')),
          }),
          Plugin.make,
        )(),
      ];

      const manager = PluginManager.make({ pluginLoader });
      const activating = yield* Effect.makeLatch(false);
      const activated = yield* Effect.makeLatch(false);
      const error = yield* Effect.makeLatch(false);

      const activationFiber = PubSub.subscribe(manager.activation).pipe(
        Effect.flatMap((queue) =>
          Queue.take(queue).pipe(
            Effect.flatMap(({ state }) =>
              Match.value(state).pipe(
                Match.when('activating', () => activating.open),
                Match.when('activated', () => activated.open),
                Match.when('error', () => error.open),
                Match.orElse(() => Effect.succeed(undefined)),
              ),
            ),
            Effect.forever,
          ),
        ),
        Effect.scoped,
        Effect.runFork,
      );

      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      yield* activating.await;
      yield* activated.await;

      const activating2 = yield* Effect.makeLatch(false);
      const activationFiber2 = PubSub.subscribe(manager.activation).pipe(
        Effect.flatMap((queue) =>
          Queue.take(queue).pipe(
            Effect.flatMap(({ state }) =>
              Match.value(state).pipe(
                Match.when('activating', () => activating2.open),
                Match.orElse(() => Effect.succeed(undefined)),
              ),
            ),
            Effect.forever,
          ),
        ),
        Effect.scoped,
        Effect.runFork,
      );

      yield* manager.activate(FailEvent).pipe(Effect.catchAll(() => Effect.succeed(false)));
      yield* activating2.await;
      yield* error.await;
      yield* Fiber.interrupt(activationFiber);
      yield* Fiber.interrupt(activationFiber2);
    }),
  );

  it.effect('should be able to reset an activation event', () =>
    Effect.gen(function* () {
      let count = 0;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => {
            count++;
            return Effect.succeed(Capability.contributes(String, { string: 'hello' }));
          },
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });

      {
        yield* manager.add(testMeta.profile.key);
        yield* manager.enable(testMeta.profile.key);
        const result = yield* manager.activate(ActivationEvents.Startup);
        assert.isTrue(result);
        assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
        assert.strictEqual(count, 1);
      }

      {
        const result = yield* manager.activate(ActivationEvents.Startup);
        assert.isFalse(result);
      }

      {
        const result = yield* manager.reset(ActivationEvents.Startup);
        assert.isTrue(result);
        assert.strictEqual(count, 2);
      }
    }),
  );

  it.effect('should not fire an unknown event', () =>
    Effect.gen(function* () {
      const manager = PluginManager.make({ pluginLoader });
      const UnknownEvent = ActivationEvent.make('org.dxos.test.unknown');
      const result = yield* manager.activate(UnknownEvent);
      assert.isFalse(result);
    }),
  );

  it.effect('should be able to fire custom activation events', () =>
    Effect.gen(function* () {
      const Plugin1 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin1'), name: 'Plugin 1' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin1',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 1 })]),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin2'), name: 'Plugin 2' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin2',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 2 })]),
        }),
        Plugin.make,
      );
      const Plugin3 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin3'), name: 'Plugin 3' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin3',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 3 })]),
        }),
        Plugin.make,
      );
      const plugin1 = Plugin1();
      const plugin2 = Plugin2();
      const plugin3 = Plugin3();
      plugins = [plugin1, plugin2, plugin3];

      const manager = PluginManager.make({ pluginLoader });
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 0);

      yield* manager.add(Plugin1.meta.profile.key);
      yield* manager.enable(Plugin1.meta.profile.key);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [plugin1.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 1);

      yield* manager.add(Plugin2.meta.profile.key);
      yield* manager.enable(Plugin2.meta.profile.key);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [plugin1.modules[0].id, plugin2.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 2);

      yield* manager.add(Plugin3.meta.profile.key);
      yield* manager.enable(Plugin3.meta.profile.key);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [
        plugin1.modules[0].id,
        plugin2.modules[0].id,
        plugin3.modules[0].id,
      ]);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 3);
    }),
  );

  it.effect('should only activate modules after all activatation events have been fired', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvent.allOf(ActivationEvents.Startup, CountEvent),
          id: 'Hello',
          activate: () => {
            return Effect.succeed(Capability.contributes(String, { string: 'hello' }));
          },
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);

      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);

      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
    }),
  );

  it.effect('should only activate modules once when multiple activatation events have been fired', () =>
    Effect.gen(function* () {
      let count = 0;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvent.oneOf(ActivationEvents.Startup, CountEvent),
          activate: () => {
            count++;
            return Effect.succeed(Capability.contributes(String, { string: 'hello' }));
          },
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.strictEqual(count, 0);

      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      assert.strictEqual(count, 1);

      yield* manager.activate(ActivationEvents.Startup);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      assert.strictEqual(count, 1);
    }),
  );

  it.effect('should be able to disable and re-enable an active plugin', () =>
    Effect.gen(function* () {
      const state = { total: 0 };
      const computeTotal = (capabilityManager: CapabilityManager.CapabilityManager) => {
        const numbers = capabilityManager.getAll(Number);
        state.total = numbers.reduce((acc: number, n: { number: number }) => acc + n.number, 0);
      };

      const Count = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.count'), name: 'Count' })).pipe(
        Plugin.addModule({
          id: 'Count',
          activatesOn: ActivationEvents.Startup,
          firesBeforeActivation: [CountEvent],
          activate: Effect.fnUntraced(function* () {
            const capabilityManager = yield* Capability.Service;
            computeTotal(capabilityManager);
            return Capability.contributes(Total, state);
          }),
        }),
        Plugin.make,
      );

      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Test1',
          activate: () => Effect.succeed(Capability.contributes(Number, { number: 1 })),
        }),
        Plugin.addModule({
          id: 'Test2',
          activatesOn: CountEvent,
          activate: () => Effect.succeed(Capability.contributes(Number, { number: 2 })),
        }),
        Plugin.addModule({
          id: 'Test3',
          activatesOn: CountEvent,
          activate: () => Effect.succeed(Capability.contributes(Number, { number: 3 })),
        }),
        Plugin.make,
      );
      const countPlugin = Count();
      const testPlugin = Test();
      plugins = [countPlugin, testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      {
        yield* manager.add(Test.meta.profile.key);
        yield* manager.enable(Test.meta.profile.key);
        yield* manager.add(Count.meta.profile.key);
        yield* manager.enable(Count.meta.profile.key);
        yield* manager.activate(ActivationEvents.Startup);
        assert.deepStrictEqual(manager.getActive(), [
          ...testPlugin.modules.map((m) => m.id),
          countPlugin.modules[0].id,
        ]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.capabilities.getAll(Total);
        assert.strictEqual(totals.length, 1);
        assert.strictEqual(totals[0].total, 6);
      }

      {
        yield* manager.disable(Test.meta.profile.key);
        assert.deepStrictEqual(manager.getActive(), [countPlugin.modules[0].id]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.capabilities.getAll(Total);
        assert.strictEqual(totals.length, 1);
        // Total doesn't change because it is not reactive.
        assert.strictEqual(totals[0].total, 6);
      }

      {
        yield* manager.enable(Test.meta.profile.key);
        assert.deepStrictEqual(manager.getActive(), [
          countPlugin.modules[0].id,
          ...testPlugin.modules.map((m) => m.id),
        ]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.capabilities.getAll(Total);
        assert.strictEqual(totals.length, 1);
        assert.strictEqual(totals[0].total, 6);
      }
    }),
  );

  it.effect('should be reactive', () =>
    Effect.gen(function* () {
      const Plugin1 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin1'), name: 'Plugin 1' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin1',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 1 })]),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin2'), name: 'Plugin 2' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin2',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 2 })]),
        }),
        Plugin.make,
      );
      const Plugin3 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin3'), name: 'Plugin 3' })).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin3',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 3 })]),
        }),
        Plugin.make,
      );
      plugins = [Plugin1(), Plugin2(), Plugin3()];

      const registry = Registry.make();
      const manager = PluginManager.make({ pluginLoader, registry });
      using pluginUpdates = atomCounter(registry, manager.plugins);
      using enabledUpdates = atomCounter(registry, manager.enabled);
      using modulesUpdates = atomCounter(registry, manager.modules);
      using activeUpdates = atomCounter(registry, manager.active);
      using eventsFiredUpdates = atomCounter(registry, manager.eventsFired);
      using pendingResetUpdates = atomCounter(registry, manager.pendingReset);
      assert.strictEqual(pluginUpdates.count, 0);
      assert.strictEqual(enabledUpdates.count, 0);
      assert.strictEqual(modulesUpdates.count, 0);
      assert.strictEqual(activeUpdates.count, 0);
      assert.strictEqual(eventsFiredUpdates.count, 0);
      assert.strictEqual(pendingResetUpdates.count, 0);

      yield* manager.add(Plugin1.meta.profile.key);
      yield* manager.enable(Plugin1.meta.profile.key);
      assert.strictEqual(pluginUpdates.count, 1);
      assert.strictEqual(enabledUpdates.count, 1);
      assert.strictEqual(modulesUpdates.count, 1);
      assert.strictEqual(activeUpdates.count, 0);
      assert.strictEqual(eventsFiredUpdates.count, 0);
      assert.strictEqual(pendingResetUpdates.count, 0);

      yield* manager.activate(CountEvent);
      assert.strictEqual(pluginUpdates.count, 1);
      assert.strictEqual(enabledUpdates.count, 1);
      assert.strictEqual(modulesUpdates.count, 1);
      assert.strictEqual(activeUpdates.count, 1);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 0);

      yield* manager.add(Plugin2.meta.profile.key);
      yield* manager.enable(Plugin2.meta.profile.key);
      assert.strictEqual(pluginUpdates.count, 2);
      assert.strictEqual(enabledUpdates.count, 2);
      assert.strictEqual(modulesUpdates.count, 2);
      assert.strictEqual(activeUpdates.count, 2);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 2);

      yield* manager.activate(CountEvent);
      assert.strictEqual(pluginUpdates.count, 2);
      assert.strictEqual(enabledUpdates.count, 2);
      assert.strictEqual(modulesUpdates.count, 2);
      assert.strictEqual(activeUpdates.count, 2);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 2);

      yield* manager.add(Plugin3.meta.profile.key);
      yield* manager.enable(Plugin3.meta.profile.key);
      assert.strictEqual(pluginUpdates.count, 3);
      assert.strictEqual(enabledUpdates.count, 3);
      assert.strictEqual(modulesUpdates.count, 3);
      assert.strictEqual(activeUpdates.count, 3);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);

      yield* manager.reset(CountEvent);
      assert.strictEqual(pluginUpdates.count, 3);
      assert.strictEqual(enabledUpdates.count, 3);
      assert.strictEqual(modulesUpdates.count, 3);
      // Starts at 3, plus deactivates 3, plus activates 3.
      assert.strictEqual(activeUpdates.count, 9);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);

      yield* manager.disable(Plugin1.meta.profile.key);
      assert.strictEqual(pluginUpdates.count, 3);
      assert.strictEqual(enabledUpdates.count, 4);
      assert.strictEqual(modulesUpdates.count, 4);
      assert.strictEqual(activeUpdates.count, 10);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);

      yield* manager.remove(Plugin1.meta.profile.key);
      assert.strictEqual(pluginUpdates.count, 4);
      assert.strictEqual(enabledUpdates.count, 4);
      assert.strictEqual(modulesUpdates.count, 4);
      assert.strictEqual(activeUpdates.count, 10);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);

      yield* manager.reset(CountEvent);
      assert.strictEqual(pluginUpdates.count, 4);
      assert.strictEqual(enabledUpdates.count, 4);
      assert.strictEqual(modulesUpdates.count, 4);
      // Starts at 10, plus deactivates 2, plus activates 2.
      assert.strictEqual(activeUpdates.count, 14);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);
    }),
  );

  it.effect('should log a warning when a module takes too long to activate', () =>
    Effect.gen(function* () {
      const capturedWarnings: LogEntry[] = [];
      const removeProcessor = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
        if (entry.level === LogLevel.WARN) {
          capturedWarnings.push(entry);
        }
      });

      const SlowEvent = ActivationEvent.make('org.dxos.test.slow');
      const SlowPlugin = Plugin.define(
        Plugin.makeMeta({ key: DXN.make('org.dxos.test.slowPlugin'), name: 'Slow Plugin' }),
      ).pipe(
        Plugin.addModule({
          id: 'SlowModule',
          activatesOn: SlowEvent,
          activate: Effect.fnUntraced(function* () {
            // Simulate a slow activation that takes 15 seconds.
            yield* Effect.sleep(Duration.seconds(15));
            return Capability.contributes(String, { string: 'slow' });
          }),
        }),
        Plugin.make,
      );

      const slowPlugin = SlowPlugin();
      plugins = [slowPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(SlowPlugin.meta.profile.key);
      yield* manager.enable(SlowPlugin.meta.profile.key);

      // Fork the activation so we can control time with TestClock.
      const activationFiber = yield* Effect.fork(manager.activate(SlowEvent));

      // Advance time past the 10 second warning threshold.
      yield* TestClock.adjust(Duration.seconds(11));

      // Check that the warning was logged.
      assert.isTrue(
        capturedWarnings.some((entry) => entry.message?.includes('module is taking a long time to activate')),
        'Expected a warning about slow module activation',
      );

      // Advance time to let the module finish activating.
      yield* TestClock.adjust(Duration.seconds(5));
      yield* Fiber.join(activationFiber);

      removeProcessor();
    }),
  );

  it.effect('should prevent concurrent loads of the same module via semaphore', () =>
    Effect.gen(function* () {
      // Two different events that both can trigger the same module.
      const EventA = ActivationEvent.make('org.dxos.test.eventA');
      const EventB = ActivationEvent.make('org.dxos.test.eventB');

      let activateCallCount = 0;
      const ConcurrentPlugin = Plugin.define(
        Plugin.makeMeta({
          key: DXN.make('org.dxos.test.concurrentPlugin'),
          name: 'Concurrent Plugin',
        }),
      ).pipe(
        Plugin.addModule({
          id: 'ConcurrentModule',
          // Module activates on either event - this allows two different events to race.
          activatesOn: ActivationEvent.oneOf(EventA, EventB),
          activate: Effect.fnUntraced(function* () {
            activateCallCount++;
            // Simulate slow activation to create window for race condition.
            yield* Effect.sleep(Duration.seconds(5));
            return Capability.contributes(String, { string: 'concurrent' });
          }),
        }),
        Plugin.make,
      );

      const concurrentPlugin = ConcurrentPlugin();
      plugins = [concurrentPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(ConcurrentPlugin.meta.profile.key);
      yield* manager.enable(ConcurrentPlugin.meta.profile.key);

      // Fork two concurrent activations with DIFFERENT events.
      // Both events trigger the same module, so both will try to call _loadModule.
      // Without the semaphore, both would start loading the same module.
      const fiber1 = yield* Effect.fork(manager.activate(EventA));
      const fiber2 = yield* Effect.fork(manager.activate(EventB));

      // Advance time to let both activations complete.
      yield* TestClock.adjust(Duration.seconds(6));

      yield* Fiber.join(fiber1);
      yield* Fiber.join(fiber2);

      // The semaphore should ensure the module's activate function is only called once,
      // even when two different events race to load the same module.
      assert.strictEqual(activateCallCount, 1, 'module activate should only be called once due to semaphore');

      // Verify the capability was contributed.
      const strings = manager.capabilities.getAll(String);
      assert.isTrue(strings.length >= 1, 'capability should be contributed');
      assert.strictEqual(strings[0].string, 'concurrent');
    }),
  );

  it.effect('should deactivate all active modules on shutdown', () =>
    Effect.gen(function* () {
      const Plugin1 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin1'), name: 'Plugin 1' })).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvents.Startup,
          id: 'Plugin1',
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin2'), name: 'Plugin 2' })).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvents.Startup,
          id: 'Plugin2',
          activate: () => Effect.succeed(Capability.contributes(Number, { number: 42 })),
        }),
        Plugin.make,
      );
      const plugin1 = Plugin1();
      const plugin2 = Plugin2();
      plugins = [plugin1, plugin2];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(Plugin1.meta.profile.key);
      yield* manager.enable(Plugin1.meta.profile.key);
      yield* manager.add(Plugin2.meta.profile.key);
      yield* manager.enable(Plugin2.meta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.strictEqual(manager.getActive().length, 2);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 1);

      const result = yield* manager.shutdown();
      assert.isTrue(result);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.strictEqual(manager.capabilities.getAll(Number).length, 0);
    }),
  );

  it.effect('should close module scope during deactivation', () =>
    Effect.gen(function* () {
      let scopeClosed = false;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'WithScope',
          activatesOn: ActivationEvents.Startup,
          activate: () =>
            Effect.gen(function* () {
              const scope = yield* Scope.Scope;
              yield* Scope.addFinalizer(
                scope,
                Effect.sync(() => {
                  scopeClosed = true;
                }),
              );
              return Capability.contributes(String, { string: 'hello' });
            }),
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.isFalse(scopeClosed);

      yield* manager.shutdown();
      assert.isTrue(scopeClosed);
    }),
  );

  it.effect('should run capability deactivate hooks during shutdown', () =>
    Effect.gen(function* () {
      let deactivated = false;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'WithDeactivate',
          activatesOn: ActivationEvents.Startup,
          activate: () =>
            Effect.succeed(
              Capability.contributes(String, { string: 'hello' }, () =>
                Effect.sync(() => {
                  deactivated = true;
                }),
              ),
            ),
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.isFalse(deactivated);

      yield* manager.shutdown();
      assert.isTrue(deactivated);
    }),
  );

  it.effect('should deactivate modules in reverse activation order during shutdown', () =>
    Effect.gen(function* () {
      const deactivationOrder: string[] = [];
      const Plugin1 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin1'), name: 'Plugin 1' })).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvents.Startup,
          id: 'First',
          activate: () =>
            Effect.succeed(
              Capability.contributes(String, { string: 'first' }, () =>
                Effect.sync(() => {
                  deactivationOrder.push('First');
                }),
              ),
            ),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.plugin2'), name: 'Plugin 2' })).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvents.Startup,
          id: 'Second',
          activate: () =>
            Effect.succeed(
              Capability.contributes(Number, { number: 2 }, () =>
                Effect.sync(() => {
                  deactivationOrder.push('Second');
                }),
              ),
            ),
        }),
        Plugin.make,
      );
      plugins = [Plugin1(), Plugin2()];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(Plugin1.meta.profile.key);
      yield* manager.enable(Plugin1.meta.profile.key);
      yield* manager.add(Plugin2.meta.profile.key);
      yield* manager.enable(Plugin2.meta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);

      yield* manager.shutdown();
      assert.deepStrictEqual(deactivationOrder, ['Second', 'First']);
    }),
  );

  it.effect('should clear lifecycle bookkeeping during shutdown', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.isTrue(manager.getEventsFired().length > 0);

      yield* manager.shutdown();
      assert.deepStrictEqual(manager.getEventsFired(), []);
      assert.deepStrictEqual(manager.getPendingReset(), []);
      assert.deepStrictEqual(manager.getActive(), []);
    }),
  );

  it.effect('should interrupt in-flight activation during shutdown', () =>
    Effect.gen(function* () {
      const activationStarted = yield* Effect.makeLatch(false);
      const allowActivationToComplete = yield* Effect.makeLatch(false);
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () =>
            Effect.gen(function* () {
              yield* activationStarted.open;
              yield* allowActivationToComplete.await;
              return Capability.contributes(String, { string: 'hello' });
            }),
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);

      const activationFiber = yield* Effect.fork(manager.activate(ActivationEvents.Startup));
      yield* activationStarted.await;

      const shutdownFiber = yield* Effect.fork(manager.shutdown());
      yield* allowActivationToComplete.open;

      const shutdownResult = yield* Fiber.join(shutdownFiber);
      const activationExit = yield* Fiber.await(activationFiber);

      assert.isTrue(shutdownResult);
      assert.isTrue(Exit.isFailure(activationExit));
      if (Exit.isFailure(activationExit)) {
        assert.isTrue(Cause.isInterruptedOnly(activationExit.cause));
      }
      assert.strictEqual(manager.capabilities.getAll(String).length, 0);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.deepStrictEqual(manager.getEventsFired(), []);
    }),
  );

  it.effect('should preserve plugins, core, enabled, and modules after shutdown', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);

      const pluginsBefore = manager.getPlugins();
      const coreBefore = manager.getCore();
      const enabledBefore = manager.getEnabled();
      const modulesBefore = manager.getModules();

      yield* manager.shutdown();

      assert.deepStrictEqual(manager.getPlugins(), pluginsBefore);
      assert.deepStrictEqual(manager.getCore(), coreBefore);
      assert.deepStrictEqual(manager.getEnabled(), enabledBefore);
      assert.deepStrictEqual(manager.getModules(), modulesBefore);
    }),
  );

  it.effect('should allow re-activation after shutdown', () =>
    Effect.gen(function* () {
      let activateCount = 0;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvents.Startup,
          activate: () => {
            activateCount++;
            return Effect.succeed(Capability.contributes(String, { string: 'hello' }));
          },
        }),
        Plugin.make,
      );
      const testPlugin = Test();
      plugins = [testPlugin];

      const manager = PluginManager.make({ pluginLoader });
      yield* manager.add(testMeta.profile.key);
      yield* manager.enable(testMeta.profile.key);
      yield* manager.activate(ActivationEvents.Startup);
      assert.strictEqual(activateCount, 1);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);

      yield* manager.shutdown();
      assert.deepStrictEqual(manager.getActive(), []);

      yield* manager.activate(ActivationEvents.Startup);
      assert.strictEqual(activateCount, 2);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.capabilities.getAll(String).length, 1);
    }),
  );

  describe('Plugin.lazy', () => {
    const lazyMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.lazy'), name: 'Lazy' });

    it('exposes meta synchronously without invoking the loader', () => {
      let loaderCalls = 0;
      const Real = Plugin.make(Plugin.define<void>(lazyMeta));
      const LazyTest = Plugin.lazy(lazyMeta, () => {
        loaderCalls++;
        return Promise.resolve({ default: Real });
      });

      assert.strictEqual(LazyTest.meta.profile.key, lazyMeta.profile.key);
      assert.strictEqual(LazyTest.meta.profile.name, 'Lazy');
      assert.strictEqual(loaderCalls, 0);

      const stub = LazyTest();
      assert.strictEqual(stub.meta.profile.key, lazyMeta.profile.key);
      assert.deepStrictEqual([...stub.modules], []);
      assert.isTrue(Plugin.isLazy(stub));
      assert.strictEqual(loaderCalls, 0);
    });

    it.effect('resolves the loader on enable and registers the real plugin modules', () =>
      Effect.gen(function* () {
        let loaderCalls = 0;
        const Real = Plugin.define(lazyMeta).pipe(
          Plugin.addModule({
            id: 'Hello',
            activatesOn: ActivationEvents.Startup,
            activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
          }),
          Plugin.make,
        );
        const LazyTest = Plugin.lazy(lazyMeta, () => {
          loaderCalls++;
          return Promise.resolve({ default: Real });
        });

        const lazyStub = LazyTest();
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        yield* manager.add(lazyMeta.profile.key);
        // Loader has not been invoked yet — only meta is exposed.
        assert.strictEqual(loaderCalls, 0);
        assert.deepStrictEqual(manager.getModules(), []);

        yield* manager.enable(lazyMeta.profile.key);
        assert.strictEqual(loaderCalls, 1);
        // After enable the registered plugin should be the real one (not the stub),
        // and its modules should be registered with the manager.
        const registered = manager.getPlugins().find((p) => p.meta.profile.key === lazyMeta.profile.key);
        assert.isDefined(registered);
        assert.isFalse(Plugin.isLazy(registered!));
        assert.strictEqual(registered!.modules.length, 1);

        yield* manager.activate(ActivationEvents.Startup);
        assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      }),
    );

    it.effect('does not invoke the loader if the plugin is never enabled', () =>
      Effect.gen(function* () {
        let loaderCalls = 0;
        const Real = Plugin.make(Plugin.define<void>(lazyMeta));
        const LazyTest = Plugin.lazy(lazyMeta, () => {
          loaderCalls++;
          return Promise.resolve({ default: Real });
        });
        const lazyStub = LazyTest();
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        yield* manager.add(lazyMeta.profile.key);

        // Activate an event that has no listeners — the lazy plugin must not load.
        yield* manager.activate(ActivationEvents.Startup);
        assert.strictEqual(loaderCalls, 0);
      }),
    );

    it.effect('forwards factory options to the real plugin factory', () =>
      Effect.gen(function* () {
        type Opts = { greeting: string };
        const RealFactory = (opts: Opts) =>
          Plugin.define(lazyMeta).pipe(
            Plugin.addModule({
              id: 'Hello',
              activatesOn: ActivationEvents.Startup,
              activate: () => Effect.succeed(Capability.contributes(String, { string: opts.greeting })),
            }),
            Plugin.make,
          )(undefined as void);

        const RealFactoryWithMeta = Object.assign(RealFactory, { meta: lazyMeta });

        const LazyTest = Plugin.lazy<Opts>(lazyMeta, () => Promise.resolve({ default: RealFactoryWithMeta }));
        const lazyStub = LazyTest({ greeting: 'hola' });
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        yield* manager.add(lazyMeta.profile.key);
        yield* manager.enable(lazyMeta.profile.key);
        yield* manager.activate(ActivationEvents.Startup);

        const all = manager.capabilities.getAll(String);
        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].string, 'hola');
      }),
    );

    it.effect('wraps loader rejections in a descriptive error', () =>
      Effect.gen(function* () {
        const LazyTest = Plugin.lazy(lazyMeta, () =>
          Promise.reject<{ default: Plugin.PluginFactory }>(new Error('boom')),
        );
        const lazyStub = LazyTest();
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        yield* manager.add(lazyMeta.profile.key);

        const exit = yield* Effect.exit(manager.enable(lazyMeta.profile.key));
        assert.isTrue(Exit.isFailure(exit));
        if (Exit.isFailure(exit)) {
          const failure = Cause.failureOption(exit.cause);
          assert.isTrue(failure._tag === 'Some');
          if (failure._tag === 'Some') {
            assert.isTrue(Plugin.LazyPluginError.is(failure.value));
            assert.strictEqual((failure.value as Plugin.LazyPluginError).context.id, lazyMeta.profile.key);
            assert.strictEqual((failure.value as Plugin.LazyPluginError).context.reason, 'load-failed');
          }
        }
      }),
    );

    it.effect('publishes a lazy:<id> error message when resolution fails', () =>
      Effect.gen(function* () {
        const LazyTest = Plugin.lazy(lazyMeta, () =>
          Promise.reject<{ default: Plugin.PluginFactory }>(new Error('boom')),
        );
        const lazyStub = LazyTest();
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        // Subscribe first so we don't miss the activating/error pair.
        const queue = yield* PubSub.subscribe(manager.activation);
        yield* manager.add(lazyMeta.profile.key);
        yield* Effect.exit(manager.enable(lazyMeta.profile.key));
        const messages = yield* Queue.takeAll(queue);

        const errorMessage = [...messages].find(
          (m) => m.module === `lazy:${lazyMeta.profile.key}` && m.state === 'error',
        );
        assert.isDefined(errorMessage);
        assert.isDefined(errorMessage!.error);
      }).pipe(Effect.scoped),
    );

    it.effect('coalesces concurrent lazy resolutions of the same plugin id', () =>
      Effect.gen(function* () {
        let factoryCalls = 0;
        // System-tagged so the constructor's core derivation picks it up,
        // forcing an implicit enable that races the explicit one below.
        const coreLazyMeta = { ...lazyMeta, tags: ['system'] };
        const Real = (() => {
          const inner = Plugin.make(
            Plugin.define<void>(coreLazyMeta).pipe(
              Plugin.addModule({
                id: 'Hello',
                activatesOn: ActivationEvents.Startup,
                activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
              }),
            ),
          );
          const factory = (() => {
            factoryCalls++;
            return inner();
          }) as Plugin.PluginFactory;
          return Object.assign(factory, { meta: coreLazyMeta });
        })();
        const LazyTest = Plugin.lazy(coreLazyMeta, () => Promise.resolve({ default: Real }));
        const lazyStub = LazyTest();
        // `manager.enable(id)` is implicitly called twice — once from the
        // constructor's core/enabled chain, once from our explicit call. With
        // coalescing, the underlying factory should still run exactly once.
        plugins = [lazyStub];
        const manager = PluginManager.make({ pluginLoader, plugins });
        yield* manager.enable(coreLazyMeta.profile.key);
        assert.strictEqual(factoryCalls, 1);
      }),
    );

    it.effect('fails with a tagged error when the factory output is not a Plugin', () =>
      Effect.gen(function* () {
        const BadFactory = Object.assign(() => ({ not: 'a plugin' }) as any, { meta: lazyMeta });
        const LazyTest = Plugin.lazy(lazyMeta, () => Promise.resolve({ default: BadFactory }));
        const lazyStub = LazyTest();
        plugins = [lazyStub];

        const manager = PluginManager.make({ pluginLoader });
        yield* manager.add(lazyMeta.profile.key);

        const exit = yield* Effect.exit(manager.enable(lazyMeta.profile.key));
        assert.isTrue(Exit.isFailure(exit));
        if (Exit.isFailure(exit)) {
          const failure = Cause.failureOption(exit.cause);
          assert.isTrue(failure._tag === 'Some');
          if (failure._tag === 'Some') {
            assert.isTrue(Plugin.LazyPluginError.is(failure.value));
            assert.strictEqual((failure.value as Plugin.LazyPluginError).context.reason, 'invalid-plugin');
          }
        }
      }),
    );
  });

  describe('timeouts and failure tracking', () => {
    // Atom subscriptions fire synchronously when the registry's `_set` runs,
    // even from a forked fiber on the default runtime. Wrapping in
    // `Effect.async` lets a TestClock-driven test wait for state produced by
    // a background `_runForkedFiber` (e.g. the auto-disable triggered when a
    // module activation times out) without relying on real-time `sleep`.
    const waitFor = <T>(registry: Registry.Registry, atom: Atom.Atom<T>, predicate: (value: T) => boolean) =>
      Effect.async<void>((resume) => {
        if (predicate(registry.get(atom))) {
          resume(Effect.void);
          return;
        }
        let resolved = false;
        const dispose = registry.subscribe(atom, () => {
          if (!resolved && predicate(registry.get(atom))) {
            resolved = true;
            dispose();
            resume(Effect.void);
          }
        });
        return Effect.sync(() => {
          if (!resolved) {
            dispose();
          }
        });
      });

    it.effect('records and auto-disables a plugin whose module exceeds the activation timeout', () =>
      Effect.gen(function* () {
        const SlowEvent = ActivationEvent.make('org.dxos.test.activationTimeout');
        const SlowPlugin = Plugin.define(
          Plugin.makeMeta({
            key: DXN.make('org.dxos.test.slowActivation'),
            name: 'Slow Activation',
          }),
        ).pipe(
          Plugin.addModule({
            id: 'Slow',
            activatesOn: SlowEvent,
            activate: Effect.fnUntraced(function* () {
              yield* Effect.sleep(Duration.seconds(60));
              return Capability.contributes(String, { string: 'never' });
            }),
          }),
          Plugin.make,
        );
        plugins = [SlowPlugin()];

        const registry = Registry.make();
        const manager = PluginManager.make({
          pluginLoader,
          registry,
          activationTimeout: Duration.seconds(2),
        });
        yield* manager.add(SlowPlugin.meta.profile.key);
        yield* manager.enable(SlowPlugin.meta.profile.key);

        const fiber = yield* Effect.fork(manager.activate(SlowEvent));
        // Push past the 2s activation timeout. The forked module fiber is on
        // TestClock too, so the timeout fires deterministically.
        yield* TestClock.adjust(Duration.seconds(3));
        const exit = yield* Fiber.await(fiber);
        assert.isTrue(Exit.isFailure(exit));

        const failed = manager.getFailed();
        assert.strictEqual(failed.length, 1);
        assert.strictEqual(failed[0].id, SlowPlugin.meta.profile.key);
        assert.strictEqual(failed[0].phase, 'activation');
        assert.strictEqual(failed[0].reason, 'timeout');

        // Auto-disable runs in a forked fiber on the default runtime; wait for
        // the `enabled` atom to settle to the disabled state.
        yield* waitFor(registry, manager.enabled, (ids) => !ids.includes(SlowPlugin.meta.profile.key));
        assert.deepStrictEqual(manager.getEnabled(), []);
      }),
    );

    it.effect('records and auto-disables a lazy plugin whose loader exceeds the load timeout', () =>
      Effect.gen(function* () {
        const lazyMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.slowLoad'), name: 'Slow Load' });
        // The dynamic import never resolves; the manager's load timeout should
        // surface this as a `LazyPluginError` whose `cause` is `PluginTimeoutError`.
        const LazyTest = Plugin.lazy(lazyMeta, () => new Promise<{ default: Plugin.PluginFactory }>(() => {}));
        plugins = [LazyTest()];

        const registry = Registry.make();
        const manager = PluginManager.make({
          pluginLoader,
          registry,
          loadTimeout: Duration.seconds(1),
        });
        yield* manager.add(lazyMeta.profile.key);

        const enableFiber = yield* Effect.fork(manager.enable(lazyMeta.profile.key));
        yield* TestClock.adjust(Duration.seconds(2));
        const exit = yield* Fiber.await(enableFiber);
        assert.isTrue(Exit.isFailure(exit));

        // The wrapped `LazyPluginError` carries the timeout error as its cause.
        if (Exit.isFailure(exit)) {
          const failure = Cause.failureOption(exit.cause);
          if (failure._tag === 'Some') {
            assert.isTrue(Plugin.LazyPluginError.is(failure.value));
            const lazyError = failure.value as Plugin.LazyPluginError;
            assert.isTrue(PluginManager.PluginTimeoutError.is(lazyError.cause as Error));
          }
        }

        const failed = manager.getFailed();
        assert.strictEqual(failed.length, 1);
        assert.strictEqual(failed[0].id, lazyMeta.profile.key);
        assert.strictEqual(failed[0].phase, 'load');
        assert.strictEqual(failed[0].reason, 'timeout');

        // The plugin was added to `enabled` before the lazy resolution failed,
        // so the auto-disable fork should clear it.
        yield* waitFor(registry, manager.enabled, (ids) => !ids.includes(lazyMeta.profile.key));
      }),
    );

    it.effect('records non-timeout activation errors as reason: error', () =>
      Effect.gen(function* () {
        const FailingEvent = ActivationEvent.make('org.dxos.test.activationError');
        const FailingPlugin = Plugin.define(
          Plugin.makeMeta({ key: DXN.make('org.dxos.test.failing'), name: 'Failing' }),
        ).pipe(
          Plugin.addModule({
            id: 'Boom',
            activatesOn: FailingEvent,
            activate: () => Effect.fail(new Error('boom')),
          }),
          Plugin.make,
        );
        plugins = [FailingPlugin()];

        const registry = Registry.make();
        const manager = PluginManager.make({ pluginLoader, registry });
        yield* manager.add(FailingPlugin.meta.profile.key);
        yield* manager.enable(FailingPlugin.meta.profile.key);

        const exit = yield* Effect.exit(manager.activate(FailingEvent));
        assert.isTrue(Exit.isFailure(exit));

        const failed = manager.getFailed();
        assert.strictEqual(failed.length, 1);
        assert.strictEqual(failed[0].reason, 'error');
        assert.strictEqual(failed[0].error.message, 'boom');

        yield* waitFor(registry, manager.enabled, (ids) => !ids.includes(FailingPlugin.meta.profile.key));
      }),
    );

    it.effect('does not auto-disable a core plugin even though the failure is recorded', () =>
      Effect.gen(function* () {
        const FailingEvent = ActivationEvent.make('org.dxos.test.coreFail');
        const CorePlugin = Plugin.define(
          Plugin.makeMeta({ key: DXN.make('org.dxos.test.core'), name: 'Core', tags: ['system'] }),
        ).pipe(
          Plugin.addModule({
            id: 'Boom',
            activatesOn: FailingEvent,
            activate: () => Effect.fail(new Error('boom')),
          }),
          Plugin.make,
        );
        const corePlugin = CorePlugin();
        plugins = [corePlugin];

        const manager = PluginManager.make({
          pluginLoader,
          plugins: [corePlugin],
        });
        // Core is auto-enabled via the constructor's enable chain.
        const exit = yield* Effect.exit(manager.activate(FailingEvent));
        assert.isTrue(Exit.isFailure(exit));

        assert.strictEqual(manager.getFailed().length, 1);
        // Core stays enabled; host opted into it being non-removable.
        assert.deepStrictEqual(manager.getEnabled(), [corePlugin.meta.profile.key]);
      }),
    );

    it.effect('clearFailure removes the failure record and re-enable starts fresh', () =>
      Effect.gen(function* () {
        let shouldFail = true;
        const Event = ActivationEvent.make('org.dxos.test.flaky');
        const FlakyPlugin = Plugin.define(
          Plugin.makeMeta({ key: DXN.make('org.dxos.test.flaky'), name: 'Flaky' }),
        ).pipe(
          Plugin.addModule({
            id: 'Maybe',
            activatesOn: Event,
            activate: () =>
              shouldFail
                ? Effect.fail(new Error('first try'))
                : Effect.succeed(Capability.contributes(String, { string: 'ok' })),
          }),
          Plugin.make,
        );
        const flakyPlugin = FlakyPlugin();
        plugins = [flakyPlugin];

        const registry = Registry.make();
        const manager = PluginManager.make({ pluginLoader, registry });
        yield* manager.add(flakyPlugin.meta.profile.key);
        yield* manager.enable(flakyPlugin.meta.profile.key);

        yield* Effect.exit(manager.activate(Event));
        assert.strictEqual(manager.getFailed().length, 1);
        yield* waitFor(registry, manager.enabled, (ids) => !ids.includes(flakyPlugin.meta.profile.key));

        // Calling `enable` again clears the prior failure record before
        // attempting resolution; verify the explicit API does too.
        assert.isTrue(manager.clearFailure(flakyPlugin.meta.profile.key));
        assert.strictEqual(manager.getFailed().length, 0);
        assert.isFalse(manager.clearFailure(flakyPlugin.meta.profile.key));

        // Retry: enable + reset the activation event so the module re-runs.
        shouldFail = false;
        yield* manager.enable(flakyPlugin.meta.profile.key);
        yield* manager.reset(Event);
        assert.strictEqual(manager.getFailed().length, 0);
        assert.strictEqual(manager.capabilities.getAll(String).length, 1);
      }),
    );
  });

  describe('plugin dependencies (dependsOn)', () => {
    // Build a small plugin with a `dependsOn` chain. The helper keeps each test
    // focused on the dependency semantics rather than module wiring.
    // These dependency-graph tests use short opaque ids (`'a'`, `'coreClient'`,
    // `'org.dxos.missing'`) as graph keys rather than real DXNs. `id`/`dependsOn` are
    const makePlugin = (id: string, dependsOn?: string[], tags?: string[]) =>
      Plugin.make(
        Plugin.define({
          profile: {
            key: id,
            name: id,
            dependsOn,
            tags,
          },
        }),
      )();

    it.effect('enable resolves the transitive closure in dependency-first order', () =>
      Effect.gen(function* () {
        const a = makePlugin('a');
        const b = makePlugin('b', ['a']);
        const c = makePlugin('c', ['b']);
        const manager = PluginManager.make({ plugins: [a, b, c], pluginLoader });

        const ok = yield* manager.enable('c');
        assert.isTrue(ok);
        // `a` enables first, then `b`, then `c`.
        assert.deepStrictEqual(manager.getEnabled(), ['a', 'b', 'c']);
      }),
    );

    it.effect('enable is idempotent when dependencies are already enabled', () =>
      Effect.gen(function* () {
        const a = makePlugin('a');
        const b = makePlugin('b', ['a']);
        const manager = PluginManager.make({ plugins: [a, b], pluginLoader });

        yield* manager.enable('a');
        yield* manager.enable('b');
        assert.deepStrictEqual(manager.getEnabled(), ['a', 'b']);
        // Re-enabling shouldn't duplicate entries.
        yield* manager.enable('b');
        assert.deepStrictEqual(manager.getEnabled(), ['a', 'b']);
      }),
    );

    it.effect('enable with a missing declared dependency records a PluginDependencyError', () =>
      Effect.gen(function* () {
        const dependent = makePlugin('dependent', ['org.dxos.missing']);
        const manager = PluginManager.make({ plugins: [dependent], pluginLoader });

        const ok = yield* manager.enable('dependent');
        assert.isFalse(ok);
        assert.deepStrictEqual(manager.getEnabled(), []);
        const failures = manager.getFailed();
        assert.strictEqual(failures.length, 1);
        assert.strictEqual(failures[0].id, 'dependent');
        assert.instanceOf(failures[0].error, Plugin.PluginDependencyError);
      }),
    );

    it.effect('enable detects A↔B cycle and records a cycle failure', () =>
      Effect.gen(function* () {
        const a = makePlugin('a', ['b']);
        const b = makePlugin('b', ['a']);
        const manager = PluginManager.make({ plugins: [a, b], pluginLoader });

        const ok = yield* manager.enable('a');
        assert.isFalse(ok);
        assert.deepStrictEqual(manager.getEnabled(), []);
        const failures = manager.getFailed();
        assert.strictEqual(failures.length, 1);
        assert.instanceOf(failures[0].error, Plugin.PluginDependencyError);
      }),
    );

    it.effect('enable with resolveDependencies: false skips closure walk and missing-dep check', () =>
      Effect.gen(function* () {
        // Dependent declares a dep that is intentionally unregistered — the
        // caller has accepted responsibility for satisfying it some other way.
        const dependent = makePlugin('dependent', ['org.dxos.alt-impl']);
        const manager = PluginManager.make({ plugins: [dependent], pluginLoader });

        const ok = yield* manager.enable('dependent', { resolveDependencies: false });
        assert.isTrue(ok);
        assert.deepStrictEqual(manager.getEnabled(), ['dependent']);
        assert.strictEqual(manager.getFailed().length, 0);
      }),
    );

    it.effect('disable cascades to transitive dependents by default', () =>
      Effect.gen(function* () {
        const a = makePlugin('a');
        const b = makePlugin('b', ['a']);
        const c = makePlugin('c', ['b']);
        const manager = PluginManager.make({ plugins: [a, b, c], pluginLoader });

        yield* manager.enable('c');
        assert.deepStrictEqual(manager.getEnabled(), ['a', 'b', 'c']);

        const ok = yield* manager.disable('a');
        assert.isTrue(ok);
        // Cascade tears down `c` (leaf) and `b` before `a`.
        assert.deepStrictEqual(manager.getEnabled(), []);
      }),
    );

    it.effect('default disable refuses when a transitive dependent is core', () =>
      Effect.gen(function* () {
        const lib = makePlugin('lib');
        const coreClient = makePlugin('coreClient', ['lib'], ['system']);
        const manager = PluginManager.make({
          plugins: [lib, coreClient],
          enabled: ['lib'],
          pluginLoader,
        });

        const exit = yield* Effect.exit(manager.disable('lib'));
        assert.isTrue(Exit.isFailure(exit));
        // No state mutation when cascade is refused for a core dependent.
        assert.isTrue(manager.getEnabled().includes('lib'));
        assert.isTrue(manager.getEnabled().includes('coreClient'));
      }),
    );

    it.effect('disable with cascade: false disables only the target', () =>
      Effect.gen(function* () {
        const a = makePlugin('a');
        const b = makePlugin('b', ['a']);
        const manager = PluginManager.make({ plugins: [a, b], pluginLoader });

        yield* manager.enable('b');
        const ok = yield* manager.disable('a', { cascade: false });
        assert.isTrue(ok);
        // `b` is left enabled-but-broken (no `a` to satisfy its declared dep).
        assert.deepStrictEqual(manager.getEnabled(), ['b']);
      }),
    );

    it.effect('getDependencies and getDependents reflect the declared graph', () =>
      Effect.gen(function* () {
        const a = makePlugin('a');
        const b = makePlugin('b', ['a']);
        const c = makePlugin('c', ['b']);
        const manager = PluginManager.make({ plugins: [a, b, c], pluginLoader });

        assert.deepStrictEqual([...manager.getDependencies('c', { transitive: false })], ['b']);
        assert.deepStrictEqual([...manager.getDependencies('c', { transitive: true })], ['a', 'b']);

        assert.deepStrictEqual([...manager.getDependents('a', { transitive: false })], ['b']);
        assert.deepStrictEqual([...manager.getDependents('a', { transitive: true })], ['c', 'b']);

        yield* manager.enable('b');
        assert.deepStrictEqual([...manager.getDependents('a', { transitive: true, enabledOnly: true })], ['b']);
      }),
    );

    it.effect('enable installs a catalog-only dependency via add() before enabling it', () =>
      Effect.gen(function* () {
        // The "remote" plugin is not pre-registered; the loader knows about
        // it, simulating a fetch from the registry.
        const remote = makePlugin('remote');
        const dependent = makePlugin('dependent', ['remote']);
        const remoteLoader = Effect.fn(function* (id: string) {
          if (id === 'remote') {
            return { plugin: remote };
          }
          throw new Error(`Unknown id: ${id}`);
        });

        const registry = Registry.make();
        const manager = PluginManager.make({
          plugins: [dependent],
          pluginLoader: remoteLoader,
          registry,
        });
        // Seed the catalog with the remote entry so the dependency walk can
        // discover it.
        registry.set(manager.pluginRegistry.plugins, {
          entries: [
            {
              profile: { key: 'remote', name: 'Remote' },
              release: { version: 'v0.0.0', moduleUrl: 'about:blank' },
            },
          ],
          loading: false,
          error: null,
        });

        const ok = yield* manager.enable('dependent');
        assert.isTrue(ok);
        assert.deepStrictEqual(manager.getEnabled(), ['remote', 'dependent']);
        assert.isTrue(manager.getPlugins().some((plugin) => plugin.meta.profile.key === 'remote'));
      }),
    );

    it.effect('enable records install-failed when a catalog-only dep fails to load', () =>
      Effect.gen(function* () {
        const dependent = makePlugin('dependent', ['remote-broken']);
        const failingLoader = Effect.fn(function* (_id: string) {
          return yield* Effect.fail(new Error('fetch failed'));
        });

        const registry = Registry.make();
        const manager = PluginManager.make({
          plugins: [dependent],
          pluginLoader: failingLoader,
          registry,
        });
        registry.set(manager.pluginRegistry.plugins, {
          entries: [
            {
              profile: { key: 'remote-broken', name: 'Broken' },
              release: { version: 'v0.0.0', moduleUrl: 'about:blank' },
            },
          ],
          loading: false,
          error: null,
        });

        const ok = yield* manager.enable('dependent');
        assert.isFalse(ok);
        assert.deepStrictEqual(manager.getEnabled(), []);
        const failures = manager.getFailed();
        assert.strictEqual(failures.length, 1);
        assert.strictEqual(failures[0].id, 'dependent');
        assert.instanceOf(failures[0].error, Plugin.PluginDependencyError);
      }),
    );
  });

  describe('capability dependency activation', () => {
    const Widget = Capability.makeMulti<{ widget: string }>('org.dxos.test.widget');

    const startupKey = ActivationEvent.eventKey(ActivationEvent.Startup);

    const makeManagerWith = (...factories: Array<{ (): Plugin.Plugin; meta: Plugin.Meta }>) => {
      const instances = factories.map((factory) => factory());
      return PluginManager.make({
        plugins: instances,
        enabled: instances.map((plugin) => plugin.meta.profile.key),
        pluginLoader,
      });
    };

    it.effect('activates a provider chain in topological order and yields the implementations', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            // Registered consumer-first to prove ordering comes from the graph.
            Plugin.addModule({
              id: 'total',
              requires: [String, Number],
              provides: [Total],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                const { number } = yield* Number;
                return [Capability.provide(Total, { total: string.length + number })];
              }),
            }),
            Plugin.addModule({
              id: 'number',
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                return [Capability.provide(Number, { number: string.length })];
              }),
            }),
            Plugin.addModule({
              id: 'string',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'abc' })]),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const result = yield* manager.start();
        assert.isTrue(result);
        assert.deepStrictEqual(manager.getActive(), [
          'org.dxos.plugin.test.module.string',
          'org.dxos.plugin.test.module.number',
          'org.dxos.plugin.test.module.total',
        ]);
        assert.deepStrictEqual(manager.capabilities.get(Total), { total: 6 });
      }),
    );

    it.effect('activates independent modules in the same wave concurrently', () =>
      Effect.gen(function* () {
        const first = yield* Deferred.make<void>();
        const second = yield* Deferred.make<void>();
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'a',
              provides: [String],
              activate: Effect.fnUntraced(function* () {
                yield* Deferred.succeed(first, undefined);
                // Completes only if the sibling runs concurrently.
                yield* Deferred.await(second);
                return [Capability.provide(String, { string: 'a' })];
              }),
            }),
            Plugin.addModule({
              id: 'b',
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                yield* Deferred.succeed(second, undefined);
                yield* Deferred.await(first);
                return [Capability.provide(Number, { number: 1 })];
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        assert.isTrue(yield* manager.start());
        assert.strictEqual(manager.getActive().length, 2);
      }),
    );

    it.effect('a module with empty provides is a startup root', () =>
      Effect.gen(function* () {
        let activated = false;
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'root',
              provides: [],
              activate: Effect.fnUntraced(function* () {
                activated = true;
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        yield* manager.start();
        assert.isTrue(activated);
        assert.deepStrictEqual(manager.getActive(), ['org.dxos.plugin.test.module.root']);
      }),
    );

    it.effect('fails fast with MissingProviderError when a singleton has no provider', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'consumer',
              requires: [String],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                yield* String;
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const error = yield* Effect.flip(manager.start());
        assert.instanceOf(error, MissingProviderError);
        assert.strictEqual(error.context.capability, String.identifier);
        assert.deepStrictEqual(error.context.requiredBy, ['org.dxos.plugin.test.module.consumer']);
      }),
    );

    it.effect('flags event-gated providers when they cannot satisfy startup', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'consumer',
              requires: [String],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                yield* String;
              }),
            }),
            Plugin.addModule({
              id: 'gated-provider',
              activatesOn: CountEvent,
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'gated' })]),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const error = yield* Effect.flip(manager.start());
        assert.instanceOf(error, MissingProviderError);
        assert.strictEqual(error.context.hint, 'event-gated');
      }),
    );

    it.effect('fails fast with DependencyCycleError on a requires cycle', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'a',
              requires: [Number],
              provides: [String],
              activate: Effect.fnUntraced(function* () {
                yield* Number;
                return [Capability.provide(String, { string: 'a' })];
              }),
            }),
            Plugin.addModule({
              id: 'b',
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                yield* String;
                return [Capability.provide(Number, { number: 1 })];
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const error = yield* Effect.flip(manager.start());
        assert.instanceOf(error, DependencyCycleError);
        const path = error.context.path;
        assert.isArray(path);
        assert.isAbove((path as unknown[]).length, 0);
      }),
    );

    it.effect('fails fast with DuplicateProviderError on two singleton providers', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'a',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'a' })]),
            }),
            Plugin.addModule({
              id: 'b',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'b' })]),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const error = yield* Effect.flip(manager.start());
        assert.instanceOf(error, DuplicateProviderError);
        assert.strictEqual(error.context.capability, String.identifier);
      }),
    );

    it.effect('records ProvidesMismatchError for undeclared contributions', () =>
      Effect.gen(function* () {
        // Authored through the erased ModuleEntry escape hatch: the typed addModule overload
        // rejects this shape at compile time; the runtime validator is the backstop under test.
        const undeclaredEntry: Plugin.ModuleEntry = {
          id: 'undeclared',
          provides: [],
          activate: () => Effect.succeed([Capability.provide(String, { string: 'sneaky' })]),
        };
        const builder = Plugin.define(testMeta);
        builder.addModule(undeclaredEntry);
        const Undeclared = Plugin.make(builder);

        const manager = makeManagerWith(Undeclared);
        assert.isFalse(yield* manager.start());
        const failures = manager.getFailed();
        assert.strictEqual(failures.length, 1);
        assert.instanceOf(failures[0].error, ProvidesMismatchError);
        assert.deepStrictEqual(failures[0].error.context.undeclared, [String.identifier]);
      }),
    );

    it.effect('a conditional provider may skip a declared capability (warn only)', () =>
      Effect.gen(function* () {
        // Erased entry: an always-empty return is a static coverage error (see plugin.test.ts);
        // the runtime warn-only behavior for conditional providers is what is under test.
        const conditionalEntry: Plugin.ModuleEntry = {
          id: 'conditional',
          provides: [String],
          activate: () => Effect.succeed([]),
        };
        const builder = Plugin.define(testMeta);
        builder.addModule(conditionalEntry);
        const Conditional = Plugin.make(builder);

        const manager = makeManagerWith(Conditional);
        assert.isTrue(yield* manager.start());
        assert.deepStrictEqual(manager.getActive(), ['org.dxos.plugin.test.module.conditional']);
        assert.deepStrictEqual(manager.capabilities.getAll(String), []);
      }),
    );

    it.effect('multi capabilities never gate and stay live', () =>
      Effect.gen(function* () {
        let snapshot: readonly { widget: string }[] = [];
        const Consumer = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'consumer',
              requires: [Widget],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                const contributions = yield* Widget;
                snapshot = contributions.get();
              }),
            }),
            Plugin.addModule({
              id: 'provider',
              provides: [Widget],
              activate: () =>
                Effect.succeed([Capability.provideAll(Widget, [{ widget: 'one' }, { widget: 'two' }])]),
            }),
          ),
        );

        const manager = makeManagerWith(Consumer);
        assert.isTrue(yield* manager.start());
        // Soft ordering: the same-pass provider activated first, so the snapshot saw it.
        assert.deepStrictEqual(snapshot, [{ widget: 'one' }, { widget: 'two' }]);

        // The collection is live: later contributions appear without reactivation.
        manager.capabilities.contribute({ module: 'external', interface: Widget, implementation: { widget: 'three' } });
        assert.strictEqual(manager.capabilities.contributions(Widget).get().length, 3);
      }),
    );

    it.effect('a multi consumer activates with an empty collection when no providers exist', () =>
      Effect.gen(function* () {
        let count = -1;
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'consumer',
              requires: [Widget],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                const contributions = yield* Widget;
                count = contributions.get().length;
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        assert.isTrue(yield* manager.start());
        assert.strictEqual(count, 0);
      }),
    );

    it.effect('event-mode modules activate on their event and pull inactive providers on demand', () =>
      Effect.gen(function* () {
        let received: string | undefined;
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'provider',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'pulled' })]),
            }),
            Plugin.addModule({
              id: 'listener',
              activatesOn: CountEvent,
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                received = string;
                return [Capability.provide(Number, { number: string.length })];
              }),
            }),
          ),
        );

        const instance = Test();
        const manager = PluginManager.make({ plugins: [instance], enabled: [testMeta.profile.key], pluginLoader });
        // Not started: the event pulls the provider on demand without a startup pass.
        yield* manager.activate(CountEvent);
        assert.strictEqual(received, 'pulled');
        assert.deepStrictEqual(manager.capabilities.get(Number), { number: 6 });
        // Both the pulled provider and the listener are active.
        assert.includeMembers([...manager.getActive()], [
          'org.dxos.plugin.test.module.provider',
          'org.dxos.plugin.test.module.listener',
        ]);
      }),
    );

    it.effect('event-mode provides satisfy later on-demand requires but not startup', () =>
      Effect.gen(function* () {
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'gated-provider',
              activatesOn: CountEvent,
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'gated' })]),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        yield* manager.start();
        assert.deepStrictEqual(manager.getActive(), []);
        yield* manager.activate(CountEvent);
        assert.deepStrictEqual(manager.capabilities.get(String), { string: 'gated' });
      }),
    );

    it.effect('bridges a migrated consumer to a legacy provider via waitFor', () =>
      Effect.gen(function* () {
        let received: string | undefined;
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'legacy-provider',
              activatesOn: ActivationEvents.Startup,
              activate: () => Effect.succeed(Capability.contributes(String, { string: 'legacy' })),
            }),
            Plugin.addModule({
              id: 'migrated-consumer',
              requires: [String],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                received = string;
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        assert.isTrue(yield* manager.start());
        assert.strictEqual(received, 'legacy');
      }),
    );

    it.effect('fires compatFires events after a dependency module activates', () =>
      Effect.gen(function* () {
        const CompatEvent = ActivationEvent.make('org.dxos.test.compat');
        const order: string[] = [];
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'migrated',
              provides: [String],
              compatFires: [CompatEvent],
              activate: Effect.fnUntraced(function* () {
                order.push('migrated');
                return [Capability.provide(String, { string: 'migrated' })];
              }),
            }),
            Plugin.addModule({
              id: 'legacy-listener',
              activatesOn: CompatEvent,
              activate: Effect.fnUntraced(function* () {
                order.push('legacy-listener');
              }),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        assert.isTrue(yield* manager.start());
        assert.deepStrictEqual(order, ['migrated', 'legacy-listener']);
      }),
    );

    it.effect('enable after start runs an incremental dependency pass', () =>
      Effect.gen(function* () {
        const Provider = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'provider',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'base' })]),
            }),
          ),
        );
        const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.late'), name: 'Late' });
        const Late = Plugin.make(
          Plugin.define(lateMeta).pipe(
            Plugin.addModule({
              id: 'late-consumer',
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                return [Capability.provide(Number, { number: string.length })];
              }),
            }),
          ),
        );

        const providerInstance = Provider();
        const lateInstance = Late();
        plugins = [providerInstance, lateInstance];
        const manager = PluginManager.make({
          plugins: [providerInstance],
          enabled: [testMeta.profile.key],
          pluginLoader,
        });
        yield* manager.start();
        assert.deepStrictEqual(manager.getActive(), ['org.dxos.plugin.test.module.provider']);

        yield* manager.add(lateMeta.profile.key);
        yield* manager.enable(lateMeta.profile.key);
        assert.deepStrictEqual(manager.capabilities.get(Number), { number: 4 });
      }),
    );

    it.effect('enable after start with a missing provider fails only that plugin', () =>
      Effect.gen(function* () {
        const Base = Plugin.make(Plugin.define(testMeta));
        const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.late'), name: 'Late' });
        const Late = Plugin.make(
          Plugin.define(lateMeta).pipe(
            Plugin.addModule({
              id: 'late-consumer',
              requires: [String],
              provides: [],
              activate: Effect.fnUntraced(function* () {
                yield* String;
              }),
            }),
          ),
        );

        const baseInstance = Base();
        const lateInstance = Late();
        plugins = [baseInstance, lateInstance];
        const manager = PluginManager.make({ plugins: [baseInstance], enabled: [testMeta.profile.key], pluginLoader });
        yield* manager.start();

        yield* manager.add(lateMeta.profile.key);
        const enabled = yield* manager.enable(lateMeta.profile.key);
        assert.isTrue(enabled);
        const failures = manager.getFailed();
        assert.strictEqual(failures.length, 1);
        assert.strictEqual(failures[0].id, lateMeta.profile.key);
        assert.instanceOf(failures[0].error, MissingProviderError);
      }),
    );

    it.effect('disabling a provider deactivates dependents first and reactivates them on re-enable', () =>
      Effect.gen(function* () {
        const deactivations: string[] = [];
        const providerMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.provider'), name: 'Provider' });
        const Provider = Plugin.make(
          Plugin.define(providerMeta).pipe(
            Plugin.addModule({
              id: 'provider',
              provides: [String],
              activate: () =>
                Effect.succeed([
                  Capability.provide(String, { string: 'base' }, () =>
                    Effect.sync(() => {
                      deactivations.push('provider');
                    }),
                  ),
                ]),
            }),
          ),
        );
        const Consumer = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'consumer',
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                return [
                  Capability.provide(Number, { number: string.length }, () =>
                    Effect.sync(() => {
                      deactivations.push('consumer');
                    }),
                  ),
                ];
              }),
            }),
          ),
        );

        const providerInstance = Provider();
        const consumerInstance = Consumer();
        plugins = [providerInstance, consumerInstance];
        const manager = PluginManager.make({
          plugins: [providerInstance, consumerInstance],
          enabled: [providerMeta.profile.key, testMeta.profile.key],
          pluginLoader,
        });
        yield* manager.start();
        assert.strictEqual(manager.getActive().length, 2);

        yield* manager.disable(providerMeta.profile.key);
        // Dependent deactivated before its provider.
        assert.deepStrictEqual(deactivations, ['consumer', 'provider']);
        assert.deepStrictEqual(manager.getActive(), []);

        yield* manager.enable(providerMeta.profile.key);
        // Provider reactivates and the pending dependent reactivates with it.
        assert.strictEqual(manager.getActive().length, 2);
        assert.deepStrictEqual(manager.capabilities.get(Number), { number: 4 });
      }),
    );

    it.effect('shutdown deactivates mixed legacy and dependency modules in reverse order', () =>
      Effect.gen(function* () {
        const deactivations: string[] = [];
        const track = (name: string) => () =>
          Effect.sync(() => {
            deactivations.push(name);
          });
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'provider',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'p' }, track('provider'))]),
            }),
            Plugin.addModule({
              id: 'consumer',
              requires: [String],
              provides: [Number],
              activate: Effect.fnUntraced(function* () {
                const { string } = yield* String;
                return [Capability.provide(Number, { number: string.length }, track('consumer'))];
              }),
            }),
            Plugin.addModule({
              id: 'legacy',
              activatesOn: ActivationEvents.Startup,
              activate: () => Effect.succeed(Capability.contributes(Total, { total: 0 }, track('legacy'))),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        yield* manager.start();
        assert.strictEqual(manager.getActive().length, 3);

        yield* manager.shutdown();
        assert.deepStrictEqual(manager.getActive(), []);
        // Reverse activation order; consumer always before its provider.
        assert.isBelow(deactivations.indexOf('consumer'), deactivations.indexOf('provider'));
        assert.strictEqual(deactivations.length, 3);
      }),
    );

    it.effect('publishes the event-level Startup message only after the dependency pass', () =>
      Effect.gen(function* () {
        const messages: Array<{ event: string; module?: string }> = [];
        const Test = Plugin.make(
          Plugin.define(testMeta).pipe(
            Plugin.addModule({
              id: 'provider',
              provides: [String],
              activate: () => Effect.succeed([Capability.provide(String, { string: 'p' })]),
            }),
            Plugin.addModule({
              id: 'legacy',
              activatesOn: ActivationEvents.Startup,
              activate: () => Effect.succeed(Capability.contributes(Total, { total: 0 })),
            }),
          ),
        );

        const manager = makeManagerWith(Test);
        const subscription = yield* PubSub.subscribe(manager.activation);
        yield* manager.start();
        while (true) {
          const message = yield* Queue.poll(subscription);
          if (message._tag === 'None') {
            break;
          }
          if (message.value.state === 'activated') {
            messages.push({ event: message.value.event, module: message.value.module });
          }
        }

        const readyIndex = messages.findIndex((message) => message.event === startupKey && !message.module);
        const providerIndex = messages.findIndex(
          (message) => message.module === 'org.dxos.plugin.test.module.provider',
        );
        assert.isAbove(readyIndex, -1);
        assert.isAbove(providerIndex, -1);
        // The app-ready signal publishes after every dependency-mode module activated.
        assert.isAbove(readyIndex, providerIndex);
      }).pipe(Effect.scoped),
    );
  });
});
