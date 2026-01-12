//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, describe, it } from '@effect/vitest';
import { type Atom, Registry } from '@effect-atom/atom-react';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Match from 'effect/Match';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as TestClock from 'effect/TestClock';

import { invariant } from '@dxos/invariant';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import * as Common from '../common';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import * as Plugin from './plugin';
import * as PluginManager from './plugin-manager';

const String = Capability.make<{ string: string }>('dxos.org/test/string');
const Number = Capability.make<{ number: number }>('dxos.org/test/number');
const Total = Capability.make<{ total: number }>('dxos.org/test/total');

const CountEvent = ActivationEvent.make('dxos.org/test/count');
const FailEvent = ActivationEvent.make('dxos.org/test/fail');

const testMeta = { id: 'dxos.org/plugin/test', name: 'Test' };

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
    const plugin = plugins.find((plugin) => plugin.meta.id === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return plugin;
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
      const added = yield* manager.add(testMeta.id);
      assert.isTrue(added);
      assert.deepStrictEqual(manager.getPlugins(), [testPlugin]);
      const removed = manager.remove(testMeta.id);
      assert.isTrue(removed);
      assert.deepStrictEqual(manager.getPlugins(), []);
    }),
  );

  it.effect('should support factory pattern with options', () =>
    Effect.gen(function* () {
      type TestPluginOptions = { count: number };
      const TestPluginFactory = Plugin.define<TestPluginOptions>(testMeta).pipe(
        Plugin.addModule((options: TestPluginOptions) => ({
          id: 'Hello',
          activatesOn: Common.ActivationEvent.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: `hello-${options.count}` })),
        })),
        Plugin.addModule({
          id: 'World',
          activatesOn: Common.ActivationEvent.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'world' })),
        }),
        Plugin.make,
      );

      const plugin = TestPluginFactory({ count: 5 });
      plugins = [plugin];

      const manager = PluginManager.make({ plugins: [plugin], core: [], pluginLoader });
      yield* manager.enable(testMeta.id);
      yield* manager.activate(Common.ActivationEvent.Startup);
      const strings = manager.context.getCapabilities(String);
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
          activatesOn: Common.ActivationEvent.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], core: [], pluginLoader });
      yield* manager.enable(testMeta.id);
      assert.deepStrictEqual(manager.getEnabled(), [Test.meta.id]);
      assert.deepStrictEqual(manager.getModules(), [testPlugin.modules[0]]);
      yield* manager.disable(testMeta.id);
      assert.deepStrictEqual(manager.getEnabled(), []);
      assert.deepStrictEqual(manager.getModules(), []);
    }),
  );

  it.effect('should be able to activate plugins', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: Common.ActivationEvent.Startup,
          activate: () => Effect.succeed(Capability.contributes(String, { string: 'hello' })),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], pluginLoader });
      yield* manager.enable(Test.meta.id);
      assert.deepStrictEqual(manager.getPlugins(), [testPlugin]);
      assert.deepStrictEqual(manager.getEnabled(), [Test.meta.id]);
      assert.deepStrictEqual(manager.getModules(), [testPlugin.modules[0]]);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.deepStrictEqual(manager.getEventsFired(), []);
      yield* manager.activate(Common.ActivationEvent.Startup);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.deepStrictEqual(manager.getEventsFired(), [Common.ActivationEvent.Startup.id]);
    }),
  );

  it.effect('should handle activate returning void', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'NoCapabilities',
          activatesOn: Common.ActivationEvent.Startup,
          activate: Effect.fnUntraced(function* () {}),
        }),
        Plugin.make,
      );

      const testPlugin = Test();
      const manager = PluginManager.make({ plugins: [testPlugin], pluginLoader });
      yield* manager.enable(Test.meta.id);

      const result = yield* manager.activate(Common.ActivationEvent.Startup);
      assert.isTrue(result);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(String).length, 0);
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
      yield* manager.add(testMeta.id);
      const error = yield* Effect.flip(manager.activate(FailEvent));
      assert.strictEqual(error.message, 'test');
    }),
  );

  it.effect('should fire activation events', () =>
    Effect.gen(function* () {
      plugins = [
        Plugin.define(testMeta).pipe(
          Plugin.addModule({
            id: 'Hello',
            activatesOn: Common.ActivationEvent.Startup,
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

      yield* manager.add(testMeta.id);
      yield* manager.activate(Common.ActivationEvent.Startup);
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
          activatesOn: Common.ActivationEvent.Startup,
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
        yield* manager.add(testMeta.id);
        const result = yield* manager.activate(Common.ActivationEvent.Startup);
        assert.isTrue(result);
        assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
        assert.strictEqual(count, 1);
      }

      {
        const result = yield* manager.activate(Common.ActivationEvent.Startup);
        assert.isFalse(result);
      }

      {
        const result = yield* manager.reset(Common.ActivationEvent.Startup);
        assert.isTrue(result);
        assert.strictEqual(count, 2);
      }
    }),
  );

  it.effect('should not fire an unknown event', () =>
    Effect.gen(function* () {
      const manager = PluginManager.make({ pluginLoader });
      const UnknownEvent = ActivationEvent.make('unknown');
      const result = yield* manager.activate(UnknownEvent);
      assert.isFalse(result);
    }),
  );

  it.effect('should be able to fire custom activation events', () =>
    Effect.gen(function* () {
      const Plugin1 = Plugin.define({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin1',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 1 })]),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin2',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 2 })]),
        }),
        Plugin.make,
      );
      const Plugin3 = Plugin.define({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }).pipe(
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
      assert.strictEqual(manager.context.getCapabilities(Number).length, 0);

      yield* manager.add(Plugin1.meta.id);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [plugin1.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(Number).length, 1);

      yield* manager.add(Plugin2.meta.id);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [plugin1.modules[0].id, plugin2.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(Number).length, 2);

      yield* manager.add(Plugin3.meta.id);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [
        plugin1.modules[0].id,
        plugin2.modules[0].id,
        plugin3.modules[0].id,
      ]);
      assert.strictEqual(manager.context.getCapabilities(Number).length, 3);
    }),
  );

  it.effect('should only activate modules after all activatation events have been fired', () =>
    Effect.gen(function* () {
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          activatesOn: ActivationEvent.allOf(Common.ActivationEvent.Startup, CountEvent),
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
      assert.strictEqual(manager.context.getCapabilities(String).length, 0);

      yield* manager.add(testMeta.id);
      yield* manager.activate(Common.ActivationEvent.Startup);
      assert.deepStrictEqual(manager.getActive(), []);
      assert.strictEqual(manager.context.getCapabilities(String).length, 0);

      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(String).length, 1);
    }),
  );

  it.effect('should only activate modules once when multiple activatation events have been fired', () =>
    Effect.gen(function* () {
      let count = 0;
      const Test = Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.Startup, CountEvent),
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
      assert.strictEqual(manager.context.getCapabilities(String).length, 0);
      assert.strictEqual(count, 0);

      yield* manager.add(testMeta.id);
      yield* manager.activate(CountEvent);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(String).length, 1);
      assert.strictEqual(count, 1);

      yield* manager.activate(Common.ActivationEvent.Startup);
      assert.deepStrictEqual(manager.getActive(), [testPlugin.modules[0].id]);
      assert.strictEqual(manager.context.getCapabilities(String).length, 1);
      assert.strictEqual(count, 1);
    }),
  );

  it.effect('should be able to disable and re-enable an active plugin', () =>
    Effect.gen(function* () {
      const state = { total: 0 };
      const computeTotal = (context: Capability.PluginContext) => {
        const numbers = context.getCapabilities(Number);
        state.total = numbers.reduce((acc, n) => acc + n.number, 0);
      };

      const Count = Plugin.define({ id: 'dxos.org/test/count', name: 'Count' }).pipe(
        Plugin.addModule({
          id: 'Count',
          activatesOn: Common.ActivationEvent.Startup,
          activatesBefore: [CountEvent],
          activate: (context) =>
            Effect.sync(() => {
              computeTotal(context);
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
        yield* manager.add(Test.meta.id);
        yield* manager.add(Count.meta.id);
        yield* manager.activate(Common.ActivationEvent.Startup);
        assert.deepStrictEqual(manager.getActive(), [
          ...testPlugin.modules.map((m) => m.id),
          countPlugin.modules[0].id,
        ]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.context.getCapabilities(Total);
        assert.strictEqual(totals.length, 1);
        assert.strictEqual(totals[0].total, 6);
      }

      {
        yield* manager.disable(Test.meta.id);
        assert.deepStrictEqual(manager.getActive(), [countPlugin.modules[0].id]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.context.getCapabilities(Total);
        assert.strictEqual(totals.length, 1);
        // Total doesn't change because it is not reactive.
        assert.strictEqual(totals[0].total, 6);
      }

      {
        yield* manager.enable(Test.meta.id);
        assert.deepStrictEqual(manager.getActive(), [
          countPlugin.modules[0].id,
          ...testPlugin.modules.map((m) => m.id),
        ]);
        assert.deepStrictEqual(manager.getPendingReset(), []);

        const totals = manager.context.getCapabilities(Total);
        assert.strictEqual(totals.length, 1);
        assert.strictEqual(totals[0].total, 6);
      }
    }),
  );

  it.effect('should be reactive', () =>
    Effect.gen(function* () {
      const Plugin1 = Plugin.define({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin1',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 1 })]),
        }),
        Plugin.make,
      );
      const Plugin2 = Plugin.define({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }).pipe(
        Plugin.addModule({
          activatesOn: CountEvent,
          id: 'Plugin2',
          activate: () => Effect.succeed([Capability.contributes(Number, { number: 2 })]),
        }),
        Plugin.make,
      );
      const Plugin3 = Plugin.define({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }).pipe(
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

      yield* manager.add(Plugin1.meta.id);
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

      yield* manager.add(Plugin2.meta.id);
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

      yield* manager.add(Plugin3.meta.id);
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

      yield* manager.disable(Plugin1.meta.id);
      assert.strictEqual(pluginUpdates.count, 3);
      assert.strictEqual(enabledUpdates.count, 4);
      assert.strictEqual(modulesUpdates.count, 4);
      assert.strictEqual(activeUpdates.count, 10);
      assert.strictEqual(eventsFiredUpdates.count, 1);
      assert.strictEqual(pendingResetUpdates.count, 4);

      manager.remove(Plugin1.meta.id);
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

      const SlowEvent = ActivationEvent.make('dxos.org/test/slow');
      const SlowPlugin = Plugin.define({ id: 'dxos.org/test/slow-plugin', name: 'Slow Plugin' }).pipe(
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
      yield* manager.add(SlowPlugin.meta.id);

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
});
