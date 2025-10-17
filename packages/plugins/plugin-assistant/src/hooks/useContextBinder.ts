//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { AiContextBinder } from '@dxos/assistant';
import { useAsyncEffect } from '@dxos/react-ui';

import { type Assistant } from '../types';

export const useContextBinder = (chat: Assistant.Chat | undefined): AiContextBinder | undefined => {
  const [binder, setBinder] = useState<AiContextBinder>();

  useAsyncEffect(async () => {
    if (!chat?.queue.target) {
      return;
    }

    const binder = new AiContextBinder(chat.queue.target);
    await binder.open();
    setBinder(binder);

    return () => {
      void binder.close();
    };
  }, [chat?.queue.target]);

  return binder;
};
