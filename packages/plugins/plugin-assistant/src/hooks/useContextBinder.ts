//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { AiContextBinder } from '@dxos/assistant';
import { type Queue } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

// NOTE: This takes a queue rather than a chat because the chat may not be in a space yet.
export const useContextBinder = (queue: Queue | undefined): AiContextBinder | undefined => {
  const [binder, setBinder] = useState<AiContextBinder>();

  useAsyncEffect(async () => {
    if (!queue) {
      return;
    }

    const binder = new AiContextBinder(queue);
    await binder.open();
    setBinder(binder);

    return () => {
      void binder.close();
    };
  }, [queue]);

  return binder;
};
