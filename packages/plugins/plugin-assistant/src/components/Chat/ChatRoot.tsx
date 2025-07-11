//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, type FC, useEffect } from 'react';

import { type ExecutableTool, type Message } from '@dxos/ai';
import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { DXN, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace, type Space } from '@dxos/react-client/echo';

import { useChatProcessor, useMessageQueue } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';
import { type ChatPromptProps } from '../ChatPrompt';

// export interface ContextProvider {
//   query({ query }: { query: string }): Promise<ReferenceData[]>;
//   resolveMetadata({ uri }: { uri: string }): Promise<ReferenceData | null>;
// }

// const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
//   (value: string) => {
//     onSubmit?.(value);
//     scroller.current?.scrollToBottom();
//     return true;
//   },
//   [onSubmit],
// );

export type ChatContextValue = {
  space: Space;
  messages: Message[];
  error?: Error;
  processing: boolean;
  tools: ExecutableTool[];
  handleOpenChange: ChatPromptProps['onOpenChange'];
  handleSubmit: ChatPromptProps['onSubmit'];
  handleCancel: ChatPromptProps['onCancel'];
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

export type ChatRootProps = PropsWithChildren<{
  part?: 'deck' | 'dialog';
  chat?: AIChatType;
  settings?: AssistantSettingsProps;
  artifact?: AssociatedArtifact;
  onOpenChange?: ChatPromptProps['onOpenChange'];
}>;

export const ChatRoot: FC<ChatRootProps> = ({ children, part, chat, settings, artifact, onOpenChange, ...props }) => {
  const space = getSpace(chat);
  const processor = useChatProcessor({ part, chat, space, artifact, settings });
  const messageQueue = useMessageQueue(chat);

  // TODO(burdon): !!!
  // TODO(thure): This will be referentially new on every render, is it causing overreactivity?
  const messages = [...(messageQueue?.objects ?? []), ...processor.messages.value];

  // Post last message to document.
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useEffect(() => {
    if (!processor.streaming.value && messageQueue?.objects) {
      const message = messageQueue.objects[messageQueue.objects.length - 1];
      if (space && chat && message && dispatch && artifact) {
        void dispatch(
          createIntent(CollaborationActions.InsertContent, {
            target: artifact,
            object: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [...chat.queue.dxn.parts, message.id])),
            label: 'View proposal',
          }),
        );
      }
    }
  }, [messageQueue, artifact, processor.streaming.value]);

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
        history: messageQueue.objects,
        onComplete: (messages) => {
          void messageQueue.append(messages);
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

  if (!space) {
    return null;
  }

  return (
    <ChatContextProvider
      space={space}
      messages={messages}
      error={processor.error.value}
      processing={processor.streaming.value}
      tools={processor.tools ?? []}
      handleOpenChange={onOpenChange}
      handleSubmit={handleSubmit}
      handleCancel={handleCancel}
    >
      {children}
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

export { useChatContext };
