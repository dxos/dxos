//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import type { Entity, Ref } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';

/**
 * Subscribe to a reference target object.
 * Returns the live object (not a snapshot), or undefined if the reference hasn't loaded yet.
 * Automatically triggers re-renders when the target loads or changes.
 *
 * The returned live object can be passed to useObject for reactive updates and mutations.
 *
 * @param ref - The reference to subscribe to.
 * @returns The live target object or undefined if not loaded.
 */
export function useRef<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): T | undefined {
  const atom = useMemo(() => AtomRef.make(ref), [ref]);
  // Subscribe to the atom to trigger re-renders when the target loads or changes.
  useAtomValue(atom);
  // Return the live object directly (not a snapshot).
  return ref?.target;
}
