//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { dedupeWith } from 'effect/Array';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { Message } from '@dxos/ai';
import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Event } from '@dxos/async';
import { DXN, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Expando, getSpace, useQueue, type Space } from '@dxos/react-client/echo';
import { type ReferencesOptions } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';

import { useBlueprintHandlers } from './useBlueprintHandlers';
import { type ChatProcessor, useContextProvider } from '../../hooks';
import { type AIChatType } from '../../types';
import { ChatPrompt as NativeChatPrompt, type ChatPromptProps } from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps } from '../ChatThread';

type ChatEvents = 'submit' | 'scroll';

//
// Context
//

type ChatContextValue = {
  update: Event<ChatEvents>;
  space: Space;
  messages: Message[];
  processor: ChatProcessor;
  handleOpenChange: ChatPromptProps['onOpenChange'];
  handleSubmit: ChatPromptProps['onSubmit'];
  handleCancel: ChatPromptProps['onCancel'];
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = PropsWithChildren<{
  chat?: AIChatType;
  processor?: ChatProcessor;
  // TODO(burdon): Move into processor context? Collection?
  artifact?: Expando;
  onOpenChange?: ChatPromptProps['onOpenChange'];
}>;

const ChatRoot = ({ children, chat, processor, artifact, onOpenChange }: ChatRootProps) => {
  const space = getSpace(chat);

  // Event queue.
  const update = useMemo(() => new Event<ChatEvents>(), []);

  // Messages.
  const queue = useQueue<Message>(chat?.queue.dxn);
  const messages = useMemo(
    () =>
      dedupeWith(
        [...(queue?.objects?.filter(Obj.instanceOf(Message)) ?? []), ...(processor?.messages.value ?? [])],
        (a, b) => a.id === b.id,
      ),
    [queue?.objects, processor?.messages.value],
  );

  // Post last message to document.
  // TODO(burdon): Replace with tool.
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  useEffect(() => {
    if (!processor?.streaming.value && queue?.objects && artifact) {
      const message = queue.objects[queue.objects.length - 1];
      if (dispatch && space && chat && message) {
        void dispatch(
          createIntent(CollaborationActions.InsertContent, {
            target: artifact,
            object: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [...chat.queue.dxn.parts, message.id])),
            label: 'View proposal',
          }),
        );
      }
    }
  }, [queue, processor?.streaming.value]);

  const handleSubmit = useCallback(
    (text: string) => {
      invariant(processor);
      // Don't accept input if still processing.
      if (processor.streaming.value) {
        log.warn('ignoring submit; still processing.');
        return false;
      }

      onOpenChange?.(true);
      update.emit('submit');

      invariant(queue);
      void processor.request(text);

      return true;
    },
    [processor, queue, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    invariant(processor);
    if (processor.streaming.value) {
      void processor.cancel();
    }
  }, [processor]);

  if (!space || !processor) {
    return null;
  }

  return (
    <ChatContextProvider
      update={update}
      space={space}
      messages={messages}
      processor={processor}
      handleOpenChange={onOpenChange}
      handleSubmit={handleSubmit}
      handleCancel={handleCancel}
    >
      <div role='none' className='flex flex-col grow overflow-hidden'>
        {children}
      </div>
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Thread
//

const ChatThread = (props: Omit<ChatThreadProps, 'space' | 'messages' | 'tools' | 'onPrompt'>) => {
  const { update, space, messages, processor, handleSubmit } = useChatContext(ChatThread.displayName);

  const scrollerRef = useRef<ScrollController>(null);
  useEffect(() => {
    return update.on((event) => {
      switch (event) {
        case 'submit':
        case 'scroll':
          scrollerRef.current?.scrollToBottom('smooth');
          break;
      }
    });
  }, [update]);

  return (
    <NativeChatThread
      {...props}
      ref={scrollerRef}
      space={space}
      messages={messages}
      tools={processor?.tools}
      onPrompt={handleSubmit}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Prompt
//

const ChatPrompt = (props: Pick<ChatPromptProps, 'classNames' | 'placeholder' | 'compact'>) => {
  const { update, space, processor, handleOpenChange, handleSubmit, handleCancel } = useChatContext(
    ChatPrompt.displayName,
  );

  const contextProvider = useContextProvider(space);

  // Referenced objects.
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

  // Blueprints.
  const [blueprints, handleSearchBlueprints, handleUpdateBlueprints] = useBlueprintHandlers(space, processor);

  return (
    <NativeChatPrompt
      {...props}
      error={processor?.error.value}
      processing={processor?.streaming.value ?? false}
      references={references}
      blueprints={blueprints}
      blueprintRegistry={processor.blueprintRegistry}
      onSearchBlueprints={handleSearchBlueprints}
      onUpdateBlueprints={handleUpdateBlueprints}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onScroll={() => update.emit('scroll')}
      onOpenChange={handleOpenChange}
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
