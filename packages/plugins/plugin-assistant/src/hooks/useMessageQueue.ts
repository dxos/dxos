//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Message } from '@dxos/ai';
import { createQueueDXN } from '@dxos/echo-schema';
import { getSpace, useQueue } from '@dxos/react-client/echo';

import { type AIChatType } from '../types';

export const useMessageQueue = (chat?: AIChatType) => {
  const space = getSpace(chat);
  const queueDxn = useMemo(() => {
    // TODO(dmaretskyi): Chat.queue.dxn should be a valid DXN already.
    const dxn = space && chat?.queue.dxn;
    return dxn ? createQueueDXN(space.id, dxn.parts.at(-1)) : undefined;
  }, [space, chat?.queue.dxn]);

  return useQueue<Message>(queueDxn);
};
