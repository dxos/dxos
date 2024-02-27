//
// Copyright 2024 DXOS.org
//

// NOTE(thure): The following unused imports quell TS2742 (“likely not portable”).

// eslint-disable-next-line unused-imports/no-unused-imports
import { createContextScope, type Scope, type CreateScope } from '@radix-ui/react-context';
// eslint-disable-next-line unused-imports/no-unused-imports
import React from 'react';

const ATTENTION_NAME = 'Attention';

type AttentionScopedProps<P> = P & { __attentionScope?: Scope };

const [createAttentionContext, createAttentionScope] = createContextScope(ATTENTION_NAME, []);

type AttentionContextValue = {
  attended: Set<string>;
};

const [AttentionProvider, useAttentionContext] = createAttentionContext<AttentionContextValue>(ATTENTION_NAME);

const useHasAttention = (attendableId: string, __attentionScope?: Scope) => {
  const { attended } = useAttentionContext(ATTENTION_NAME, __attentionScope);
  return attended.has(attendableId);
};

export { AttentionProvider, createAttentionScope, useAttentionContext, useHasAttention, ATTENTION_NAME };

export type { AttentionContextValue, AttentionScopedProps };
