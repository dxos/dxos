//
// Copyright 2024 DXOS.org
//

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { createContext } from '@dxos/react-hooks';

import { ATTENDABLE_ATTRIBUTE, type Attention, AttentionManager } from '../../types/Attention.ts';

// Kept out of `AttentionProvider.tsx`: react-refresh only fast-refreshes a module whose exports are
// all components, so the context and hooks exported beside them force a full page reload on every edit.

export const ATTENTION_NAME = 'Attention';
export const ATTENTION_SOURCE_ATTRIBUTE = 'data-w-attention-source';

export type AttentionContextValue = {
  attention: AttentionManager;
};

export const [AttentionContextProvider, useAttentionContext] = createContext<AttentionContextValue>(ATTENTION_NAME, {
  attention: undefined as unknown as AttentionManager,
});

export const UNKNOWN_ATTENDABLE = { hasAttention: false, isAncestor: false, isRelated: false } as Attention;

/** Stable snapshot for `useAttended` when there is nothing to subscribe to. */
const NO_ATTENDED: readonly string[] = [];

/** Stable no-op unsubscribe for when there is no id/manager to subscribe to. */
const noopUnsubscribe = () => {};

/**
 * Subscribe to the attention state for a qualified graph ID.
 * Reads synchronously via `useSyncExternalStore` so the first render (and any update fired during
 * a layout effect, before paint) already reflects the manager's current state.
 */
// TODO(burdon): Unify with selection state and change to contextId?
export const useAttention = (attendableId?: string): Attention => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      !attendableId || !attention ? noopUnsubscribe : attention.subscribe(attendableId, onStoreChange),
    [attention, attendableId],
  );
  const getSnapshot = useCallback(
    () => (attendableId && attention ? attention.get(attendableId) : UNKNOWN_ATTENDABLE),
    [attention, attendableId],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useAttended = (): readonly string[] => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const subscribe = useCallback(
    (onStoreChange: () => void) => (!attention ? noopUnsubscribe : attention.subscribeCurrent(onStoreChange)),
    [attention],
  );
  const getSnapshot = useCallback(() => (attention ? attention.getCurrent() : NO_ATTENDED), [attention]);

  return useSyncExternalStore(subscribe, getSnapshot);
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes.
 */
export const useAttentionAttributes = (attendableId?: string) => {
  const { hasAttention } = useAttention(attendableId);
  return useMemo(() => {
    const attributes: Record<string, string | undefined> = { [ATTENDABLE_ATTRIBUTE]: attendableId };
    if (hasAttention) {
      attributes[ATTENTION_SOURCE_ATTRIBUTE] = 'true';
    }

    return attributes;
  }, [attendableId, hasAttention]);
};
