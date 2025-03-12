//
// Copyright 2025 DXOS.org
//

import React, { type FC, useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';

import { Thread, type ThreadProps } from './Thread';
import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';

export type ThreadContainerProps = {
  chat?: AIChatType;
  settings?: AssistantSettingsProps;
} & Pick<ThreadProps, 'debug' | 'transcription' | 'onOpenChange'>;

// TODO(burdon): Since this only wraps Thread, just separate out hook?
export const ThreadContainer: FC<ThemedClassName<ThreadContainerProps>> = ({
  classNames,
  chat,
  settings,
  onOpenChange,
  ...props
}) => {
  // Push up capabilities hooks out of components.
  const space = getSpace(chat);
  const processor = useChatProcessor(space, settings);
  const messageQueue = useMessageQueue(chat);
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  const handleSubmit = useCallback(
    (text: string) => {
      // Don't accept input if still processing.
      if (processor.streaming.value) {
        log.warn('ignoring submit; still processing.');
        return false;
      }

      onOpenChange?.(true);

      invariant(messageQueue);
      void processor.request(text, {
        history: messageQueue.items,
        onComplete: (messages) => {
          messageQueue.append(messages);
        },
      });

      return true;
    },
    [processor, messageQueue, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  return (
    <Thread
      classNames={classNames}
      space={space}
      messages={messages}
      processing={processor.streaming.value}
      error={processor.error.value}
      tools={processor.tools}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onPrompt={handleSubmit}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
};
