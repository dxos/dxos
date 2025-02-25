//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Message } from '@dxos/artifact';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { getSpace } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';

import { type AIChatType } from '../types';

export const useMessageQueue = (chat: AIChatType) => {
  const edgeClient = useEdgeClient();
  const space = getSpace(chat);
  const queueDxn = useMemo(
    () => new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space!.id, chat.queue.dxn.parts.at(-1)!]),
    [chat.queue.dxn],
  );

  return useQueue<Message>(edgeClient, queueDxn);
};
