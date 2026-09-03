//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MulticastObservable } from '@dxos/async';

import { fromObservable } from './atoms.ts';

describe('fromObservable', () => {
  test('same observable yields the same atom', ({ expect }) => {
    const observable = MulticastObservable.of(1);
    expect(fromObservable(observable)).to.equal(fromObservable(observable));
  });

  test('distinct observables yield distinct atoms', ({ expect }) => {
    expect(fromObservable(MulticastObservable.of(1))).not.to.equal(fromObservable(MulticastObservable.of(1)));
  });

  test('does not read accessors on the observable', ({ expect }) => {
    const observable = MulticastObservable.of(1);
    // A structural key reads every accessor it collects, which throws for subsystems that are
    // absent at runtime, such as `Client.shell` on a runtime with no iframe.
    Object.defineProperty(observable, 'unavailable', {
      enumerable: true,
      get: () => {
        throw new Error('accessor should not be read');
      },
    });

    expect(() => fromObservable(observable)).not.to.throw();
  });
});
