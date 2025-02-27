//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { StackItem } from '@dxos/react-ui-stack';

import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType } from '../../types';
import { Thread } from '../Thread';

export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  const processor = useChatProcessor(chat);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    async (text: string) => {
      if (processor.streaming.value) {
        await processor.cancel();
      }

      invariant(messageQueue);
      await processor.request(text, {
        history: messageQueue.items,
        onComplete: (messages) => messageQueue.append(messages),
      });
    },
    [processor, messageQueue],
  );

  const handleStop = useCallback(() => {
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Thread
        messages={messages}
        streaming={processor.streaming.value}
        collapse={true}
        onSubmit={handleSubmit}
        onSuggest={handleSubmit}
        onStop={handleStop}
      />
    </StackItem.Content>
  );
};
