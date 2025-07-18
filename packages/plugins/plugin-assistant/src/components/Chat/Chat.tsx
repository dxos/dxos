//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { createContext } from '@radix-ui/react-context';
import { dedupeWith } from 'effect/Array';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Message } from '@dxos/ai';
import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type ContextBinder, type Blueprint } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { DXN, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { type Expando, getSpace, useQueue, type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTimeout, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps, references } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable, isNotFalsy } from '@dxos/util';

import { useContextProvider, type ChatProcessor } from '../../hooks';
import { meta } from '../../meta';
import { type AIChatType } from '../../types';
import {
  ChatActions,
  type ChatActionsProps,
  type ChatEvent,
  ChatOptionsMenu,
  type ChatOptionsMenuProps,
  ChatReferences,
  type ChatReferencesProps,
  ChatStatusIndicator,
} from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps as NativeChatThreadProps } from '../ChatThread';

const Endcap = ({ children }: PropsWithChildren) => {
  return (
    <div className='grid w-[var(--rail-action)] h-[var(--rail-action)] items-center justify-center'>{children}</div>
  );
};

//
// Context
// NOTE: The context should not be exported. It is only used internally.
// Components outside of this Radix-style group shuld define their own APIs.
//

// TODO(burdon): Inject via effect layer.
type ChatContextValue = {
  event: Event<ChatEvent>;
  space: Space;
  chat: AIChatType;
  processor: ChatProcessor;
  messages: Message[];

  /** @deprecated Remove and replace with context. */
  artifact?: Expando;
};

// NOTE: Do not export.
const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = ThemedClassName<
  PropsWithChildren<
    Pick<ChatContextValue, 'chat' | 'processor' | 'artifact'> & {
      onEvent?: (event: ChatEvent) => void;
    }
  >
>;

const ChatRoot = ({ classNames, children, chat, processor, artifact, onEvent, ...props }: ChatRootProps) => {
  const space = getSpace(chat);

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

  // Events.
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit': {
          if (!processor.streaming.value) {
            void processor.request(event.text);
          }

          break;
        }

        case 'cancel': {
          void processor.cancel();
          break;
        }
      }

      onEvent?.(event);
    });
  }, [event, onEvent]);

  if (!space) {
    return null;
  }

  return (
    <ChatContextProvider event={event} chat={chat} space={space} processor={processor} messages={messages} {...props}>
      <div role='none' className={mx('flex flex-col grow overflow-hidden', classNames)}>
        {children}
      </div>
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Thread
//

type ChatThreadProps = Omit<NativeChatThreadProps, 'identity' | 'space' | 'messages' | 'tools' | 'onPrompt'>;

const ChatThread = (props: ChatThreadProps) => {
  const { event, space, processor, messages } = useChatContext(ChatThread.displayName);
  const identity = useIdentity();

  const scrollerRef = useRef<ScrollController>(null);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit':
        case 'scroll-to-bottom':
          scrollerRef.current?.scrollToBottom('smooth');
          break;
      }
    });
  }, [event]);

  const handlePrompt = useCallback<NonNullable<NativeChatThreadProps['onPrompt']>>(
    (text) => {
      if (!processor.streaming.value) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [processor, event],
  );

  if (!identity) {
    return null;
  }

  return (
    <NativeChatThread
      {...props}
      ref={scrollerRef}
      identity={identity}
      space={space}
      messages={messages}
      tools={processor?.tools}
      onPrompt={handlePrompt}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Prompt
//

type ChatPromptProps = ThemedClassName<Pick<ChatEditorProps, 'placeholder'> & { expandable?: boolean }>;

const ChatPrompt = ({ classNames, placeholder, expandable }: ChatPromptProps) => {
  const { t } = useTranslation(meta.id);
  const { space, event, processor } = useChatContext(ChatPrompt.displayName);

  const [active, setActive] = useState(false);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'record-start':
          setActive(true);
          break;
        case 'record-stop':
          setActive(false);
          break;
      }
    });
  }, [event]);

  const editorRef = useRef<ChatEditorController>(null);

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  const [blueprints, handleUpdateBlueprints] = useBlueprints(processor.context);

  // TODO(burdon): Reconcile with object tags.
  const contextProvider = useContextProvider(space);
  const extensions = useMemo<Extension[]>(() => {
    return [
      contextProvider &&
        references({
          provider: {
            getReferences: async ({ query }) => contextProvider.query({ query }),
            resolveReference: async ({ uri }) => contextProvider.resolveMetadata({ uri }),
          },
        }),
      expandable &&
        Prec.highest(
          keymap.of([
            {
              key: 'cmd-ArrowUp',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-open' });
                return true;
              },
            },
            {
              key: 'cmd-ArrowDown',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-close' });
                return true;
              },
            },
          ]),
        ),
    ].filter(isNotFalsy);
  }, [event, expandable, contextProvider]);

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!processor.streaming.value) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [processor, event],
  );

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  // TODO(burdon): Update context.
  const handleUpdateReferences = useCallback<NonNullable<ChatReferencesProps['onUpdate']>>((ids) => {
    log.info('update', { ids });
  }, []);

  return (
    <div
      className={mx(
        'w-full grid grid-cols-[var(--rail-action)_1fr_min-content] grid-rows-[min-content_var(--rail-action)]',
        classNames,
      )}
    >
      <Endcap>
        <ChatStatusIndicator error={processor.error.value} processing={processor.streaming.value} />
      </Endcap>

      <ChatEditor
        ref={editorRef}
        autoFocus
        lineWrapping
        classNames='col-span-2 pis-1 pbs-2'
        placeholder={placeholder ?? t('prompt placeholder')}
        extensions={extensions}
        onSubmit={handleSubmit}
      />

      <ChatOptionsMenu
        blueprintRegistry={processor.blueprintRegistry}
        blueprints={blueprints}
        onChange={handleUpdateBlueprints}
      />

      <ChatReferences
        classNames='flex pis-1 items-center'
        space={space}
        context={processor.context}
        onUpdate={handleUpdateReferences}
      />

      <ChatActions
        microphone={true}
        recording={recording}
        processing={processor.streaming.value}
        onEvent={handleEvent}
      />
    </div>
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

export type { ChatRootProps, ChatThreadProps, ChatPromptProps, ChatEvent };

// TODO(burdon): Factor out.
const useBlueprints = (context: ContextBinder) => {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  useTimeout(
    async () => {
      const blueprints = (await Ref.Array.loadAll(context.blueprints.value ?? [])).filter(isNonNullable);
      setBlueprints(blueprints);
    },
    0,
    [context],
  );

  const handleUpdateBlueprints = useCallback<NonNullable<ChatOptionsMenuProps['onChange']>>(
    (key: string, active: boolean) => {
      log.info('update', { key, active });
    },
    [],
  );

  return [blueprints, handleUpdateBlueprints] as const;
};
