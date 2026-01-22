//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { effect } from '@preact/signals-core';

import { type MulticastObservable } from '@dxos/async';

/**
 * Creates an Atom.Atom<T> from a callback which accesses signals.
 * Will return a new atom instance each time.
 */
export const fromSignal = <T>(cb: () => T): Atom.Atom<T> => {
  return Atom.make((get) => {
    const dispose = effect(() => {
      get.setSelf(cb());
    });

    get.addFinalizer(() => dispose());

    return cb();
  });
};

const observableFamily = Atom.family((observable: MulticastObservable<any>) => {
  return Atom.make((get) => {
    const subscription = observable.subscribe((value) => get.setSelf(value));

    get.addFinalizer(() => subscription.unsubscribe());

    return observable.get();
  });
});

/**
 * Creates an Atom.Atom<T> from a MulticastObservable<T>
 * Will return the same atom instance for the same observable.
 */
export const fromObservable = <T>(observable: MulticastObservable<T>): Atom.Atom<T> => {
  return observableFamily(observable) as Atom.Atom<T>;
};
