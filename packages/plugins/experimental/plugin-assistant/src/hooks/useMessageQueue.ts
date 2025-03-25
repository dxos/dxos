//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Message } from '@dxos/artifact';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { getSpace, useQueue } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';

import { type AIChatType } from '../types';

export const useMessageQueue = (chat?: AIChatType) => {
  const space = getSpace(chat);
  const queueDxn = useMemo(() => {
    const dxn = space && chat?.queue.dxn;
    return dxn ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, dxn.parts.at(-1)!]) : undefined;
  }, [space, chat?.queue.dxn]);

  return useQueue<Message>(queueDxn);
};
