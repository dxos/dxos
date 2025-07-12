//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { dedupeWith } from 'effect/Array';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { type ExecutableTool, Message } from '@dxos/ai';
import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { Event } from '@dxos/async';
import { DXN, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace, useQueue, type Space } from '@dxos/react-client/echo';
import { type ReferencesOptions } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';

import { useChatProcessor, useContextProvider, useServiceContainer } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';
import { ChatPrompt as NativeChatPrompt, type ChatPromptProps } from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps } from '../ChatThread';
import type { Blueprint } from '@dxos/assistant';

// interface ContextProvider {
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

//
// Context
//

type ChatContextValue = {
  update: Event<string>;
  space: Space;
  messages: Message[];
  error?: Error;
  processing: boolean;
  tools: ExecutableTool[];
  activeBlueprints: readonly Ref.Ref<Blueprint>[];
  handleOpenChange: ChatPromptProps['onOpenChange'];
  handleSubmit: ChatPromptProps['onSubmit'];
  handleCancel: ChatPromptProps['onCancel'];
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = PropsWithChildren<{
  part?: 'deck' | 'dialog';
  chat?: AIChatType;
  settings?: AssistantSettingsProps;
  artifact?: AssociatedArtifact;
  onOpenChange?: ChatPromptProps['onOpenChange'];
}>;

const ChatRoot = ({ children, part, chat, settings, artifact, onOpenChange, ...props }: ChatRootProps) => {
  const update = useMemo(() => new Event<string>(), []);
  const space = getSpace(chat);
  const serviceContainer = useServiceContainer({ space });
  const processor = useChatProcessor({ part, chat, space, serviceContainer, artifact, settings });
  const messageQueue = useQueue<Message>(chat?.queue.dxn);

  // TODO(burdon): Does this update when the queue updates?
  const messages = useMemo(
    () =>
      dedupeWith(
        [...(messageQueue?.objects?.filter(Obj.instanceOf(Message)) ?? []), ...(processor?.messages.value ?? [])],
        (a, b) => a.id === b.id,
      ),
    [messageQueue?.objects, processor?.messages.value],
  );

  // Post last message to document.
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useEffect(() => {
    if (!processor?.streaming.value && messageQueue?.objects) {
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
  }, [messageQueue, artifact, processor?.streaming.value]);

  const handleSubmit = useCallback(
    (text: string) => {
      invariant(processor);
      // Don't accept input if still processing.
      if (processor.streaming.value) {
        log.warn('ignoring submit; still processing.');
        return false;
      }

      // TODO(burdon): Does this cause the dialog to open?
      onOpenChange?.(true);
      update.emit('submit');

      invariant(messageQueue);
      void processor.request(text);

      return true;
    },
    [processor, messageQueue, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    invariant(processor);
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  if (!space) {
    return null;
  }

  return (
    <ChatContextProvider
      update={update}
      space={space}
      messages={messages}
      error={processor?.error.value}
      processing={processor?.streaming.value ?? false}
      tools={processor?.tools ?? []}
      handleOpenChange={onOpenChange}
      handleSubmit={handleSubmit}
      handleCancel={handleCancel}
      activeBlueprints={processor?.blueprints ?? []}
    >
      <div className='flex flex-col grow overflow-hidden'>{children}</div>
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Thread
//

const ChatThread = (props: Omit<ChatThreadProps, 'space' | 'messages' | 'tools' | 'onPrompt'>) => {
  const { update, space, messages, tools, handleSubmit } = useChatContext(ChatThread.displayName);
  const scrollerRef = useRef<ScrollController>(null);
  useEffect(() => {
    return update.on(() => {
      scrollerRef.current?.scrollToBottom('smooth');
    });
  }, [update]);

  return (
    <NativeChatThread
      {...props}
      space={space}
      messages={messages}
      tools={tools}
      onPrompt={handleSubmit}
      ref={scrollerRef}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Prompt
//

const ChatPrompt = (props: Pick<ChatPromptProps, 'classNames' | 'placeholder'>) => {
  const { space, error, processing, handleOpenChange, handleSubmit, handleCancel } = useChatContext(
    ChatPrompt.displayName,
  );

  const contextProvider = useContextProvider(space);
  const references = useMemo<ReferencesOptions | undefined>(() => {
    if (!contextProvider) {
      return;
    }

    return {
      provider: {
        getReferences: async ({ query }) => contextProvider.query({ query }),
        resolveReference: async ({ uri }) => contextProvider.resolveMetadata({ uri }),
      },
    };
  }, [contextProvider]);

  return (
    <NativeChatPrompt
      {...props}
      error={error}
      processing={processing}
      references={references}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};

ChatPrompt.displayName = 'Chat.Prompt';

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Thread: ChatThread,
  Prompt: ChatPrompt,
};

export { useChatContext };
