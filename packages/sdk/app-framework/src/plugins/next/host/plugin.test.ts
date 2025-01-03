//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { defineInterface, PluginsContext } from './plugin';

const defaultOptions = {
  activate: () => Promise.resolve(false),
  reset: () => {},
  subscribe: () => () => {},
};

describe('PluginsContext', () => {
  it('should return empty array if no capabilities are contributed', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineInterface<{ example: string }>('@dxos/app-framework/test/example');
    expect(context.requestCapability(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineInterface<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability(interfaceDef, implementation);
    expect(context.requestCapability(interfaceDef)).toEqual([implementation]);
  });

  it('should be able to remove capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineInterface<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability(interfaceDef, implementation);
    expect(context.requestCapability(interfaceDef)).toEqual([implementation]);
    context.removeCapability(interfaceDef, implementation);
    expect(context.requestCapability(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request multiple implementations', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef = defineInterface<{ example: string }>('@dxos/app-framework/test/example');
    const implementation1 = { example: 'first' };
    const implementation2 = { example: 'second' };
    context.contributeCapability(interfaceDef, implementation1);
    context.contributeCapability(interfaceDef, implementation2);
    expect(context.requestCapability(interfaceDef)).toEqual([implementation1, implementation2]);
  });

  it('should be able to request multiple capabilities', () => {
    const context = new PluginsContext(defaultOptions);
    const interfaceDef1 = defineInterface<{ one: number }>('@dxos/app-framework/test/one');
    const interfaceDef2 = defineInterface<{ two: number }>('@dxos/app-framework/test/two');
    const implementation1 = { one: 1 };
    const implementation2 = { two: 2 };
    context.contributeCapability(interfaceDef1, implementation1);
    context.contributeCapability(interfaceDef2, implementation2);
    expect(context.requestCapability(interfaceDef1)).toEqual([implementation1]);
    expect(context.requestCapability(interfaceDef2)).toEqual([implementation2]);
  });
});
