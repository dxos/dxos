//
// Copyright 2026 DXOS.org
//

import { type Ref, type RefCallback, useCallback } from 'react';

import { mergeRefs } from './useForwardedRef';

export type PossibleRef<T> = Ref<T> | undefined;

/**
 * Composes several refs into one callback ref.
 * Each ref receives the node; a callback ref that returns a cleanup keeps it (React 19).
 */
export const composeRefs = <T>(...refs: PossibleRef<T>[]): RefCallback<T> => mergeRefs(refs);

/**
 * Memoised {@link composeRefs}; the callback identity changes only when a ref does.
 */
export const useComposedRefs = <T>(...refs: PossibleRef<T>[]): RefCallback<T> =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useCallback(composeRefs(...refs), refs);
