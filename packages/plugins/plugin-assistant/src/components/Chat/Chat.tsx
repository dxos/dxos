//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { dedupeWith } from 'effect/Array';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { Message } from '@dxos/ai';
import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/artifact';
import { type BlueprintRegistry } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { DXN, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace, useQueue, type Space } from '@dxos/react-client/echo';
import { type ReferencesOptions } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';

import { useBlueprintHandlers } from './useBlueprintHandlers';
import { type ChatProcessor, useChatProcessor, useContextProvider, useServiceContainer } from '../../hooks';
import { type AIChatType, type AssistantSettingsProps } from '../../types';
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
  // TODO(burdon): Inject into ChatProcessor (effect).
  blueprintRegistry?: BlueprintRegistry;
  handleOpenChange: ChatPromptProps['onOpenChange'];
  handleSubmit: ChatPromptProps['onSubmit'];
  handleCancel: ChatPromptProps['onCancel'];
};

const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = PropsWithChildren<
  {
    part?: 'deck' | 'dialog';
    chat?: AIChatType;
    settings?: AssistantSettingsProps;
    artifact?: AssociatedArtifact;
    /** @deprecated */
    noPluginArtifacts?: boolean;
    onOpenChange?: ChatPromptProps['onOpenChange'];
  } & Pick<ChatContextValue, 'blueprintRegistry'>
>;

// TODO(burdon): Move blueprintRegistry to ChatProcessor (via injection).

const ChatRoot = ({
  children,
  part,
  chat,
  settings,
  artifact,
  onOpenChange,
  noPluginArtifacts,
  ...props
}: ChatRootProps) => {
  const space = getSpace(chat);
  const serviceContainer = useServiceContainer({ space });
  const messageQueue = useQueue<Message>(chat?.queue.dxn);
  const processor = useChatProcessor({ part, chat, space, serviceContainer, artifact, settings, noPluginArtifacts });

  // Event queue.
  const update = useMemo(() => new Event<ChatEvents>(), []);

  // Messages.
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

  if (!space || !processor) {
    return null;
  }

  return (
    <ChatContextProvider
      {...props}
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
  const { update, space, processor, blueprintRegistry, handleOpenChange, handleSubmit, handleCancel } = useChatContext(
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
  const [blueprints, handleSearchBlueprints, handleUpdateBlueprints] = useBlueprintHandlers(
    space,
    processor,
    blueprintRegistry,
  );

  return (
    <NativeChatPrompt
      {...props}
      error={processor?.error.value}
      processing={processor?.streaming.value ?? false}
      blueprints={blueprints}
      onSearchBlueprints={handleSearchBlueprints}
      onUpdateBlueprints={handleUpdateBlueprints}
      references={references}
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
