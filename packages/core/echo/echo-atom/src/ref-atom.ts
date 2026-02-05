//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Ref } from '@dxos/echo';

import { loadRefTarget } from './ref-utils';

/**
 * Atom family for ECHO refs.
 * Uses ref reference as key - same ref returns same atom.
 * This atom only updates once when the ref loads - it does not subscribe to object changes.
 * Use AtomObj.make with a ref if you need reactive snapshots of ECHO objects.
 */
const refFamily = Atom.family(<T>(ref: Ref.Ref<T>): Atom.Atom<T | undefined> => {
  return Atom.make<T | undefined>((get) => {
    return loadRefTarget(ref, get, (target) => target);
  });
});

/**
 * Create a read-only atom for a reference target.
 * Returns undefined if the target hasn't loaded yet.
 * Updates when the ref loads but does NOT subscribe to target object changes.
 * Use AtomObj.make with a ref if you need reactive snapshots of ECHO objects.
 * Uses Atom.family internally - same ref reference returns same atom instance.
 *
 * Supports refs to any target type including ECHO objects and Queues.
 */
export const make = refFamily;
