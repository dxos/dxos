//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContext, type Scope, type CreateScope } from '@radix-ui/react-context';
// eslint-disable-next-line unused-imports/no-unused-imports
import React from 'react';

const ATTENTION_NAME = 'Attention';

type AttentionContextValue = {
  attended: Set<string>;
};

const [AttentionProvider, useAttentionContext] = createContext(ATTENTION_NAME, { attended: new Set() });

const useHasAttention = (attendableId?: string) => {
  const { attended } = useAttentionContext(ATTENTION_NAME);
  return attended.has(attendableId);
};

export { AttentionProvider, useAttentionContext, useHasAttention, ATTENTION_NAME };

export type { AttentionContextValue };
