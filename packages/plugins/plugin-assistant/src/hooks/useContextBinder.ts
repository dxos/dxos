//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { AiContextBinder } from '@dxos/assistant';

import { type Assistant } from '../types';

export const useContextBinder = (chat: Assistant.Chat | undefined): AiContextBinder | undefined => {
  const binder = useMemo(() => {
    const queue = chat?.queue.target;
    return queue && new AiContextBinder(queue);
  }, [chat]);

  return binder;
};
