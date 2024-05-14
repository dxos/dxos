//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContext, type Scope, type CreateScope } from '@radix-ui/react-context';
// eslint-disable-next-line unused-imports/no-unused-imports
import React, { type FocusEvent, type HTMLAttributes } from 'react';

const ATTENTION_NAME = 'Attention';

type AttentionContextValue = {
  attended: Set<string>;
};

const [AttentionProvider, useAttentionContext] = createContext(ATTENTION_NAME, { attended: new Set() });

const useHasAttention = (attendableId?: string) => {
  const { attended } = useAttentionContext(ATTENTION_NAME);
  return attended.has(attendableId);
};

/**
 * Computes HTML element attributes to apply so the attention system can detect changes
 * @param attendableId
 */
const useAttendable = (attendableId?: string) => {
  return { 'data-attendable-id': attendableId } as HTMLAttributes<'div'>;
};

const getAttendables = (cursor: FocusEvent['target'], acc: string[] = []): string[] => {
  const closestAttendable = cursor.closest('[data-attendable-id]');
  if (closestAttendable) {
    acc.push(closestAttendable.getAttribute('data-attendable-id')!);
    return getAttendables(closestAttendable, acc);
  } else {
    return acc;
  }
};

const handleFocus = (event: FocusEvent) => {
  const ids = new Set(getAttendables(event.target));
  // TODO(thure): update attention context value
};

export { AttentionProvider, useAttentionContext, useHasAttention, ATTENTION_NAME };

export type { AttentionContextValue };
