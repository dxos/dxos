//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import type { Entity, Ref } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';

/**
 * Subscribe to a reference target object.
 * Returns undefined if the reference hasn't loaded yet, and automatically updates when the target loads or changes.
 *
 * @param ref - The reference to subscribe to.
 * @returns The current target object or undefined if not loaded.
 */
export function useRef<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): T | undefined {
  const atom = useMemo(() => AtomRef.make(ref), [ref]);
  return useAtomValue(atom);
}
