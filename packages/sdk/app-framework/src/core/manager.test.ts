//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import { afterEach } from 'node:test';
import { describe, expect, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';

import { contributes, defineCapability, type PluginsContext } from './capabilities';
import { allOf, defineEvent, oneOf } from './events';
import { PluginManager } from './manager';
import { definePlugin, defineModule, type Plugin } from './plugin';
import { Events } from '../common';

registerSignalsRuntime();

const String = defineCapability<{ string: string }>('dxos.org/test/string');
const Number = defineCapability<{ number: number }>('dxos.org/test/number');
const Total = defineCapability<{ total: number }>('dxos.org/test/total');

const CountEvent = defineEvent('dxos.org/test/count');
const FailEvent = defineEvent('dxos.org/test/fail');

const testMeta = { id: 'dxos.org/plugin/test' };

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
    const Test = definePlugin(testMeta, []);
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
    const Test = definePlugin(testMeta, [Hello]);

    const manager = new PluginManager({ plugins: [Test], core: [], pluginLoader });
    manager.enable(testMeta.id);
    expect(manager.enabled).toEqual([Test.meta.id]);
    expect(manager.modules).toEqual([Hello]);
    manager.disable(testMeta.id);
    expect(manager.enabled).toEqual([]);
    expect(manager.modules).toEqual([]);
  });

  it('should be able to activate plugins', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: Events.Startup,
      activate: () => contributes(String, { string: 'hello' }),
    });
    const Test = definePlugin(testMeta, [Hello]);

    const manager = new PluginManager({ plugins: [Test], core: [], enabled: [Test.meta.id], pluginLoader });
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
    plugins = [definePlugin(testMeta, [Fail])];

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
      activate: async () => raise(new Error('test')),
    });
    plugins = [definePlugin(testMeta, [Hello, Fail])];

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
    plugins = [definePlugin(testMeta, [Hello])];

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
    const One = definePlugin({ id: 'dxos.org/test/one' }, [
      defineModule({
        id: 'dxos.org/test/one',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Two = definePlugin({ id: 'dxos.org/test/two' }, [
      defineModule({
        id: 'dxos.org/test/two',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Three = definePlugin({ id: 'dxos.org/test/three' }, [
      defineModule({
        id: 'dxos.org/test/three',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [One, Two, Three];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.requestCapabilities(Number)).toHaveLength(0);

    await manager.add(One.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id]);
    expect(manager.context.requestCapabilities(Number)).toHaveLength(1);

    await manager.add(Two.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id, Two.meta.id]);
    expect(manager.context.requestCapabilities(Number)).toHaveLength(2);

    await manager.add(Three.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id, Two.meta.id, Three.meta.id]);
    expect(manager.context.requestCapabilities(Number)).toHaveLength(3);
  });

  it('should only activate modules after all activatation events have been fired', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activatesOn: allOf(Events.Startup, CountEvent),
      activate: () => {
        return contributes(String, { string: 'hello' });
      },
    });
    plugins = [definePlugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(0);

    await manager.add(testMeta.id);
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(0);

    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(1);
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
    plugins = [definePlugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(0);
    expect(count).toEqual(0);

    await manager.add(testMeta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);

    await manager.activate(Events.Startup);
    expect(manager.active).toEqual([Hello.id]);
    expect(manager.context.requestCapabilities(String)).toHaveLength(1);
    expect(count).toEqual(1);
  });

  it('should be able to disable and re-enable an active plugin', async () => {
    const state = { total: 0 };
    const computeTotal = (context: PluginsContext) => {
      const numbers = context.requestCapabilities(Number);
      state.total = numbers.reduce((acc, n) => acc + n.number, 0);
    };

    const Count = definePlugin({ id: 'dxos.org/test/count' }, [
      defineModule({
        id: 'dxos.org/test/count',
        activatesOn: Events.Startup,
        activatesBefore: [CountEvent],
        activate: (context) => {
          computeTotal(context);
          return contributes(Total, state);
        },
      }),
    ]);

    const Test = definePlugin(testMeta, [
      defineModule({
        id: 'dxos.org/test/one',
        activatesOn: CountEvent,
        activate: () => contributes(Number, { number: 1 }),
      }),
      defineModule({
        id: 'dxos.org/test/two',
        activatesOn: CountEvent,
        activate: () => contributes(Number, { number: 2 }),
      }),
      defineModule({
        id: 'dxos.org/test/three',
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

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.disable(Test.meta.id);
      expect(manager.active).toEqual([...Test.modules.map((m) => m.id), Count.meta.id]);
      expect(manager.pendingReset).toEqual([CountEvent.id, Events.Startup.id]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.reset(CountEvent);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([Events.Startup.id]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.reset(Events.Startup);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.enable(Test.meta.id);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([CountEvent.id, Events.Startup.id]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.reset(CountEvent);
      expect(manager.active).toEqual([Count.meta.id, ...Test.modules.map((m) => m.id)]);
      expect(manager.pendingReset).toEqual([Events.Startup.id]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.reset(Events.Startup);
      expect(manager.active).toEqual([...Test.modules.map((m) => m.id), Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.requestCapabilities(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }
  });

  it('should be able to handle live object contributions', async () => {
    const id = 'dxos.org/test/counter';
    const stateEvent = Events.createStateEvent(id);

    const Test = definePlugin(testMeta, [
      defineModule({
        id,
        activatesOn: Events.Startup,
        activatesAfter: [stateEvent],
        activate: () => contributes(Number, create({ number: 1 })),
      }),
      defineModule({
        id: 'dxos.org/test/doubler',
        activatesOn: stateEvent,
        activate: (context) => {
          const counter = context.requestCapability(Number);
          const state = create({ total: counter.number * 2 });
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

    const counter = manager.context.requestCapability(Number);
    const doubler = manager.context.requestCapability(Total);
    expect(counter.number).toEqual(1);
    expect(doubler.total).toEqual(2);

    counter.number = 2;
    expect(doubler.total).toEqual(4);
  });

  it('should be reactive', async () => {
    const One = definePlugin({ id: 'dxos.org/test/one' }, [
      defineModule({
        id: 'dxos.org/test/one',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Two = definePlugin({ id: 'dxos.org/test/two' }, [
      defineModule({
        id: 'dxos.org/test/two',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Three = definePlugin({ id: 'dxos.org/test/three' }, [
      defineModule({
        id: 'dxos.org/test/three',
        activatesOn: CountEvent,
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [One, Two, Three];

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
    using pendingRemovalUpdates = updateCounter(() => {
      const _ = manager.pendingRemoval.length;
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
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(One.meta.id);
    expect(pluginUpdates.count).toEqual(1);
    expect(enabledUpdates.count).toEqual(1);
    expect(modulesUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(0);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.activate(CountEvent);
    expect(pluginUpdates.count).toEqual(1);
    expect(enabledUpdates.count).toEqual(1);
    expect(modulesUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(1);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(Two.meta.id);
    expect(pluginUpdates.count).toEqual(2);
    expect(enabledUpdates.count).toEqual(2);
    expect(modulesUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(1);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(1);

    await manager.activate(CountEvent);
    expect(pluginUpdates.count).toEqual(2);
    expect(enabledUpdates.count).toEqual(2);
    expect(modulesUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(2);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(2);

    await manager.add(Three.meta.id);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(3);
    expect(modulesUpdates.count).toEqual(3);
    expect(activeUpdates.count).toEqual(2);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(3);

    await manager.reset(CountEvent);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(3);
    expect(modulesUpdates.count).toEqual(3);
    // Starts at 2, plus deactivates 2, plus activates 3.
    expect(activeUpdates.count).toEqual(7);
    expect(pendingRemovalUpdates.count).toEqual(0);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(4);

    await manager.disable(One.meta.id);
    expect(pluginUpdates.count).toEqual(3);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(3);
    expect(activeUpdates.count).toEqual(7);
    expect(pendingRemovalUpdates.count).toEqual(1);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(5);

    await manager.remove(One.meta.id);
    expect(pluginUpdates.count).toEqual(4);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(3);
    expect(activeUpdates.count).toEqual(7);
    expect(pendingRemovalUpdates.count).toEqual(1);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(5);

    await manager.reset(CountEvent);
    expect(pluginUpdates.count).toEqual(4);
    expect(enabledUpdates.count).toEqual(4);
    expect(modulesUpdates.count).toEqual(4);
    // Starts at 7, plus deactivates 3, plus activates 2.
    expect(activeUpdates.count).toEqual(12);
    expect(pendingRemovalUpdates.count).toEqual(2);
    expect(eventsFiredUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(6);
  });
});
