//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useRxValue } from '@effect-rx/rx-react';
import { createContext } from '@radix-ui/react-context';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { fullyQualifiedId, getSpace, useQueue } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, type ThemedClassName, useDynamicRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps, references } from '@dxos/react-ui-chat';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { useChatToolbarActions, useReferencesProvider } from '../../hooks';
import { meta } from '../../meta';
import { type AiChatProcessor } from '../../processor';
import { type Assistant } from '../../types';
import {
  ChatActions,
  type ChatActionsProps,
  ChatOptions,
  type ChatPresetsProps,
  ChatReferences,
  ChatStatusIndicator,
} from '../ChatPrompt';
import {
  type ChatThreadController,
  ChatThread as NaturalChatThread,
  type ChatThreadProps as NaturalChatThreadProps,
} from '../ChatThread';

import { type ChatEvent } from './events';

//
// Context
// NOTE: The context should not be exported. It is only used internally.
// Components outside of this Radix-style group shuld define their own APIs.
//

type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  chat?: Assistant.Chat;
  messages: DataType.Message[];
  processor: AiChatProcessor;
};

export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'chat' | 'processor'> & {
    onEvent?: (event: ChatEvent) => void;
  }
>;

const ChatRoot = ({ children, chat, processor, onEvent, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const pending = useRxValue(processor.messages);
  const streaming = useRxValue(processor.streaming);
  const lastPrompt = useRef<string | undefined>(undefined);

  // Messages.
  const queue = useQueue<DataType.Message>(chat?.queue.dxn);
  const messages = useMemo(() => {
    const queueMessages = queue?.objects?.filter(Obj.instanceOf(DataType.Message)) ?? [];
    return Array.dedupeWith([...queueMessages, ...pending], ({ id: a }, { id: b }) => a === b);
  }, [queue?.objects, pending]);

  // Events.
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(
    () =>
      event.on((ev) => {
        switch (ev.type) {
          case 'toggle-debug': {
            setDebug((current) => !current);
            break;
          }

          case 'submit': {
            const text = ev.text.trim();
            if (!streaming && text.length) {
              lastPrompt.current = ev.text;
              void processor.request({ message: text });
            }
            break;
          }

          case 'retry': {
            if (!streaming) {
              void processor.retry();
            }
            break;
          }

          case 'cancel': {
            if (streaming) {
              void processor.cancel();
              if (lastPrompt.current) {
                event.emit({ type: 'update-prompt', text: lastPrompt.current });
              }
            }
            break;
          }

          default: {
            onEvent?.(ev);
          }
        }
      }),
    [event, processor, streaming, onEvent],
  );

  return (
    <ChatContextProvider debug={debug} event={event} chat={chat} messages={messages} processor={processor} {...props}>
      {children}
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Content
//

type ChatContentProps = ThemedClassName<PropsWithChildren>;

const ChatContent = ({ classNames, children }: ChatContentProps) => (
  <div role='none' className={mx('flex flex-col bs-full is-full', classNames)}>
    {children}
  </div>
);

//
// Prompt
//

type ChatPromptProps = ThemedClassName<
  {
    outline?: boolean;
    settings?: boolean;
  } & Pick<ChatEditorProps, 'placeholder'> &
    Omit<ChatPresetsProps, 'onChange'> & {
      expandable?: boolean;
      online?: boolean;
      onOnlineChange?: (online: boolean) => void;
      onPresetChange?: ChatPresetsProps['onChange'];
    }
>;

const ChatPrompt = ({
  classNames,
  outline,
  settings = true,
  placeholder,
  expandable,
  online,
  presets,
  preset,
  onPresetChange,
  onOnlineChange,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.id);
  const { chat, processor, event } = useChatContext(ChatPrompt.displayName);
  const space = getSpace(chat);

  const error = useRxValue(processor.error).pipe(Option.getOrUndefined);
  const streaming = useRxValue(processor.streaming);
  const active = useRxValue(processor.active);
  const activeRef = useDynamicRef(active);

  const editorRef = useRef<ChatEditorController>(null);
  const [recordingState, setRecordingState] = useState(false);
  useEffect(
    () =>
      event.on((event) => {
        switch (event.type) {
          case 'update-prompt':
            if (!editorRef.current?.getText()?.length) {
              editorRef.current?.setText(event.text);
              editorRef.current?.focus();
            }
            break;
          case 'record-start':
            setRecordingState(true);
            break;
          case 'record-stop':
            setRecordingState(false);
            break;
        }
      }),
    [event],
  );

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active: recordingState,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  // TODO(burdon): Reconcile with object tags.
  const referencesProvider = useReferencesProvider(space);
  const extensions = useMemo<Extension[]>(
    () =>
      [
        referencesProvider && references({ provider: referencesProvider }),
        Prec.highest(
          keymap.of(
            [
              {
                key: 'cmd-d',
                preventDefault: true,
                run: () => {
                  event.emit({ type: 'toggle-debug' });
                  return true;
                },
              },
              expandable && {
                key: 'cmd-ArrowUp',
                preventDefault: true,
                run: () => {
                  event.emit({ type: 'thread-open' });
                  return true;
                },
              },
              expandable && {
                key: 'cmd-ArrowDown',
                preventDefault: true,
                run: () => {
                  event.emit({ type: 'thread-close' });
                  return true;
                },
              },
            ].filter(isTruthy),
          ),
        ),
      ].filter(isTruthy),
    [event, expandable, referencesProvider],
  );

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!activeRef.current) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [event],
  );

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  return (
    <div
      role='group'
      className={mx(
        'flex flex-col is-full density-fine',
        outline && [
          'p-2 bg-groupSurface border border-subduedSeparator transition transition-border [&:has(.cm-content:focus)]:border-separator rounded',
        ],
        classNames,
      )}
    >
      <div role='none' className='flex gap-2'>
        <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />

        <ChatEditor
          ref={editorRef}
          autoFocus
          lineWrapping
          classNames='col-span-2 pbs-0.5'
          placeholder={placeholder ?? t('prompt placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      {space && settings && (
        <div role='none' className='flex pbs-2 items-center overflow-hidden'>
          <ChatOptions
            space={space}
            blueprintRegistry={processor.blueprintRegistry}
            context={processor.context}
            preset={preset}
            presets={presets}
            onPresetChange={onPresetChange}
          />

          <div role='none' className='flex grow overflow-x-auto scrollbar-none'>
            <ChatReferences space={space} context={processor.context} />
          </div>

          <ChatActions
            classNames='col-span-2'
            microphone={true}
            recording={recording}
            processing={streaming}
            onEvent={handleEvent}
          >
            {/* TODO(burdon): Move switch into dialog. */}
            {online !== undefined && (
              <Input.Root>
                <Input.Label srOnly>{t('online switch label')}</Input.Label>
                <Input.Switch classNames='mli-2' checked={online} onCheckedChange={onOnlineChange} />
              </Input.Root>
            )}
          </ChatActions>
        </div>
      )}
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';

//
// Thread
//

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'>;

const ChatThread = (props: ChatThreadProps) => {
  const { event, messages, processor } = useChatContext(ChatThread.displayName);
  const identity = useIdentity();
  const error = useRxValue(processor.error).pipe(Option.getOrUndefined);

  const scrollerRef = useRef<ChatThreadController | null>(null);
  useEffect(
    () =>
      event.on((event) => {
        switch (event.type) {
          case 'submit':
          case 'scroll-to-bottom':
            scrollerRef.current?.scrollToBottom();
            break;
        }
      }),
    [event],
  );

  const handleEvent = useCallback<NonNullable<NaturalChatThreadProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  if (!identity) {
    return null;
  }

  return (
    <NaturalChatThread
      {...props}
      ref={scrollerRef}
      identity={identity}
      messages={messages}
      error={error}
      onEvent={handleEvent}
    />
  );
};

ChatThread.displayName = 'Chat.Thread';

//
// Toolbar
//

type ChatToolbarProps = ThemedClassName<{ companionTo?: Obj.Any }>;

const ChatToolbar = ({ classNames, companionTo }: ChatToolbarProps) => {
  const { chat } = useChatContext(ChatToolbar.displayName);
  const menu = useChatToolbarActions({ chat, companionTo });

  return (
    <MenuProvider {...menu} attendableId={companionTo ? fullyQualifiedId(companionTo) : fullyQualifiedId(chat)}>
      <ToolbarMenu classNames={classNames} textBlockWidth />
    </MenuProvider>
  );
};

ChatToolbar.displayName = 'Chat.Toolbar';

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Content: ChatContent,
  Prompt: ChatPrompt,
  Thread: ChatThread,
  Toolbar: ChatToolbar,
};

export type { ChatRootProps, ChatContentProps, ChatThreadProps, ChatPromptProps, ChatToolbarProps, ChatEvent };
