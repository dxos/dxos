//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { defineCapability, PluginsContext } from './capabilities';

registerSignalsRuntime();

const defaultOptions = {
  activate: () => Promise.resolve(false),
  reset: () => Promise.resolve(false),
};

describe('PluginsContext', () => {
  it('should return empty array if no capabilities are contributed', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    expect(context.requestCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.requestCapabilities(interfaceDef)).toEqual([implementation]);
  });

  it('should be able to remove capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.requestCapabilities(interfaceDef)).toEqual([implementation]);
    context.removeCapability(interfaceDef, implementation);
    expect(context.requestCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request multiple implementations', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation1 = { example: 'first' };
    const implementation2 = { example: 'second' };
    context.contributeCapability({ interface: interfaceDef, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef, implementation: implementation2, module: 'test' });
    expect(context.requestCapabilities(interfaceDef)).toEqual([implementation1, implementation2]);
  });

  it('should be able to request multiple capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef1 = defineCapability<{ one: number }>('@dxos/app-framework/test/one');
    const interfaceDef2 = defineCapability<{ two: number }>('@dxos/app-framework/test/two');
    const implementation1 = { one: 1 };
    const implementation2 = { two: 2 };
    context.contributeCapability({ interface: interfaceDef1, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef2, implementation: implementation2, module: 'test' });
    expect(context.requestCapabilities(interfaceDef1)).toEqual([implementation1]);
    expect(context.requestCapabilities(interfaceDef2)).toEqual([implementation2]);
  });

  it('should be reactive', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');

    using updates = updateCounter(() => {
      context.requestCapabilities(interfaceDef);
    });

    expect(updates.count).toEqual(0);

    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(updates.count).toEqual(1);

    context.removeCapability(interfaceDef, implementation);
    expect(updates.count).toEqual(2);
  });

  it('should not be reactive to changes within the implementation', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');

    using updates = updateCounter(() => {
      context.requestCapabilities(interfaceDef);
    });

    expect(updates.count).toEqual(0);

    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(updates.count).toEqual(1);

    implementation.example = 'updated';
    expect(updates.count).toEqual(1);

    const capabilities = context.requestCapabilities(interfaceDef);
    expect(capabilities).toEqual([implementation]);
    expect(capabilities[0].example).toEqual('updated');
    expect(updates.count).toEqual(1);
  });

  it('should be able to wait for a capability', async () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    const promise = context.waitForCapability(interfaceDef);
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    const capability = await promise;
    expect(capability).toEqual(implementation);
  });
});
