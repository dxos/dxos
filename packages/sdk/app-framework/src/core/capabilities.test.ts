//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-rx/rx-react';
import { Context, Effect, flow } from 'effect';
import { describe, expect, it, onTestFinished } from 'vitest';

import { defineCapability, PluginContext, type InterfaceDef } from './capabilities';
import { runAndForwardErrors } from '@dxos/effect';

const defaultOptions = {
  activate: () => Effect.succeed(false),
  reset: () => Effect.succeed(false),
};

describe('PluginsContext', () => {
  it('should return empty array if no capabilities are contributed', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    expect(context.getCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request capabilities', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation]);
  });

  it('should be able to remove capabilities', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    context.contributeCapability({ interface: interfaceDef, implementation, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation]);
    context.removeCapability(interfaceDef, implementation);
    expect(context.getCapabilities(interfaceDef)).toEqual([]);
  });

  it('should be able to contribute and request multiple implementations', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');
    const implementation1 = { example: 'first' };
    const implementation2 = { example: 'second' };
    context.contributeCapability({ interface: interfaceDef, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef, implementation: implementation2, module: 'test' });
    expect(context.getCapabilities(interfaceDef)).toEqual([implementation1, implementation2]);
  });

  it('should be able to request multiple capabilities', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef1 = defineCapability<{ one: number }>('@dxos/app-framework/test/one');
    const interfaceDef2 = defineCapability<{ two: number }>('@dxos/app-framework/test/two');
    const implementation1 = { one: 1 };
    const implementation2 = { two: 2 };
    context.contributeCapability({ interface: interfaceDef1, implementation: implementation1, module: 'test' });
    context.contributeCapability({ interface: interfaceDef2, implementation: implementation2, module: 'test' });
    expect(context.getCapabilities(interfaceDef1)).toEqual([implementation1]);
    expect(context.getCapabilities(interfaceDef2)).toEqual([implementation2]);
  });

  it('should be reactive', () => {
    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');

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
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');

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
    const context = new PluginContext({ registry, ...defaultOptions });
    const interfaceDef = defineCapability<{ example: string }>('@dxos/app-framework/test/example');

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

describe('Capabilities within effect', () => {
  class CapabilityProvider extends Context.Tag('@dxos/app-framework/CapabilityProvider')<
    CapabilityProvider,
    PluginContext
  >() {
    static provide<I extends InterfaceDef<any>[]>(
      ...interfaceDefs: I
    ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, I[number]> | CapabilityProvider> {
      const provides = interfaceDefs.map((interfaceDef) =>
        Effect.provideServiceEffect(
          interfaceDef,
          CapabilityProvider.pipe(Effect.map((context) => context.getCapabilities(interfaceDef))),
        ),
      );
      return (flow as any)(...provides);
    }
  }

  it('are yieldable and provideable', async () => {
    const Example1 = defineCapability<{ example1: string }>('@dxos/app-framework/test/Example1');
    const Example2 = defineCapability<{ example2: string }>('@dxos/app-framework/test/Example2');

    const registry = Registry.make();
    const context = new PluginContext({ registry, ...defaultOptions });
    context.contributeCapability({ interface: Example1, implementation: { example1: 'identifier1' }, module: 'test' });
    context.contributeCapability({ interface: Example2, implementation: { example2: 'identifier2' }, module: 'test' });

    const a = Effect.gen(function* () {
      const capability1 = yield* Example1;
      const capability2 = yield* Example2;

      console.log({ capability1, capability2 });
      expect(capability1).toEqual([{ example1: 'identifier1' }]);
      expect(capability2).toEqual([{ example2: 'identifier2' }]);
    });

    const b = a.pipe(CapabilityProvider.provide(Example1, Example2));
  });
});
