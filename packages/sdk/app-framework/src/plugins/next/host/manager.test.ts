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

import { eventKey, PluginManager } from './manager';
import {
  contributes,
  definePlugin,
  defineModule,
  defineInterface,
  type PluginsContext,
  type Plugin,
  defineEvent,
} from './plugin';
import { Events } from '../common';

registerSignalsRuntime();

const String = defineInterface<{ string: string }>('dxos.org/test/string');
const Number = defineInterface<{ number: number }>('dxos.org/test/number');
const Total = defineInterface<{ total: number }>('dxos.org/test/total');

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
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activationEvents: [Events.Startup.id],
      activate: () => contributes(String, { string: 'hello' }),
    });
    const World = defineModule({
      id: 'dxos.org/test/world',
      activationEvents: [Events.Startup.id],
      activate: () => contributes(String, { string: 'world' }),
    });
    plugins = [definePlugin(testMeta, [Hello, World])];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(testMeta.id);
    expect(manager.modules).toEqual([Hello, World]);
    await manager.remove(testMeta.id);
    expect(manager.modules).toEqual([]);
  });

  it('should be able to activate plugins', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activationEvents: [Events.Startup.id],
      activate: () => contributes(String, { string: 'hello' }),
    });
    plugins = [definePlugin(testMeta, [Hello])];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(testMeta.id);
    expect(manager.modules).toEqual([Hello]);
    expect(manager.active).toEqual([]);
    await manager.activate(Events.Startup);
    expect(manager.modules).toEqual([Hello]);
    expect(manager.active).toEqual([Hello.id]);
  });

  it('should propagate errors thrown by module activate callbacks', async () => {
    const Fail = defineModule({
      id: 'dxos.org/test/fail',
      activationEvents: [FailEvent.id],
      activate: () => raise(new Error('test')),
    });
    plugins = [definePlugin(testMeta, [Fail])];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(testMeta.id);
    await expect(() => manager.activate(FailEvent)).rejects.toThrow('test');
  });

  it('should fire activation events', async () => {
    const Hello = defineModule({
      id: 'dxos.org/test/hello',
      activationEvents: [Events.Startup.id],
      activate: () => contributes(String, { string: 'hello' }),
    });
    const Fail = defineModule({
      id: 'dxos.org/test/fail',
      activationEvents: [FailEvent.id],
      activate: () => raise(new Error('test')),
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
      activationEvents: [Events.Startup.id],
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
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Two = definePlugin({ id: 'dxos.org/test/two' }, [
      defineModule({
        id: 'dxos.org/test/two',
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Three = definePlugin({ id: 'dxos.org/test/three' }, [
      defineModule({
        id: 'dxos.org/test/three',
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [One, Two, Three];

    const manager = new PluginManager({ plugins: [One], pluginLoader });
    expect(manager.active).toEqual([]);
    expect(manager.context.requestCapability(Number)).toHaveLength(0);

    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id]);
    expect(manager.context.requestCapability(Number)).toHaveLength(1);

    await manager.add(Two.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id, Two.meta.id]);
    expect(manager.context.requestCapability(Number)).toHaveLength(2);

    await manager.add(Three.meta.id);
    await manager.activate(CountEvent);
    expect(manager.active).toEqual([One.meta.id, Two.meta.id, Three.meta.id]);
    expect(manager.context.requestCapability(Number)).toHaveLength(3);
  });

  it('should be able to remove and re-add an active plugin', async () => {
    const state = { total: 0 };
    const computeTotal = (context: PluginsContext) => {
      const numbers = context.requestCapability(Number);
      state.total = numbers.reduce((acc, n) => acc + n.number, 0);
    };

    const Count = definePlugin({ id: 'dxos.org/test/count' }, [
      defineModule({
        id: 'dxos.org/test/count',
        activationEvents: [Events.Startup.id],
        dependentEvents: [CountEvent.id],
        activate: (context) => {
          computeTotal(context);
          return contributes(Total, state);
        },
      }),
    ]);

    const Test = definePlugin(testMeta, [
      defineModule({
        id: 'dxos.org/test/one',
        activationEvents: [CountEvent.id],
        activate: () => contributes(Number, { number: 1 }),
      }),
      defineModule({
        id: 'dxos.org/test/two',
        activationEvents: [CountEvent.id],
        activate: () => contributes(Number, { number: 2 }),
      }),
      defineModule({
        id: 'dxos.org/test/three',
        activationEvents: [CountEvent.id],
        activate: () => contributes(Number, { number: 3 }),
      }),
    ]);
    plugins = [Count, Test];

    const manager = new PluginManager({ plugins: [Count, Test], pluginLoader });
    {
      await manager.activate(Events.Startup);
      expect(manager.active).toEqual([...Test.modules.map((m) => m.id), Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.remove(Test.meta.id);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([CountEvent.id, Events.Startup.id]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.reset(CountEvent);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([Events.Startup.id]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.reset(Events.Startup);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.add(Test.meta.id);
      expect(manager.active).toEqual([Count.meta.id]);
      expect(manager.pendingReset).toEqual([CountEvent.id, Events.Startup.id]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.reset(CountEvent);
      expect(manager.active).toEqual([Count.meta.id, ...Test.modules.map((m) => m.id)]);
      expect(manager.pendingReset).toEqual([Events.Startup.id]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(0);
    }

    {
      await manager.reset(Events.Startup);
      expect(manager.active).toEqual([...Test.modules.map((m) => m.id), Count.meta.id]);
      expect(manager.pendingReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }
  });

  it('should be able to handle live object contributions', async () => {
    const id = 'dxos.org/test/counter';
    const stateEvent = Events.createStateEvent(id);

    let unsubscribe: () => void;
    const Test = definePlugin(testMeta, [
      defineModule({
        id,
        activationEvents: [Events.Startup.id],
        triggeredEvents: [eventKey(stateEvent)],
        activate: () => contributes(Number, create({ number: 1 })),
      }),
      defineModule({
        id: 'dxos.org/test/doubler',
        activationEvents: [eventKey(stateEvent)],
        activate: (context) => {
          const [counter] = context.requestCapability(Number);
          const state = create({ total: counter.number * 2 });
          unsubscribe = effect(() => {
            state.total = counter.number * 2;
          });
          return contributes(Total, state);
        },
        deactivate: () => {
          unsubscribe?.();
        },
      }),
    ]);

    const manager = new PluginManager({ plugins: [Test], pluginLoader });
    await manager.activate(Events.Startup);
    expect(manager.active).toEqual(Test.modules.map((m) => m.id));

    const [counter] = manager.context.requestCapability(Number);
    const [doubler] = manager.context.requestCapability(Total);
    expect(counter.number).toEqual(1);
    expect(doubler.total).toEqual(2);

    counter.number = 2;
    expect(doubler.total).toEqual(4);
  });

  it('should be reactive', async () => {
    const One = definePlugin({ id: 'dxos.org/test/one' }, [
      defineModule({
        id: 'dxos.org/test/one',
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 1 })],
      }),
    ]);
    const Two = definePlugin({ id: 'dxos.org/test/two' }, [
      defineModule({
        id: 'dxos.org/test/two',
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 2 })],
      }),
    ]);
    const Three = definePlugin({ id: 'dxos.org/test/three' }, [
      defineModule({
        id: 'dxos.org/test/three',
        activationEvents: [CountEvent.id],
        activate: () => [contributes(Number, { number: 3 })],
      }),
    ]);
    plugins = [One, Two, Three];

    const manager = new PluginManager({ pluginLoader });
    using enabledUpdates = updateCounter(() => {
      const _ = manager.enabled.length;
    });
    using activeUpdates = updateCounter(() => {
      const _ = manager.active.length;
    });
    using pendingResetUpdates = updateCounter(() => {
      const _ = manager.pendingReset.length;
    });
    expect(enabledUpdates.count).toEqual(0);
    expect(activeUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(One.meta.id);
    expect(enabledUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(0);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.activate(CountEvent);
    expect(enabledUpdates.count).toEqual(1);
    expect(activeUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(0);

    await manager.add(Two.meta.id);
    expect(enabledUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(1);
    expect(pendingResetUpdates.count).toEqual(1);

    await manager.activate(CountEvent);
    expect(enabledUpdates.count).toEqual(2);
    expect(activeUpdates.count).toEqual(2);
    expect(pendingResetUpdates.count).toEqual(2);

    await manager.add(Three.meta.id);
    expect(enabledUpdates.count).toEqual(3);
    expect(activeUpdates.count).toEqual(2);
    expect(pendingResetUpdates.count).toEqual(3);

    await manager.reset(CountEvent);
    expect(enabledUpdates.count).toEqual(3);
    // Starts at 2, plus deactivates 2, plus activates 3.
    expect(activeUpdates.count).toEqual(7);
    expect(pendingResetUpdates.count).toEqual(4);
  });
});
