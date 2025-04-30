//
// Copyright 2025 DXOS.org
//

import React, { useCallback, type FC, useEffect } from 'react';

import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { makeRef, refFromDXN } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';

import { Thread, type ThreadProps } from './Thread';
import { useChatProcessor, useContextProvider, useMessageQueue } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';

export type ThreadContainerProps = {
  chat?: AIChatType;
  settings?: AssistantSettingsProps;
  part?: 'deck' | 'dialog';
  associatedArtifact?: AssociatedArtifact;
} & Pick<ThreadProps, 'debug' | 'transcription' | 'onOpenChange'>;

// TODO(burdon): Since this only wraps Thread, just separate out hook?
export const ThreadContainer: FC<ThemedClassName<ThreadContainerProps>> = ({
  classNames,
  chat,
  settings,
  part,
  associatedArtifact,
  onOpenChange,
  ...props
}) => {
  const space = getSpace(chat);
  const contextProvider = useContextProvider(space);
  const processor = useChatProcessor({ chat, space, settings, part, associatedArtifact });
  const messageQueue = useMessageQueue(chat);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  // TODO(thure): This will be referentially new on every render, is it causing overreactivity?
  const messages = [...(messageQueue?.items ?? []), ...processor.messages.value];

  // Post last message to document.
  useEffect(() => {
    if (!processor.streaming.value && messageQueue?.items) {
      const message = messageQueue.items[messageQueue.items.length - 1];
      if (chat && message && dispatch && associatedArtifact) {
        void dispatch(
          createIntent(CollaborationActions.InsertContent, {
            target: makeRef(associatedArtifact),
            message: refFromDXN(new DXN(DXN.kind.QUEUE, [...chat.assistantChatQueue.dxn.parts, message.id])),
            label: 'View proposal',
          }),
        );
      }
    }
  }, [messageQueue, associatedArtifact, processor.streaming.value]);

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
      contextProvider={contextProvider}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onPrompt={handleSubmit}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
};
