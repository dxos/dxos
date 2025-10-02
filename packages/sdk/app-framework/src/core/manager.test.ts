//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { afterEach, describe, expect, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';

import { Events } from '../common';

import { type PluginContext, contributes, defineCapability } from './capabilities';
import { allOf, defineEvent, oneOf } from './events';
import { PluginManager } from './manager';
import { Plugin, defineModule } from './plugin';

registerSignalsRuntime();

const String = defineCapability<{ string: string }>('dxos.org/test/string');
const Number = defineCapability<{ number: number }>('dxos.org/test/number');
const Total = defineCapability<{ total: number }>('dxos.org/test/total');

const CountEvent = defineEvent('dxos.org/test/count');
const FailEvent = defineEvent('dxos.org/test/fail');

const testMeta = { id: 'dxos.org/plugin/test', name: 'Test' };

describe('PluginManager', () => {
  let plugins: Plugin[] = [];
  const pluginLoader = (id: string) => {
    const plugin = plugins.find((plugin) => plugin.meta.id === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return plugin;
  };

  afterEach(() => {
    plugins = [];
  });

  it('should be able to add and remove plugins', async () => {
    const Test = new Plugin(testMeta, []);
    plugins = [Test];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(testMeta.id);
    expect(manager.plugins).toEqual([Test]);
    await manager.remove(testMeta.id);
    expect(manager.plugins).toEqual([]);
  });

  it('should be able to enable and disable plugins', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: Events.Startup,
      activate: () => contributes(String, { string: 'hello' }),
    });
    const Test = new Plugin(testMeta, [Hello]);

    const manager = new PluginManager({ plugins: [Test], core: [], pluginLoader });
    await manager.enable(testMeta.id);
    expect(manager.enabled).toEqual([Test.meta.id]);
    expect(manager.modules).toEqual([Hello]);
    await manager.disable(testMeta.id);
    expect(manager.enabled).toEqual([]);
    expect(manager.modules).toEqual([]);
  });

  it('should be able to activate plugins', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: Events.Startup,
      activate: () => contributes(String, { string: 'hello' }),
    });
    const Test = new Plugin(testMeta, [Hello]);

    const manager = new PluginManager({ plugins: [Test], enabled: [Test.meta.id], pluginLoader });
    expect(manager.plugins).toEqual([Test]);
    expect(manager.enabled).toEqual([Test.meta.id]);
    expect(manager.modules).toEqual([Hello]);
    expect(manager.active).toEqual([]);
    expect(manager.eventsFired).toEqual([]);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.eventsFired).toEqual([Events.Startup.id]);
  });

  it('should propagate errors thrown by module activate callbacks', async () => {
    const Fail = defineModule({
      id: 'dxos.org/test/fail',
      activatesOn: FailEvent,
      activate: async () => raise(new Error('test')),
    });
    plugins = [new Plugin(testMeta, [Fail])];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(testMeta.id);
    await expect(() => manager.activate(FailEvent)).rejects.toThrow('test');
  });

  it('should fire activation events', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: Events.Startup,
      activate: () => contributes(String, { string: 'hello' }),
    });
    const Fail = defineModule({
      id: 'dxos.org/test/fail',
      activatesOn: FailEvent,
      // TODO(wittjosiah): Test and catch more failure modes.
      activate: async () => async () => raise(new Error('test')),
    });
    plugins = [new Plugin(testMeta, [Hello, Fail])];

    const manager = new PluginManager({ pluginLoader });
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
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: Events.Startup,
      activate: () => {
        count++;
        return contributes(String, { string: 'hello' });
      },
    });
    plugins = [new Plugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });

    {
      await manager.add(testMeta.id);
      const result = await manager.activate(Events.Startup);
      expect(result).toEqual(true);
      expect(manager.active).toEqual([Hello.id]);
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
    const manager = new PluginManager({ pluginLoader });
    const UnknownEvent = defineEvent('unknown');
    expect(await manager.activate(UnknownEvent)).toEqual(false);
  });

  it('should be able to fire custom activation events', async () => {
    const Plugin1 = new Plugin({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }, [
      defineModule({
        id: 'dxos.org/test/plugin-1',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Plugin2 = new Plugin({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }, [
      defineModule({
        id: 'dxos.org/test/plugin-2',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Plugin3 = new Plugin({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }, [
      defineModule({
        id: 'dxos.org/test/plugin-3',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [Plugin1, Plugin2, Plugin3];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(0);

    await manager.add(Plugin1.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Plugin1.meta.id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(1);

    await manager.add(Plugin2.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Plugin1.meta.id, Plugin2.meta.id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(2);

    await manager.add(Plugin3.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Plugin1.meta.id, Plugin2.meta.id, Plugin3.meta.id]);
    expect(manager.context.getCapabilities(Number)).toHaveLength(3);
  });

  it('should only activate modules after all activatation events have been fired', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: allOf(Events.Startup, CountEvent),
      activate: () => {
        return contributes(String, { string: 'hello' });
      },
    });
    plugins = [new Plugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);

    await manager.add(testMeta.id);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);

    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
  });

  it('should only activate modules once when multiple activatation events have been fired', async () => {
    let count = 0;
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: oneOf(Events.Startup, CountEvent),
      activate: () => {
        count++;
        return contributes(String, { string: 'hello' });
      },
    });
    plugins = [new Plugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.getCapabilities(String)).toHaveLength(0);
    expect(count).toEqual(0);

    await manager.add(testMeta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);

    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.getCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);
  });

  it('should be able to disable and re-enable an active plugin', async () => {
    const state = { total: 0 };
    const computeTotal = (context: PluginContext) => {
      const numbers = context.getCapabilities(Number);
      state.total = numbers.reduce((acc, n) => acc + n.number, 0);
    };

    const Count = new Plugin({ id: 'dxos.org/test/count', name: 'Count' }, [
      defineModule({
        id: 'dxos.org/test/count',
        activatesOn: Events.Startup,
        activatesBefore: [CountEvent],
        activate: async (context) => async () => {
          computeTotal(context);
          return contributes(Total, state);
        },
      }),
    ]);

    const Test = new Plugin(testMeta, [
      defineModule({
        id: 'dxos.org/test/plugin-1',
        activatesOn: CountEvent,
        activate: () => contributes(Number, { number: 1 }),
      }),
      defineModule({
        id: 'dxos.org/test/plugin-2',
        activatesOn: CountEvent,
        activate: () => contributes(Number, { number: 2 }),
      }),
      defineModule({
        id: 'dxos.org/test/plugin-3',
        activatesOn: CountEvent,
        activate: () => contributes(Number, { number: 3 }),
      }),
    ]);
    plugins = [Count, Test];

    const manager = new PluginManager({ pluginLoader });
    {
      await manager.add(Test.meta.id);
      await manager.add(Count.meta.id);
      await manager.activate(Events.Startup);
      expect(manager.active).toEqual([...Test.modules.map((m) => m.id), Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.disable(Test.meta.id);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      // Total doesn't change because it is not reactive.
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.enable(Test.meta.id);
      expect(manager.active).toEqual([Count.meta.id, ...Test.modules.map((m) => m.id)]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.getCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }
  });

  it('should be able to handle live object contributions', async () => {
    const id = 'dxos.org/test/counter';
    const stateEvent = Events.createStateEvent(id);

    const Test = new Plugin(testMeta, [
      defineModule({
        id,
        activatesOn: Events.Startup,
        activatesAfter: [stateEvent],
        activate: () => contributes(Number, live({ number: 1 })),
      }),
      defineModule({
        id: 'dxos.org/test/doubler',
        activatesOn: stateEvent,
        activate: (context) => {
          const counter = context.getCapability(Number);
          const state = live({ total: counter.number * 2 });
          const unsubscribe = effect(() => {
            state.total = counter.number * 2;
          });
          return contributes(Total, state, () => unsubscribe());
        },
      }),
    ]);
    plugins = [Test];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(Test.meta.id);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual(Test.modules.map((m) => m.id));

    const counter = manager.context.getCapability(Number);
    const doubler = manager.context.getCapability(Total);
    expect(counter.number).toEqual(1);
    expect(doubler.total).toEqual(2);

    counter.number = 2;
    expect(doubler.total).toEqual(4);
  });

  it('should be reactive', async () => {
    const Plugin1 = new Plugin({ id: 'dxos.org/test/plugin-1', name: 'Plugin 1' }, [
      defineModule({
        id: 'dxos.org/test/plugin-1',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Plugin2 = new Plugin({ id: 'dxos.org/test/plugin-2', name: 'Plugin 2' }, [
      defineModule({
        id: 'dxos.org/test/plugin-2',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Plugin3 = new Plugin({ id: 'dxos.org/test/plugin-3', name: 'Plugin 3' }, [
      defineModule({
        id: 'dxos.org/test/plugin-3',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [Plugin1, Plugin2, Plugin3];

    const manager = new PluginManager({ pluginLoader });
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
