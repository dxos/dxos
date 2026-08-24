//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capability from '../core/capability';
import * as CapabilityManager from '../core/capability-manager';
import { AtomRegistry, getAtomValue, getAtomValueOption } from './capabilities';

const Counter = Capability.makeSingleton<Atom.Writable<number>>()('org.dxos.test.capability.counter');

/**
 * A capability manager holding whichever of the two capabilities the case wants contributed. The
 * point of the optional helpers is a host that has a manager but not the app's UI capabilities, so
 * the registry and the atom are contributed independently.
 */
const setup = ({ withRegistry = true, withAtom = true } = {}) => {
  const registry = Registry.make();
  const manager = CapabilityManager.make({ registry });
  const atom = Atom.make(1);
  if (withRegistry) {
    manager.contribute({ module: 'test', interface: AtomRegistry, implementation: registry });
  }
  if (withAtom) {
    manager.contribute({ module: 'test', interface: Counter, implementation: atom });
  }
  return { manager, atom, registry };
};

describe('getAtomValueOption', () => {
  it.effect('reads the value when both the registry and the atom are contributed', () =>
    Effect.gen(function* () {
      const { manager } = setup();
      const value = yield* getAtomValueOption(Counter).pipe(Effect.provideService(Capability.Service, manager));
      expect(value).toEqual(Option.some(1));
    }),
  );

  it.effect('is none when the atom capability is uncontributed', () =>
    Effect.gen(function* () {
      const { manager } = setup({ withAtom: false });
      const value = yield* getAtomValueOption(Counter).pipe(Effect.provideService(Capability.Service, manager));
      expect(Option.isNone(value)).toBe(true);
    }),
  );

  // The headless case: a worker contributes no atom registry at all.
  it.effect('is none when the atom registry itself is uncontributed', () =>
    Effect.gen(function* () {
      const { manager } = setup({ withRegistry: false });
      const value = yield* getAtomValueOption(Counter).pipe(Effect.provideService(Capability.Service, manager));
      expect(Option.isNone(value)).toBe(true);
    }),
  );

  it.effect('fails where the non-optional helper is used against the same empty manager', () =>
    Effect.gen(function* () {
      const { manager } = setup({ withAtom: false });
      const result = yield* getAtomValue(Counter).pipe(
        Effect.provideService(Capability.Service, manager),
        Effect.result,
      );
      expect(result._tag).toBe('Failure');
    }),
  );
});
