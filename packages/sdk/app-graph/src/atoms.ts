//
// Copyright 2025 DXOS.org
//

import * as Equal from 'effect/Equal';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { type MulticastObservable } from '@dxos/async';

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
  // Keyed by reference because the family's default structural key collects every accessor on the
  // observable's prototype chain and reads each one, throwing on those whose subsystem is absent
  // (e.g. `Client.shell` on a runtime with no iframe).
  return observableFamily(Equal.byReferenceUnsafe(observable)) as Atom.Atom<T>;
};
