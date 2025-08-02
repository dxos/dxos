//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { createContext } from '@radix-ui/react-context';
import { dedupeWith } from 'effect/Array';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CollaborationActions, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Event } from '@dxos/async';
import { DXN, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { type Expando, getSpace, useQueue, type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps, references } from '@dxos/react-ui-chat';
import { type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { isNotFalsy } from '@dxos/util';

import { type ChatProcessor, useBlueprints, useReferencesProvider } from '../../hooks';
import { meta } from '../../meta';
import { type Assistant } from '../../types';
import {
  ChatActions,
  type ChatActionsProps,
  ChatOptionsMenu,
  ChatPresets,
  type ChatPresetsProps,
  ChatReferences,
  type ChatReferencesProps,
  ChatStatusIndicator,
} from '../ChatPrompt';
import { ChatThread as NativeChatThread, type ChatThreadProps as NativeChatThreadProps } from '../ChatThread';

import { type ChatEvent } from './events';

// TODO(burdon): Factor out.
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
  debug?: boolean;
  event: Event<ChatEvent>;
  space: Space;
  chat: Assistant.Chat;
  processor: ChatProcessor;
  messages: DataType.Message[];

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
  const [debug, setDebug] = useState(false);
  const space = getSpace(chat);

  // Messages.
  const queue = useQueue<DataType.Message>(chat?.queue.dxn);
  const messages = useMemo(
    () =>
      dedupeWith(
        [...(queue?.objects?.filter(Obj.instanceOf(DataType.Message)) ?? []), ...(processor?.messages.value ?? [])],
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
        case 'toggle-debug': {
          setDebug((debug) => !debug);
          break;
        }

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

        default: {
          onEvent?.(event);
        }
      }
    });
  }, [event, onEvent, processor]);

  if (!space) {
    return null;
  }

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      chat={chat}
      space={space}
      processor={processor}
      messages={messages}
      {...props}
    >
      <div role='none' className={mx('flex flex-col h-full overflow-hidden', classNames)}>
        {children}
      </div>
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Thread
//

type ChatThreadProps = Omit<NativeChatThreadProps, 'identity' | 'space' | 'messages' | 'tools' | 'onEvent'>;

const ChatThread = (props: ChatThreadProps) => {
  const { debug, event, space, processor, messages } = useChatContext(ChatThread.displayName);
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

  if (!identity) {
    return null;
  }

  return (
    <NativeChatThread
      {...props}
      ref={scrollerRef}
      debug={debug}
      identity={identity}
      space={space}
      messages={messages}
      tools={processor?.tools}
      onEvent={(ev) => event.emit(ev)}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Prompt
//

type ChatPromptProps = ThemedClassName<
  Pick<ChatEditorProps, 'placeholder'> &
    Omit<ChatPresetsProps, 'onChange'> & {
      expandable?: boolean;
      online?: boolean;
      onChangeOnline?: (online: boolean) => void;
      onChangePreset?: ChatPresetsProps['onChange'];
    }
>;

const ChatPrompt = ({
  classNames,
  placeholder,
  expandable,
  online,
  presets,
  preset,
  onChangePreset,
  onChangeOnline,
}: ChatPromptProps) => {
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

  const [blueprints, handleUpdateBlueprints] = useBlueprints(space, processor.context, processor.blueprintRegistry);

  // TODO(burdon): Reconcile with object tags.
  const contextProvider = useReferencesProvider(space);
  const extensions = useMemo<Extension[]>(() => {
    return [
      contextProvider && references({ provider: contextProvider }),
      expandable &&
        Prec.highest(
          keymap.of([
            {
              key: 'cmd-d',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'toggle-debug' });
                return true;
              },
            },
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
        'is-full grid grid-cols-[var(--rail-action)_1fr_var(--rail-action)] grid-rows-[min-content_min-content_min-content]',
        classNames,
      )}
    >
      <Endcap>
        <ChatStatusIndicator preset={preset} error={processor.error.value} processing={processor.streaming.value} />
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

      <div />
      <ChatReferences
        classNames='col-span-2 flex pis-1 items-center'
        space={space}
        context={processor.context}
        onUpdate={handleUpdateReferences}
      />

      <ChatOptionsMenu
        blueprintRegistry={processor.blueprintRegistry}
        blueprints={blueprints}
        onChange={handleUpdateBlueprints}
      />
      <ChatActions
        classNames='col-span-2'
        microphone={true}
        recording={recording}
        processing={processor.streaming.value}
        onEvent={handleEvent}
      >
        <>
          <div className='grow' />
          {presets && <ChatPresets preset={preset} presets={presets} onChange={onChangePreset} />}
          {online !== undefined && (
            <Input.Root>
              <Input.Switch classNames='mis-2 mie-2' checked={online} onCheckedChange={onChangeOnline} />
            </Input.Root>
          )}
        </>
      </ChatActions>
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
