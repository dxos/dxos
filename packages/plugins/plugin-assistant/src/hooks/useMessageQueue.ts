//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Message } from '@dxos/ai';
import { createQueueDxn } from '@dxos/echo-schema';
import { getSpace, useQueue } from '@dxos/react-client/echo';

import { type AIChatType } from '../types';

export const useMessageQueue = (chat?: AIChatType) => {
  const space = getSpace(chat);
  const queueDxn = useMemo(() => {
    const dxn = space && chat?.assistantChatQueue.dxn;
    return dxn ? createQueueDxn(space.id, dxn.parts.at(-1)) : undefined;
  }, [space, chat?.assistantChatQueue.dxn]);

  return useQueue<Message>(queueDxn);
};
