//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Chat as ChatModule } from '@dxos/assistant-toolkit';
import { Event } from '@dxos/async';
import { type Database, Filter, Obj } from '@dxos/echo';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, type ThemedClassName, useDynamicRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { type MarkdownStreamController } from '@dxos/react-ui-components';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { useChatToolbarActions } from '../../hooks';
import { meta } from '../../meta';
import { type AiChatProcessor } from '../../processor';
import {
  ChatActions,
  type ChatActionsProps,
  ChatOptions,
  type ChatPresetsProps,
  ChatReferences,
  ChatStatusIndicator,
} from '../ChatPrompt';
import { ChatThread as NaturalChatThread, type ChatThreadProps as NaturalChatThreadProps } from '../ChatThread';

import { type ChatEvent } from './events';

//
// Context
// NOTE: The context should not be exported. It is only used internally.
// Components outside of this Radix-style group shuld define their own APIs.
//

type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  db?: Database.Database;
  chat?: ChatModule.Chat;
  messages: Message.Message[];
  processor: AiChatProcessor;
};

export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'db' | 'chat' | 'processor'> & {
    onEvent?: (event: ChatEvent) => void;
  }
>;

const ChatRoot = ({ children, chat, processor, onEvent, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const pending = useAtomValue(processor.messages);
  const streaming = useAtomValue(processor.streaming);
  const lastPrompt = useRef<string | undefined>(undefined);

  // Messages.
  const storedMessages = useQuery(chat?.queue?.target, Filter.type(Message.Message));
  const messages = useMemo(() => {
    return Array.dedupeWith([...storedMessages, ...pending], ({ id: a }, { id: b }) => a === b);
  }, [storedMessages, pending]);

  // Events.
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((ev) => {
      switch (ev.type) {
        case 'toggle-debug': {
          setDebug((current) => !current);
          // Dump state to console.
          queueMicrotask(async () => {
            const objects = processor.context.getObjects();
            const blueprints = processor.context.getBlueprints();
            const tools = await processor.getTools();
            const system = await processor.getSystemPrompt();
            // eslint-disable-next-line no-console
            console.log('Chat processor state:', { objects, blueprints });
            // eslint-disable-next-line no-console
            console.log(`
              ==== System Prompt ====
              ${system}
              ==== Tools ====
              ${Object.values(tools)
                .map((tool) => JSON.stringify(tool, null, 2))
                .join('\n')}
            `);
          });
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
      }

      onEvent?.(ev);
    });
  }, [event, processor, streaming, onEvent]);

  const db = props.db ?? (chat && Obj.getDatabase(chat));

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      db={db}
      chat={chat}
      messages={messages}
      processor={processor}
      {...props}
    >
      {children}
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Viewport
//

const CHAT_VIEWPORT_NAME = 'Chat.Viewport';

type ChatViewportProps = ThemedClassName<PropsWithChildren>;

const ChatViewport = ({ classNames, children }: ChatViewportProps) => {
  return (
    <div role='none' className={mx('flex flex-col h-full w-full', classNames)}>
      {children}
    </div>
  );
};

ChatViewport.displayName = CHAT_VIEWPORT_NAME;

//
// Thread
//

const CHAT_THREAD_NAME = 'Chat.Thread';

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'>;

const ChatThread = (props: ChatThreadProps) => {
  const { debug, event, messages, processor } = useChatContext(CHAT_THREAD_NAME);
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);

  const controllerRef = useRef<MarkdownStreamController | null>(null);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit':
        case 'scroll-to-bottom':
          controllerRef.current?.scrollToBottom();
          break;
        case 'nav-previous':
          controllerRef.current?.navigatePrevious();
          break;
        case 'nav-next':
          controllerRef.current?.navigateNext();
          break;
      }
    });
  }, [event]);

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
      identity={identity}
      messages={messages}
      error={error}
      debug={debug}
      onEvent={handleEvent}
      ref={controllerRef}
    />
  );
};

ChatThread.displayName = CHAT_THREAD_NAME;

//
// Prompt
//

const CHAT_PROMPT_NAME = 'Chat.Prompt';

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
  const { db, processor, event } = useChatContext(CHAT_PROMPT_NAME);

  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const activeRef = useDynamicRef(active);

  const editorRef = useRef<ChatEditorController>(null);
  const [recordingState, setRecordingState] = useState(false);
  useEffect(() => {
    return event.on((event) => {
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
    });
  }, [event]);

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active: recordingState,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  const extensions = useMemo<Extension[]>(() => {
    return [
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-d',
            preventDefault: true,
            run: () => {
              event.emit({ type: 'toggle-debug' });
              return true;
            },
          },
          {
            key: 'Mod-ArrowUp',
            preventDefault: true,
            run: () => {
              event.emit({ type: 'nav-previous' });
              return true;
            },
            shift: () => {
              event.emit({ type: 'thread-open' });
              return true;
            },
          },
          {
            key: 'Mod-ArrowDown',
            preventDefault: true,
            run: () => {
              event.emit({ type: 'nav-next' });
              return true;
            },
            shift: () => {
              event.emit({ type: 'thread-close' });
              return true;
            },
          },
        ]),
      ),
    ].filter(isTruthy);
  }, [event, expandable]);

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
        'flex flex-col w-full density-fine',
        outline &&
          'bg-group-surface border border-subdued-separator transition transition-border [&:has(.cm-content:focus)]:border-separator rounded-sm',
        classNames,
      )}
    >
      <div role='none' className='flex p-2 gap-2'>
        <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />
        <ChatEditor
          ref={editorRef}
          autoFocus
          lineWrapping
          classNames='col-span-2 pt-0.5'
          placeholder={placeholder ?? t('prompt placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      {db && settings && (
        <div role='none' className='flex items-center overflow-hidden'>
          <ChatOptions
            db={db}
            blueprintRegistry={processor.blueprintRegistry}
            context={processor.context}
            preset={preset}
            presets={presets}
            onPresetChange={onPresetChange}
          />

          <div role='none' className='flex grow overflow-x-auto scrollbar-none'>
            <ChatReferences db={db} context={processor.context} />
          </div>

          <ChatActions
            classNames='col-span-2'
            microphone={true}
            recording={recording}
            processing={streaming}
            onEvent={handleEvent}
          >
            {/* TODO(burdon): Move offline switch into dialog. */}
            {online !== undefined && (
              <Input.Root>
                <Input.Label srOnly>{t('online switch label')}</Input.Label>
                <Input.Switch classNames='mx-2' checked={online} onCheckedChange={onOnlineChange} />
              </Input.Root>
            )}
          </ChatActions>
        </div>
      )}
    </div>
  );
};

ChatPrompt.displayName = CHAT_PROMPT_NAME;

//
// Toolbar
//

const CHAT_TOOLBAR_NAME = 'Chat.Toolbar';

type ChatToolbarProps = ThemedClassName<{ companionTo?: Obj.Unknown }>;

const ChatToolbar = ({ classNames, companionTo }: ChatToolbarProps) => {
  const { chat } = useChatContext(CHAT_TOOLBAR_NAME);
  const menu = useChatToolbarActions({ chat, companionTo });

  return (
    <MenuProvider
      {...menu}
      attendableId={companionTo ? Obj.getDXN(companionTo).toString() : chat ? Obj.getDXN(chat).toString() : ''}
    >
      <ToolbarMenu classNames={classNames} textBlockWidth />
    </MenuProvider>
  );
};

ChatToolbar.displayName = CHAT_TOOLBAR_NAME;

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Viewport: ChatViewport,
  Thread: ChatThread,
  Prompt: ChatPrompt,
  Toolbar: ChatToolbar,
};

export type { ChatRootProps, ChatViewportProps, ChatThreadProps, ChatPromptProps, ChatToolbarProps, ChatEvent };
