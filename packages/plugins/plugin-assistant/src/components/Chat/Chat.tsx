//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { type Queue, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, type ThemedClassName, useDynamicRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { type MarkdownStreamController } from '@dxos/react-ui-markdown';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';
import { composable, composableProps, mx } from '@dxos/ui-theme';
import { isTruthy, trim } from '@dxos/util';

import { useChatToolbarActions } from '#hooks';
import { meta } from '#meta';

import {
  ChatActions,
  type ChatActionsProps,
  ChatOptions,
  type ChatPresetsProps,
  ChatReferences,
  ChatStatusIndicator,
} from '../ChatPrompt';
import { ChatThread as NaturalChatThread, type ChatThreadProps as NaturalChatThreadProps } from '../ChatThread';
import { ChatStreamStatus } from './ChatStreamStatus';
import { ChatContextProvider, type ChatContextValue, type ChatRequestTiming, useChatContext } from './context';
import { type ChatEvent } from './events';

export { useChatContext };

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'db' | 'chat' | 'processor'> & {
    queue?: Queue;
    onEvent?: (event: ChatEvent) => void;
  }
>;

const ChatRoot = ({ children, chat, queue, processor, onEvent, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const pending = useAtomValue(processor.messages);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const lastPrompt = useRef<string | undefined>(undefined);

  // Track request start/end timestamps so the visible elapsed value in `ChatStreamStatus`
  // can be derived from wall-clock time and survive the re-mounts that happen each time
  // wire's drip queue toggles `wireDrainingEffect`.
  const [requestTiming, setRequestTiming] = useState<ChatRequestTiming | null>(null);
  useEffect(() => {
    if (active) {
      setRequestTiming({ startedAt: Date.now(), endedAt: null });
    } else {
      setRequestTiming((prev) => (prev && prev.endedAt == null ? { ...prev, endedAt: Date.now() } : prev));
    }
  }, [active]);

  // Messages.
  const storedMessages = useQuery(queue, Filter.type(Message.Message));
  const messages = useMemo(() => {
    return Array.dedupeWith([...storedMessages, ...pending], ({ id: a }, { id: b }) => a === b);
  }, [storedMessages, pending]);

  // Debug.
  const dump = useCallback(async () => {
    const objects = processor.context.getObjects();
    const blueprints = processor.context.getBlueprints();
    const system = await processor.getSystemPrompt();
    const tools = await processor.getTools();

    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.group('Chat', { objects, blueprints });
    // eslint-disable-next-line no-console
    console.log(trim`
      System Prompt:
      ${system}
    `);
    // eslint-disable-next-line no-console
    console.log(trim`
      Tools:
      ${Object.values(tools)
        .map((tool) => JSON.stringify(tool, null, 2))
        .join('\n')}
    `);
    console.groupEnd();
  }, [processor]);

  // Events.
  const event = useMemo(() => new Event<ChatEvent>(), []);
  useEffect(() => {
    return event.on((ev) => {
      switch (ev.type) {
        case 'toggle-debug': {
          setDebug((debug) => {
            if (debug) {
              return false;
            } else {
              void dump();
              return true;
            }
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
  }, [event, dump, processor, streaming, onEvent]);

  const db = props.db ?? (chat && Obj.getDatabase(chat));

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      db={db}
      chat={chat}
      messages={messages}
      processor={processor}
      requestTiming={requestTiming}
      {...props}
    >
      {children}
    </ChatContextProvider>
  );
};

ChatRoot.displayName = 'Chat.Root';

//
// Toolbar
//

const CHAT_TOOLBAR_NAME = 'Chat.Toolbar';

type ChatToolbarProps = Pick<MenuRootProps, 'attendableId'> & {
  companionTo?: Obj.Unknown;
};

const ChatToolbar = composable<HTMLDivElement, ChatToolbarProps>(
  ({ attendableId, companionTo, ...props }, forwardedRef) => {
    const { chat } = useChatContext(CHAT_TOOLBAR_NAME);
    const menuActions = useChatToolbarActions({ chat, companionTo });

    return (
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
      </Menu.Root>
    );
  },
);

ChatToolbar.displayName = CHAT_TOOLBAR_NAME;

//
// Viewport
//

const CHAT_VIEWPORT_NAME = 'Chat.Viewport';

type ChatContentProps = {};

const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { classNames: 'dx-expander flex flex-col' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

ChatContent.displayName = CHAT_VIEWPORT_NAME;

//
// Thread
//

const CHAT_THREAD_NAME = 'Chat.Thread';

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'>;

const ChatThread = (props: ChatThreadProps) => {
  const { debug, event, messages, processor } = useChatContext(CHAT_THREAD_NAME);
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const active = useAtomValue(processor.active);

  // When `Mod-d` fires from the document editor we are about to be re-instantiated
  // (debug toggles the editor's extension stack). Mark this editor as the focus source so
  // the post-rerender effect below restores focus to the new view.
  const refocusAfterDebug = useRef(false);
  // Stable callback — `useChatKeymapExtensions` memoises on its identity, and an unstable
  // arrow here would cascade into a new `extensions` array on every parent render, which
  // re-instantiates the underlying CodeMirror view (breaking smooth autoScroll).
  const onToggleDebug = useCallback(() => {
    refocusAfterDebug.current = true;
  }, []);
  const extensions = useChatKeymapExtensions({ event, onToggleDebug });

  const controllerRef = useRef<MarkdownStreamController | null>(null);
  useEffect(() => {
    if (refocusAfterDebug.current) {
      refocusAfterDebug.current = false;
      controllerRef.current?.focus();
    }
  }, [debug]);
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
      extensions={extensions}
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
  const { db, debug, processor, event } = useChatContext(CHAT_PROMPT_NAME);

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

  // Mirror the document editor's pattern so focus is restored after a debug-mode toggle
  // (idempotent if the prompt editor wasn't reinstantiated).
  const refocusAfterDebug = useRef(false);
  // Stable callback (see ChatThread above for rationale).
  const onToggleDebug = useCallback(() => {
    refocusAfterDebug.current = true;
  }, []);
  const extensions = useChatKeymapExtensions({ event, onToggleDebug });
  useEffect(() => {
    if (refocusAfterDebug.current) {
      refocusAfterDebug.current = false;
      editorRef.current?.focus();
    }
  }, [debug]);

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
        'flex flex-col w-full dx-density-fine',
        outline &&
          'bg-group-surface rounded-sm! border border-subdued-separator transition transition-border [&:has(.cm-content:focus)]:border-separator',
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
          placeholder={placeholder ?? t('prompt.placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      {db && settings && (
        <div role='none' className='flex items-center overflow-hidden p-1.5'>
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
                <Input.Label srOnly>{t('online-switch.label')}</Input.Label>
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

/**
 * CodeMirror keymap shared by the chat document (Thread) and the prompt editor — pressing
 * Mod-d, Mod-Arrow keys, etc. when either editor is focused emits the corresponding
 * `ChatEvent` on the shared event bus.
 *
 * `onToggleDebug` runs synchronously in the keymap callback (before the event emits and
 * any state updates), so the caller can mark its editor as the source and re-focus it
 * after the rerender — debug mode toggling re-instantiates the document editor and would
 * otherwise lose focus.
 */
const useChatKeymapExtensions = ({
  event,
  onToggleDebug,
}: {
  event: Event<ChatEvent>;
  onToggleDebug?: () => void;
}): Extension[] => {
  return useMemo<Extension[]>(() => {
    return [
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-d',
            preventDefault: true,
            run: () => {
              onToggleDebug?.();
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
  }, [event, onToggleDebug]);
};

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Toolbar: ChatToolbar,
  Content: ChatContent,
  Thread: ChatThread,
  Status: ChatStreamStatus,
  Prompt: ChatPrompt,
};

export type { ChatRootProps, ChatToolbarProps, ChatContentProps, ChatThreadProps, ChatPromptProps, ChatEvent };
