//
// Copyright 2025 DXOS.org
//

import React, { type FC, useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';

import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType } from '../../types';
import { Thread } from '../Thread';

// TODO(burdon): Since this only wraps Thread, just separate out hook?
export const ThreadContainer: FC<ThemedClassName<{ chat?: AIChatType }>> = ({ classNames, chat }) => {
  const space = getSpace(chat);
  const processor = useChatProcessor(space);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    (text: string) => {
      // Don't accept input if still processing.
      if (processor.streaming.value) {
        log.warn('still processing');
        return false;
      }

      invariant(messageQueue);
      void processor.request(text, {
        history: messageQueue.items,
        onComplete: (messages) => {
          messageQueue.append(messages);
        },
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
      classNames={classNames}
      messages={messages}
      processing={processor.streaming.value}
      error={processor.error.value}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
