//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { describe, expect, it, onTestFinished } from 'vitest';

import * as Capability from './capability';

const defaultOptions = {
  activate: () => Effect.succeed(false),
  reset: () => Effect.succeed(false),
};

describe('PluginsContext', () => {
  it('should return empty array if no capabilities are contributed', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    expect(context.getCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request capabilities', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation]);
  });

  it('should be able to remove capabilities', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation]);
    context.removeCapability(interfaceDef, implementation);
    expect(context.getCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request multiple implementations', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation1 = { example: 'first' };
    const implementation2 = { example: 'second' };
    context.contributeCapability({ interface: interfaceDef, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef, implementation: implementation2, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation1, implementation2]);
  });

  it('should be able to request multiple capabilities', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef1 = Capability.make<{ one: number }>('@dxos/app-framework/test/one');
    const interfaceDef2 = Capability.make<{ two: number }>('@dxos/app-framework/test/two');
    const implementation1 = { one: 1 };
    const implementation2 = { two: 2 };
    context.contributeCapability({ interface: interfaceDef1, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef2, implementation: implementation2, module: 'test' });
    expect(context.getCapabilities(interfaceDef1)).toEqual([implementation1]);
    expect(context.getCapabilities(interfaceDef2)).toEqual([implementation2]);
  });

  it('should be reactive', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

    let count = 0;
    const cancel = registry.subscribe(context.capabilities(interfaceDef), () => {
      count++;
    });
    onTestFinished(() => cancel());
    expect(count).toEqual(0);

    registry.get(context.capabilities(interfaceDef));
    expect(count).toEqual(1);

    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(count).toEqual(2);

    context.removeCapability(interfaceDef, implementation);
    expect(count).toEqual(3);
  });

  it('should not be reactive to changes within the implementation', () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

    let count = 0;
    const cancel = registry.subscribe(context.capabilities(interfaceDef), () => {
      count++;
    });
    onTestFinished(() => cancel());
    expect(count).toEqual(0);

    registry.get(context.capabilities(interfaceDef));
    expect(count).toEqual(1);

    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(count).toEqual(2);

    implementation.example = 'updated';
    expect(count).toEqual(2);

    const capabilities = context.getCapabilities(interfaceDef);
    expect(capabilities).toEqual([implementation]);
    expect(capabilities[0].example).toEqual('updated');
    expect(count).toEqual(2);
  });

  it('should be able to wait for a capability', async () => {
    const registry = Registry.make();
    const context = new Capability.PluginContextImpl({ registry, ...defaultOptions });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

    let capability: { example: string } | undefined;
    const cancel = registry.subscribe(context.capabilities(interfaceDef), (capabilities) => {
      capability = capabilities[0];
    });
    onTestFinished(() => cancel());
    registry.get(context.capabilities(interfaceDef));
    expect(capability).toBeUndefined();

    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(capability).toEqual(implementation);
  });
});
