//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { afterEach, describe, expect, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { updateCounter } from '@dxos/echo/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';

import { Events } from '../common';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import * as Plugin from './plugin';
import * as PluginManager from './plugin-manager';

registerSignalsRuntime();

const String = Capability.make<{ string: string }>('dxos.org/test/string');
const Number = Capability.make<{ number: number }>('dxos.org/test/number');
const Total = Capability.make<{ total: number }>('dxos.org/test/total');

const CountEvent = ActivationEvent.make('dxos.org/test/count');
const FailEvent = ActivationEvent.make('dxos.org/test/fail');

const testMeta = { id: 'dxos.org/plugin/test', name: 'Test' };

describe('PluginManager', () => {
  let plugins: Plugin.Plugin[] = [];
  const pluginLoader = (id: string) => {
    const plugin = plugins.find((plugin) => plugin.meta.id === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return plugin;
  };

  afterEach(() => {
    plugins = [];
  });

  it('should be able to add and remove plugins', async () => {
    const Test = Plugin.make(Plugin.define(testMeta));
    const testPlugin = Test();
    plugins = [testPlugin];

    const manager = PluginManager.make({ pluginLoader });
    await manager.add(testMeta.id);
    expect(manager.plugins).toEqual([testPlugin]);
    manager.remove(testMeta.id);
    expect(manager.plugins).toEqual([]);
  });

  it('should support factory pattern with options', async () => {
    type TestPluginOptions = { count: number };
    const TestPluginFactory = Plugin.define<TestPluginOptions>(testMeta).pipe(
      Plugin.addModule((options: TestPluginOptions) => ({
        id: 'Hello',
        activatesOn: Events.Startup,
        activate: () => Capability.contributes(String, { string: `hello-${options.count}` }),
      })),
      Plugin.addModule({
        id: 'World',
        activatesOn: Events.Startup,
        activate: () => Capability.contributes(String, { string: 'world' }),
      }),
      Plugin.make,
    );

    const plugin = TestPluginFactory({ count: 5 });
    plugins = [plugin];

    const manager = PluginManager.make({ plugins: [plugin], core: [], pluginLoader });
    await manager.enable(testMeta.id);
    await manager.activate(Events.Startup);
    const strings = manager.context.getCapabilities(String);
    expect(strings).toHaveLength(2);
    expect(strings[0].string).toBe('hello-5');
    expect(strings[1].string).toBe('world');
  });

  it('should be able to enable and disable plugins', async () => {
    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: Events.Startup,
        activate: () => Capability.contributes(String, { string: 'hello' }),
      }),
      Plugin.make,
    );

    const testPlugin = Test();
    const manager = PluginManager.make({ plugins: [testPlugin], core: [], pluginLoader });
    await manager.enable(testMeta.id);
    expect(manager.enabled).toEqual([Test.meta.id]);
    expect(manager.modules).toEqual([testPlugin.modules[0]]);
    await manager.disable(testMeta.id);
    expect(manager.enabled).toEqual([]);
    expect(manager.modules).toEqual([]);
  });

  it('should be able to activate plugins', async () => {
    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: Events.Startup,
        activate: () => Capability.contributes(String, { string: 'hello' }),
      }),
      Plugin.make,
    );

    const testPlugin = Test();
    const manager = PluginManager.make({ plugins: [testPlugin], enabled: [Test.meta.id], pluginLoader });
    expect(manager.plugins).toEqual([testPlugin]);
    expect(manager.enabled).toEqual([Test.meta.id]);
    expect(manager.modules).toEqual([testPlugin.modules[0]]);
    expect(manager.active).toEqual([]);
    expect(manager.eventsFired).toEqual([]);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([testPlugin.modules[0].id]);
    expect(manager.eventsFired).toEqual([Events.Startup.id]);
  });

  it('should propagate errors thrown by module activate callbacks', async () => {
    plugins = [
      Plugin.define(testMeta).pipe(
        Plugin.addModule({
          activatesOn: FailEvent,
          id: 'Fail',
          activate: async () => raise(new Error('test')),
        }),
        Plugin.make,
      )(),
    ];

    const manager = PluginManager.make({ pluginLoader });
    await manager.add(testMeta.id);
    await expect(() => manager.activate(FailEvent)).rejects.toThrow('test');
  });

  it('should fire activation events', async () => {
    plugins = [
      Plugin.define(testMeta).pipe(
        Plugin.addModule({
          id: 'Hello',
          activatesOn: Events.Startup,
          activate: () => Capability.contributes(String, { string: 'hello' }),
        }),
        Plugin.addModule({
          activatesOn: FailEvent,
          id: 'Fail',
          activate: async () => async () => raise(new Error('test')),
        }),
        Plugin.make,
      )(),
    ];

    const manager = PluginManager.make({ pluginLoader });
    const activating = new Trigger<boolean>();
    const activated = new Trigger<boolean>();
    const error = new Trigger<boolean>();

    manager.activation.on(({ state }) => {
      state === 'activating' && activating.wake(true);
      state === 'activated' && activated.wake(true);
      state === 'error' && error.wake(true);
    });

    await manager.add(testMeta.id);
    await manager.activate(Events.Startup);
    expect(await activating.wait()).toEqual(true);
    expect(await activated.wait()).toEqual(true);

    activating.reset();

    await manager.activate(FailEvent).catch(() => {});
    expect(await activating.wait()).toEqual(true);
    expect(await error.wait()).toEqual(true);
  });

  it('should be able to reset an activation event', async () => {
    let count = 0;
    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: Events.Startup,
        activate: () => {
          count++;
          return Capability.contributes(String, { string: 'hello' });
        },
      }),
      Plugin.make,
    );
    const testPlugin = Test();
    plugins = [testPlugin];

    const manager = PluginManager.make({ pluginLoader });

    {
      await manager.add(testMeta.id);
      const result = await manager.activate(Events.Startup);
      expect(result).toEqual(true);
      expect(manager.active).toEqual([testPlugin.modules[0].id]);
      expect(count).toEqual(1);
    }

    {
      const result = await manager.activate(Events.Startup);
      expect(result).toEqual(false);
    }

    {
      const result = await manager.reset(Events.Startup);
      expect(result).toEqual(true);
      expect(count).toEqual(2);
    }
  });

  it('should not fire an unknown event', async () => {
    const manager = PluginManager.make({ pluginLoader });
    const UnknownEvent = ActivationEvent.make('unknown');
    expect(await manager.activate(UnknownEvent)).toEqual(false);
  });

  it('should be able to fire custom activation events', async () => {
    const Plugin1 = Plugin.define({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin1',
        activate: () => [Capability.contributes(Number, { number: 1 })],
      }),
      Plugin.make,
    );
    const Plugin2 = Plugin.define({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin2',
        activate: () => [Capability.contributes(Number, { number: 2 })],
      }),
      Plugin.make,
    );
    const Plugin3 = Plugin.define({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin3',
        activate: () => [Capability.contributes(Number, { number: 3 })],
      }),
      Plugin.make,
    );
    const plugin1 = Plugin1();
    const plugin2 = Plugin2();
    const plugin3 = Plugin3();
    plugins = [plugin1, plugin2, plugin3];

    const manager = PluginManager.make({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(0);

    await manager.add(Plugin1.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([plugin1.modules[0].id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(1);

    await manager.add(Plugin2.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([plugin1.modules[0].id, plugin2.modules[0].id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(2);

    await manager.add(Plugin3.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([plugin1.modules[0].id, plugin2.modules[0].id, plugin3.modules[0].id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(3);
  });

  it('should only activate modules after all activatation events have been fired', async () => {
    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        activatesOn: ActivationEvent.allOf(Events.Startup, CountEvent),
        id: 'Hello',
        activate: () => {
          return Capability.contributes(String, { string: 'hello' });
        },
      }),
      Plugin.make,
    );
    const testPlugin = Test();
    plugins = [testPlugin];

    const manager = PluginManager.make({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);

    await manager.add(testMeta.id);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);

    await manager.activate(CountEvent);
    expect(manager.active).toEqual([testPlugin.modules[0].id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
  });

  it('should only activate modules once when multiple activatation events have been fired', async () => {
    let count = 0;
    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Hello',
        activatesOn: ActivationEvent.oneOf(Events.Startup, CountEvent),
        activate: () => {
          count++;
          return Capability.contributes(String, { string: 'hello' });
        },
      }),
      Plugin.make,
    );
    const testPlugin = Test();
    plugins = [testPlugin];

    const manager = PluginManager.make({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);
    expect(count).toEqual(0);

    await manager.add(testMeta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([testPlugin.modules[0].id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);

    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([testPlugin.modules[0].id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);
  });

  it('should be able to disable and re-enable an active plugin', async () => {
    const state = { total: 0 };
    const computeTotal = (context: Capability.PluginContext) => {
      const numbers = context.getCapabilities(Number);
      state.total = numbers.reduce((acc, n) => acc + n.number, 0);
    };

    const Count = Plugin.define({ id: 'dxos.org/test/count', name: 'Count' }).pipe(
      Plugin.addModule({
        id: 'Count',
        activatesOn: Events.Startup,
        activatesBefore: [CountEvent],
        activate: async (context) => async () => {
          computeTotal(context);
          return Capability.contributes(Total, state);
        },
      }),
      Plugin.make,
    );

    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Test1',
        activate: () => Capability.contributes(Number, { number: 1 }),
      }),
      Plugin.addModule({
        id: 'Test2',
        activatesOn: CountEvent,
        activate: () => Capability.contributes(Number, { number: 2 }),
      }),
      Plugin.addModule({
        id: 'Test3',
        activatesOn: CountEvent,
        activate: () => Capability.contributes(Number, { number: 3 }),
      }),
      Plugin.make,
    );
    const countPlugin = Count();
    const testPlugin = Test();
    plugins = [countPlugin, testPlugin];

    const manager = PluginManager.make({ pluginLoader });
    {
      await manager.add(Test.meta.id);
      await manager.add(Count.meta.id);
      await manager.activate(Events.Startup);
      expect(manager.active).toEqual([...testPlugin.modules.map((m) => m.id), countPlugin.modules[0].id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.disable(Test.meta.id);
      expect(manager.active).toEqual([countPlugin.modules[0].id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      // Total doesn't change because it is not reactive.
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.enable(Test.meta.id);
      expect(manager.active).toEqual([countPlugin.modules[0].id, ...testPlugin.modules.map((m) => m.id)]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }
  });

  it('should be able to handle live object contributions', async () => {
    const id = 'dxos.org/test/counter';
    const stateEvent = Events.createStateEvent(id);

    const Test = Plugin.define(testMeta).pipe(
      Plugin.addModule({
        id: 'Counter',
        activatesOn: Events.Startup,
        activatesAfter: [stateEvent],
        activate: () => Capability.contributes(Number, live({ number: 1 })),
      }),
      Plugin.addModule({
        id: 'Doubler',
        activatesOn: stateEvent,
        activate: (context) => {
          const counter = context.getCapability(Number);
          const state = live({ total: counter.number * 2 });
          const unsubscribe = effect(() => {
            state.total = counter.number * 2;
          });
          return Capability.contributes(Total, state, () => unsubscribe());
        },
      }),
      Plugin.make,
    );
    const testPlugin = Test();
    plugins = [testPlugin];

    const manager = PluginManager.make({ pluginLoader });
    await manager.add(Test.meta.id);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual(testPlugin.modules.map((m) => m.id));

    const counter = manager.context.getCapability(Number);
    const doubler = manager.context.getCapability(Total);
    expect(counter.number).toEqual(1);
    expect(doubler.total).toEqual(2);

    counter.number = 2;
    expect(doubler.total).toEqual(4);
  });

  it('should be reactive', async () => {
    const Plugin1 = Plugin.define({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin1',
        activate: () => [Capability.contributes(Number, { number: 1 })],
      }),
      Plugin.make,
    );
    const Plugin2 = Plugin.define({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin2',
        activate: () => [Capability.contributes(Number, { number: 2 })],
      }),
      Plugin.make,
    );
    const Plugin3 = Plugin.define({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }).pipe(
      Plugin.addModule({
        activatesOn: CountEvent,
        id: 'Plugin3',
        activate: () => [Capability.contributes(Number, { number: 3 })],
      }),
      Plugin.make,
    );
    plugins = [Plugin1(), Plugin2(), Plugin3()];

    const manager = PluginManager.make({ pluginLoader });
    using pluginUpdates = updateCounter(() => {
      const _ = manager.plugins.length;
    });
    using enabledUpdates = updateCounter(() => {
      const _ = manager.enabled.length;
    });
    using modulesUpdates = updateCounter(() => {
      const _ = manager.modules.length;
    });
    using activeUpdates = updateCounter(() => {
      const _ = manager.active.length;
    });
    using eventsFiredUpdates = updateCounter(() => {
      const _ = manager.eventsFired.length;
    });
    using pendingResetUpdates = updateCounter(() => {
      const _ = manager.pendingReset.length;
    });
    expect(pluginUpdates.count).toEqual(0);
    expect(enabledUpdates.count).toEqual(0);
    expect(modulesUpdates.count).toEqual(0);
    expect(activeUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(Plugin1.meta.id);
    expect(pluginUpdates.count).toEqual(1);
    expect(enabledUpdates.count).toEqual(1);
    expect(modulesUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.activate(CountEvent);
    expect(pluginUpdates.count).toEqual(1);
    expect(enabledUpdates.count).toEqual(1);
    expect(modulesUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(1);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(Plugin2.meta.id);
    expect(pluginUpdates.count).toEqual(2);
    expect(enabledUpdates.count).toEqual(2);
    expect(modulesUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(2);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(2);

    await manager.activate(CountEvent);
    expect(pluginUpdates.count).toEqual(2);
    expect(enabledUpdates.count).toEqual(2);
    expect(modulesUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(2);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(2);

    await manager.add(Plugin3.meta.id);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(3);
    expect(modulesUpdates.count).toEqual(3);
    expect(activeUpdates.count).toEqual(3);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);

    await manager.reset(CountEvent);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(3);
    expect(modulesUpdates.count).toEqual(3);
    // Starts at 3, plus deactivates 3, plus activates 3.
    expect(activeUpdates.count).toEqual(9);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);

    await manager.disable(Plugin1.meta.id);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(4);
    expect(activeUpdates.count).toEqual(10);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);

    await manager.remove(Plugin1.meta.id);
    expect(pluginUpdates.count).toEqual(4);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(4);
    expect(activeUpdates.count).toEqual(10);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);

    await manager.reset(CountEvent);
    expect(pluginUpdates.count).toEqual(4);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(4);
    // Starts at 10, plus deactivates 2, plus activates 2.
    expect(activeUpdates.count).toEqual(14);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);
  });
});
