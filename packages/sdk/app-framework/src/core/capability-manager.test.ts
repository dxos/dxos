//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, it, onTestFinished } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Capability from './capability';
import * as CapabilityManager from './capability-manager';
import { CapabilityNotFoundError } from './errors';

describe('CapabilityManager', () => {
  it('should return empty array if no capabilities are contributed', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    expect(capabilityManager.getAll(interfaceDef)).toEqual([]);
  });

  it('should throw when getCapability is called and no capability exists', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    expect(() => capabilityManager.get(interfaceDef)).toThrow(CapabilityNotFoundError);
    expect(capabilityManager.listRegisteredIdentifiers()).toEqual([]);
  });

  it.effect('Capability.get should fail when no capability exists', () =>
    Effect.gen(function* () {
      const registry = Registry.make();
      const capabilityManager = CapabilityManager.make({ registry });
      const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

      const result = yield* Capability.get(interfaceDef).pipe(
        Effect.provideService(Capability.Service, capabilityManager),
        Effect.either,
      );

      expect(result._tag).toEqual('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(CapabilityNotFoundError);
        expect(result.left.context.identifier).toEqual(interfaceDef.identifier);
      }
    }),
  );

  it('should be able to contribute and request capabilities', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    capabilityManager.contribute({ interface: interfaceDef, implementation, module: 'test' });
    expect(capabilityManager.getAll(interfaceDef)).toEqual([implementation]);
    expect(capabilityManager.listRegisteredIdentifiers()).toEqual([interfaceDef.identifier]);
  });

  it('should be able to remove capabilities', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation = { example: 'identifier' };
    capabilityManager.contribute({ interface: interfaceDef, implementation, module: 'test' });
    expect(capabilityManager.getAll(interfaceDef)).toEqual([implementation]);
    capabilityManager.remove(interfaceDef, implementation);
    expect(capabilityManager.getAll(interfaceDef)).toEqual([]);
    expect(capabilityManager.listRegisteredIdentifiers()).toEqual([]);
  });

  it('should be able to contribute and request multiple implementations', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');
    const implementation1 = { example: 'first' };
    const implementation2 = { example: 'second' };
    capabilityManager.contribute({ interface: interfaceDef, implementation: implementation1, module: 'test' });
    capabilityManager.contribute({ interface: interfaceDef, implementation: implementation2, module: 'test' });
    expect(capabilityManager.getAll(interfaceDef)).toEqual([implementation1, implementation2]);
  });

  it('should be able to request multiple capabilities', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef1 = Capability.make<{ one: number }>('@dxos/app-framework/test/one');
    const interfaceDef2 = Capability.make<{ two: number }>('@dxos/app-framework/test/two');
    const implementation1 = { one: 1 };
    const implementation2 = { two: 2 };
    capabilityManager.contribute({ interface: interfaceDef1, implementation: implementation1, module: 'test' });
    capabilityManager.contribute({ interface: interfaceDef2, implementation: implementation2, module: 'test' });
    expect(capabilityManager.getAll(interfaceDef1)).toEqual([implementation1]);
    expect(capabilityManager.getAll(interfaceDef2)).toEqual([implementation2]);
  });

  it('should be reactive', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

    let count = 0;
    const cancel = registry.subscribe(capabilityManager.atom(interfaceDef), () => {
      count++;
    });
    onTestFinished(() => cancel());
    expect(count).toEqual(0);

    registry.get(capabilityManager.atom(interfaceDef));
    expect(count).toEqual(1);

    const implementation = { example: 'identifier' };
    capabilityManager.contribute({ interface: interfaceDef, implementation, module: 'test' });
    expect(count).toEqual(2);

    capabilityManager.remove(interfaceDef, implementation);
    expect(count).toEqual(3);
  });

  it('should not be reactive to changes within the implementation', () => {
    const registry = Registry.make();
    const capabilityManager = CapabilityManager.make({ registry });
    const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

    let count = 0;
    const cancel = registry.subscribe(capabilityManager.atom(interfaceDef), () => {
      count++;
    });
    onTestFinished(() => cancel());
    expect(count).toEqual(0);

    registry.get(capabilityManager.atom(interfaceDef));
    expect(count).toEqual(1);

    const implementation = { example: 'identifier' };
    capabilityManager.contribute({ interface: interfaceDef, implementation, module: 'test' });
    expect(count).toEqual(2);

    implementation.example = 'updated';
    expect(count).toEqual(2);

    const capabilities = capabilityManager.getAll(interfaceDef);
    expect(capabilities).toEqual([implementation]);
    expect(capabilities[0].example).toEqual('updated');
    expect(count).toEqual(2);
  });

  it.effect('should be able to wait for a capability', () =>
    Effect.gen(function* () {
      const registry = Registry.make();
      const capabilityManager = CapabilityManager.make({ registry });
      const interfaceDef = Capability.make<{ example: string }>('@dxos/app-framework/test/example');

      expect(capabilityManager.getAll(interfaceDef)).toHaveLength(0);
      const capability = capabilityManager.waitFor(interfaceDef);

      const implementation = { example: 'identifier' };
      capabilityManager.contribute({ interface: interfaceDef, implementation, module: 'test' });
      expect(yield* capability).toEqual(implementation);
    }),
  );

  describe('contributions', () => {
    it('should provide a live view over multi capability contributions', () => {
      const registry = Registry.make();
      const capabilityManager = CapabilityManager.make({ registry });
      const multi = Capability.makeMulti<{ example: string }>('@dxos/app-framework/test/example');

      const view = capabilityManager.contributions(multi);
      expect(view.get()).toEqual([]);

      const values: (readonly { example: string }[])[] = [];
      const cancel = view.subscribe((current) => values.push(current));
      onTestFinished(() => cancel());

      const first = { example: 'first' };
      const second = { example: 'second' };
      capabilityManager.contribute({ interface: multi, implementation: first, module: 'test-1' });
      expect(view.get()).toEqual([first]);
      capabilityManager.contribute({ interface: multi, implementation: second, module: 'test-2' });
      expect(view.get()).toEqual([first, second]);
      expect(values.at(-1)).toEqual([first, second]);

      capabilityManager.remove(multi, first);
      expect(view.get()).toEqual([second]);
    });

    it('should return a stable view per interface', () => {
      const registry = Registry.make();
      const capabilityManager = CapabilityManager.make({ registry });
      const multi = Capability.makeMulti<{ example: string }>('@dxos/app-framework/test/example');
      expect(capabilityManager.contributions(multi)).toBe(capabilityManager.contributions(multi));
    });
  });
});
