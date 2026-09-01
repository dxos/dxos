//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useEffect, useMemo, useState } from 'react';

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

/**
 * Subscribe to the attention state for a qualified graph ID.
 */
// TODO(burdon): Unify with selection state and change to contextId?
export const useAttention = (attendableId?: string): Attention => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const [state, setState] = useState<Attention>(UNKNOWN_ATTENDABLE);
  useEffect(() => {
    if (!attendableId || !attention) {
      setState(UNKNOWN_ATTENDABLE);
      return;
    }

    const currentState = attention.get(attendableId);
    setState(currentState);

    return attention.subscribe(attendableId, (newState) => {
      setState(newState);
    });
  }, [attention, attendableId]);

  return state;
};

export const useAttended = () => {
  const { attention } = useAttentionContext(ATTENTION_NAME);
  const [current, setCurrent] = useState<readonly string[]>([]);
  useEffect(() => {
    if (!attention) {
      return;
    }

    setCurrent(attention.getCurrent());

    return attention.subscribeCurrent((newCurrent) => {
      setCurrent(newCurrent);
    });
  }, [attention]);

  return current;
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
