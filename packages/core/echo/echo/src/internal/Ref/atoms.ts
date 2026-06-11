//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { loadRefTarget } from './utils';
import type { Ref } from './ref';

/**
 * Atom family for ECHO refs.
 * Uses ref reference as key — same ref returns same atom.
 * This atom only updates once when the ref loads — it does not subscribe to target object changes.
 * Use `Obj.atom(ref)` if you need reactive snapshots of ECHO objects via a ref.
 */
export const refSimpleFamily = Atom.family(<T>(ref: Ref<T>): Atom.Atom<T | undefined> => {
  return Atom.make<T | undefined>((get) => {
    return loadRefTarget(ref, get, (target) => target);
  });
});
