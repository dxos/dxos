//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { AiContextBinder } from '@dxos/assistant';

import { type Assistant } from '../types';

export const useContextBinder = (chat: Assistant.Chat | undefined): AiContextBinder | undefined => {
  const [binder, setBinder] = useState<AiContextBinder>();

  useEffect(() => {
    if (!chat?.queue.target) {
      return;
    }

    const binder = new AiContextBinder(chat.queue.target);
    binder.open();
    setBinder(binder);

    return () => binder.close();
  }, [chat?.queue.target]);

  return binder;
};
