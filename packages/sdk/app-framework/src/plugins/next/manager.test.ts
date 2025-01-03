//
// Copyright 2025 DXOS.org
//

import { afterEach } from 'node:test';
import { describe, expect, it } from 'vitest';

import { invariant } from '@dxos/invariant';
import { getDebugName } from '@dxos/util';

import { ActivationEvent, defineEvent, PluginManager, StartupEvent } from './manager';
import { contributes, define, defineInterface, type PluginsContext, type Plugin } from './plugin';

const String = defineInterface<{ string: string }>('dxos.org/test/string');
const Number = defineInterface<{ number: number }>('dxos.org/test/number');

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
    const Hello = define({ id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] }, () =>
      contributes(String, { string: 'hello' }),
    );
    const World = define({ id: 'dxos.org/test/world', activationEvents: [StartupEvent.id] }, () =>
      contributes(String, { string: 'world' }),
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
    const Hello = define({ id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] }, () =>
      contributes(String, { string: 'hello' }),
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
    const Hello = define({ id: 'dxos.org/test/hello', activationEvents: [StartupEvent.id] }, () =>
      contributes(String, { string: 'hello' }),
    );
    plugins = [Hello];

    const manager = new PluginManager({
      pluginLoader,
      events: [
        {
          event: StartupEvent,
          onReset: () => {
            count++;
          },
        },
      ],
    });

    {
      await manager.add(Hello.meta.id);
      const result = await manager.activate(StartupEvent);
      expect(result).toEqual(true);
      expect(manager.activatedPlugins).toEqual([Hello]);
    }

    {
      const result = await manager.activate(StartupEvent);
      expect(result).toEqual(false);
    }

    {
      expect(count).toEqual(0);
      const result = await manager.reset(StartupEvent.id);
      expect(result).toEqual(true);
      expect(count).toEqual(1);
    }
  });

  it('should not fire an unknown event', async () => {
    const manager = new PluginManager({ pluginLoader });
    const UnknownEvent = defineEvent('unknown', 'many');
    expect(await manager.activate(UnknownEvent)).toEqual(false);
  });

  it('should be able to register and fire custom activation events', async () => {
    const CountEvent = defineEvent('dxos.org/test/count', 'many');
    const Count = define({ id: 'dxos.org/test/count', activationEvents: [StartupEvent.id] }, () =>
      contributes(ActivationEvent, { event: CountEvent }),
    );

    const One = define({ id: 'dxos.org/test/one', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 1 }),
    );
    const Two = define({ id: 'dxos.org/test/two', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 2 }),
    );
    const Three = define({ id: 'dxos.org/test/three', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 3 }),
    );
    plugins = [Count, One, Two, Three];

    const manager = new PluginManager({ plugins: [Count, One], pluginLoader });
    expect(Array.from(manager.events)).toHaveLength(1);
    await manager.activate(StartupEvent);
    expect(Array.from(manager.events)).toHaveLength(2);

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

  it.only('should be able to remove an active plugin', async () => {
    const state = { number: 0 };
    const computeTotal = (context: PluginsContext) => {
      state.number = context.requestCapability(Number).reduce((acc, n) => acc + n.number, 0);
    };

    const CountEvent = defineEvent('dxos.org/test/count', 'many');
    const Count = define({ id: 'dxos.org/test/count', activationEvents: [StartupEvent.id] }, () =>
      contributes(ActivationEvent, { event: CountEvent }),
    );
    const Total = define(
      { id: 'dxos.org/test/total', activationEvents: [StartupEvent.id], dependentEvents: [CountEvent.id] },
      async (context) => {
        computeTotal(context);
        return contributes(Number, state);
      },
    );

    const One = define({ id: 'dxos.org/test/one', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 1 }),
    );
    const Two = define({ id: 'dxos.org/test/two', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 2 }),
    );
    const Three = define({ id: 'dxos.org/test/three', activationEvents: [CountEvent.id] }, () =>
      contributes(Number, { number: 3 }),
    );

    const manager = new PluginManager({ plugins: [Count, Total, One, Two, Three], pluginLoader });
    await manager.activate(StartupEvent);
    expect(manager.activatedPlugins).toHaveLength(5);
    console.log(getDebugName(manager.context.requestCapability(Number)[0]));
    expect(manager.context.requestCapability(Number)[0].number).toEqual(6);
  });
});
