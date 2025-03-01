//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';

import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType } from '../../types';
import { Thread } from '../Thread';

// TODO(burdon): Since this only wraps Thread, just separate out hook?
export const ThreadContainer = ({ chat }: { chat?: AIChatType }) => {
  const space = getSpace(chat);
  const processor = useChatProcessor(space);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    (text: string) => {
      // TODO(burdon): Don't accept input if still processing.
      if (processor.streaming.value) {
        // await processor.cancel();
        return false;
      }

      requestAnimationFrame(async () => {
        invariant(messageQueue);
        await processor.request(text, {
          history: messageQueue.items,
          onComplete: (messages) => messageQueue.append(messages),
        });
      });

      return true;
    },
    [processor, messageQueue],
  );

  const handleCancel = useCallback(() => {
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  return (
    <Thread
      messages={messages}
      processing={processor.streaming.value}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
