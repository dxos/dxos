//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import type { Entity, Ref } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';

/** Constant atom that always returns undefined (for when ref is undefined). */
const UNDEFINED_ATOM: Atom.Atom<undefined> = Atom.make(() => undefined);

/**
 * Subscribe to a reference target object.
 * Returns undefined if the reference is undefined or hasn't loaded yet.
 * Automatically updates when the target loads or changes.
 *
 * @param ref - The reference to subscribe to.
 * @returns The current target object or undefined if not loaded.
 */
export function useRef<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): T | undefined {
  const atom = useMemo(() => (ref ? AtomRef.make(ref) : UNDEFINED_ATOM), [ref]);
  return useAtomValue(atom) as T | undefined;
}
