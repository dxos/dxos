//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { type Obj, type Ref } from '@dxos/echo';

/**
 * The loaded targets of `refs`, in order; an unloaded ref is omitted until its target arrives.
 * Resolved through `ref.atom` because refs read off a snapshot carry no resolver, so `.target` stays
 * undefined there, and `ref.atom` tracks loading without re-rendering on each target's edits.
 */
export const useRefTargets = (refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>): Obj.Unknown[] => {
  const targetsAtom = useMemo(
    () => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter((object): object is Obj.Unknown => !!object)),
    [refs],
  );
  return useAtomValue(targetsAtom);
};
