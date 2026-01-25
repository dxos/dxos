//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Entity, type Ref } from '@dxos/echo';

import { loadRefTarget } from './ref-utils';

/**
 * Create an atom for a reference target that returns the live object when loaded.
 * This atom only updates once when the ref loads - it does not subscribe to object changes.
 * Use AtomObj.make with a ref if you need reactive snapshots.
 */
export function make<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): Atom.Atom<T | undefined> {
  if (!ref) {
    return Atom.make<T | undefined>(() => undefined);
  }

  return Atom.make<T | undefined>((get) => {
    return loadRefTarget(ref, get, (target) => target);
  });
}
