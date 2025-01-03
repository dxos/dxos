//
// Copyright 2025 DXOS.org
//

import { afterEach } from 'node:test';
import { describe, expect, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import { StartupEvent } from './core';
import { PluginManager } from './manager';
import { contributes, define, defineInterface, type PluginsContext, type Plugin, defineEvent } from './plugin';

const String = defineInterface<{ string: string }>('dxos.org/test/string');
const Number = defineInterface<{ number: number }>('dxos.org/test/number');
const Total = defineInterface<{ total: number }>('dxos.org/test/total');

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
    const Hello = define(
      { id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] },
      { activate: () => contributes(String, { string: 'hello' }) },
    );
    const World = define(
      { id: 'dxos.org/test/world', activationEvents: [StartupEvent.id] },
      { activate: () => contributes(String, { string: 'world' }) },
    );
    plugins = [Hello, World];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(Hello.meta.id);
    expect(manager.unactivatedPlugins).toEqual([Hello]);
    await manager.add(World.meta.id);
    expect(manager.unactivatedPlugins).toEqual([Hello, World]);
    await manager.remove(Hello.meta.id);
    expect(manager.unactivatedPlugins).toEqual([World]);
  });

  it('should be able to activate plugins', async () => {
    const Hello = define(
      { id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] },
      { activate: () => contributes(String, { string: 'hello' }) },
    );
    plugins = [Hello];

    const manager = new PluginManager({ pluginLoader });
    await manager.add(Hello.meta.id);
    expect(manager.unactivatedPlugins).toEqual([Hello]);
    expect(manager.activatedPlugins).toEqual([]);
    await manager.activate(StartupEvent);
    expect(manager.unactivatedPlugins).toEqual([]);
    expect(manager.activatedPlugins).toEqual([Hello]);
  });

  it('should be able to reset an activation event', async () => {
    let count = 0;
    const Hello = define(
      { id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] },
      {
        activate: () => {
          count++;
          return contributes(String, { string: 'hello' });
        },
      },
    );
    plugins = [Hello];

    const manager = new PluginManager({ pluginLoader, events: [StartupEvent] });

    {
      await manager.add(Hello.meta.id);
      const result = await manager.activate(StartupEvent);
      expect(result).toEqual(true);
      expect(manager.activatedPlugins).toEqual([Hello]);
      expect(count).toEqual(1);
    }

    {
      const result = await manager.activate(StartupEvent);
      expect(result).toEqual(false);
    }

    {
      const result = await manager.reset(Hello.meta.id);
      expect(result).toEqual(true);
      expect(count).toEqual(2);
    }

    {
      const result = await manager.reset();
      expect(result).toEqual(true);
      expect(count).toEqual(3);
    }
  });

  it('should not fire an unknown event', async () => {
    const manager = new PluginManager({ pluginLoader });
    const UnknownEvent = defineEvent('unknown', 'many');
    expect(await manager.activate(UnknownEvent)).toEqual(false);
  });

  it('should be able to register and fire custom activation events', async () => {
    const CountEvent = defineEvent('dxos.org/test/count', 'many');
    const Count = define(
      { id: 'dxos.org/test/count', activationEvents: [StartupEvent.id] },
      { register: [CountEvent] },
    );

    const One = define(
      { id: 'dxos.org/test/one', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 1 })] },
    );
    const Two = define(
      { id: 'dxos.org/test/two', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 2 })] },
    );
    const Three = define(
      { id: 'dxos.org/test/three', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 3 })] },
    );
    plugins = [Count, One, Two, Three];

    const manager = new PluginManager({ plugins: [Count, One], pluginLoader });
    await manager.activate(StartupEvent);

    expect(manager.activatedPlugins).toEqual([Count]);
    expect(manager.context.requestCapability(Number)).toHaveLength(0);
    await manager.activate(CountEvent);
    expect(manager.activatedPlugins).toEqual([Count, One]);
    expect(manager.context.requestCapability(Number)).toHaveLength(1);

    await manager.add(Two.meta.id);
    await manager.activate(CountEvent);
    expect(manager.activatedPlugins).toEqual([Count, One, Two]);
    expect(manager.context.requestCapability(Number)).toHaveLength(2);

    await manager.add(Three.meta.id);
    await manager.activate(CountEvent);
    expect(manager.activatedPlugins).toEqual([Count, One, Two, Three]);
    expect(manager.context.requestCapability(Number)).toHaveLength(3);
  });

  it('should be able to register dependent activation events', async () => {
    const CountEvent = defineEvent('dxos.org/test/count', 'many');
    const Count = define(
      { id: 'dxos.org/test/count', activationEvents: [StartupEvent.id], dependentEvents: [CountEvent.id] },
      { register: [CountEvent] },
    );

    const One = define(
      { id: 'dxos.org/test/one', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 1 })] },
    );
    const Two = define(
      { id: 'dxos.org/test/two', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 2 })] },
    );
    const Three = define(
      { id: 'dxos.org/test/three', activationEvents: [CountEvent.id] },
      { activate: () => [contributes(Number, { number: 3 })] },
    );
    plugins = [Count, One, Two, Three];

    const manager = new PluginManager({ plugins: [Count, One], pluginLoader });
    await manager.activate(StartupEvent);
    expect(manager.activatedPlugins).toEqual([One, Count]);
    expect(manager.context.requestCapability(Number)).toHaveLength(1);

    await manager.add(Two.meta.id);
    expect(manager.activatedPlugins).toEqual([One, Count, Two]);
    expect(manager.context.requestCapability(Number)).toHaveLength(2);

    await manager.add(Three.meta.id);
    expect(manager.activatedPlugins).toEqual([One, Count, Two, Three]);
    expect(manager.context.requestCapability(Number)).toHaveLength(3);
  });

  it('should be able to remove and re-add an active plugin', async () => {
    const state = { total: 0 };
    const computeTotal = (context: PluginsContext) => {
      const numbers = context.requestCapability(Number);
      state.total = numbers.reduce((acc, n) => acc + n.number, 0);
    };

    let unsubscribe: () => void;
    const trigger = new Trigger();
    const CountEvent = defineEvent('dxos.org/test/count', 'once');
    const Count = define(
      { id: 'dxos.org/test/count', activationEvents: [StartupEvent.id], dependentEvents: [CountEvent.id] },
      {
        register: [CountEvent],
        activate: (context) => {
          computeTotal(context);
          unsubscribe = context.subscribe(async (meta) => {
            if (meta.activationEvents?.includes(CountEvent.id)) {
              await manager.activate(CountEvent);
              computeTotal(context);
              trigger.wake();
            }
          });
          return contributes(Total, state);
        },
        deactivate: () => {
          unsubscribe?.();
        },
      },
    );

    const One = define(
      { id: 'dxos.org/test/one', activationEvents: [CountEvent.id] },
      { activate: () => contributes(Number, { number: 1 }) },
    );
    const Two = define(
      { id: 'dxos.org/test/two', activationEvents: [CountEvent.id] },
      { activate: () => contributes(Number, { number: 2 }) },
    );
    const Three = define(
      { id: 'dxos.org/test/three', activationEvents: [CountEvent.id] },
      { activate: () => contributes(Number, { number: 3 }) },
    );
    plugins = [Count, One, Two, Three];

    const manager = new PluginManager({ plugins: [Count, One, Two, Three], pluginLoader });
    {
      await manager.activate(StartupEvent);
      expect(manager.activatedPlugins).toHaveLength(4);
      expect(manager.needsReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.remove(One.meta.id);
      expect(manager.activatedPlugins).toHaveLength(3);
      expect(manager.needsReset).toEqual([Count.meta.id]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(6);
    }

    {
      await manager.reset(Count.meta.id);
      expect(manager.activatedPlugins).toHaveLength(3);
      expect(manager.needsReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(5);
    }

    {
      await manager.remove(Count.meta.id);
      expect(manager.activatedPlugins).toHaveLength(2);
      expect(manager.needsReset).toEqual(['*']);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(0);
    }

    {
      await manager.reset();
      expect(manager.activatedPlugins).toHaveLength(0);
      expect(manager.needsReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(0);
    }

    {
      await manager.add(Count.meta.id);
      expect(manager.activatedPlugins).toHaveLength(0);
      expect(manager.needsReset).toEqual(['*']);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(0);
    }

    {
      await manager.reset();
      expect(manager.activatedPlugins).toHaveLength(3);
      expect(manager.needsReset).toEqual([]);

      const totals = manager.context.requestCapability(Total);
      expect(totals).toHaveLength(1);
      expect(totals[0].total).toEqual(5);
    }
  });
});
