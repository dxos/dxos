//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { type Queue, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type MarkdownStreamController } from '@dxos/react-ui-markdown';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { useChatKeymapExtensions, useChatToolbarActions, useDebug } from '#hooks';

import {
  ChatStatus,
  ChatPrompt as NaturalChatPrompt,
  type ChatPromptProps as NaturalChatPromptProps,
} from '../ChatPrompt';
import { ChatThread as NaturalChatThread, type ChatThreadProps as NaturalChatThreadProps } from '../ChatThread';
import { ChatContextProvider, type ChatContextValue, type ChatRequestTiming, useChatContext } from './context';
import { type ChatEvent } from './events';

export { useChatContext };

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'db' | 'chat' | 'processor'> & {
    feed?: Queue;
    onEvent?: (event: ChatEvent) => void;
  }
>;

const ChatRoot = ({ children, chat, feed, processor, onEvent, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const requestTiming = useRequestTiming({ active });
  const lastPrompt = useRef<string | undefined>(undefined);
  const db = props.db ?? (chat && Obj.getDatabase(chat));

  const feedMessages = useQuery(feed, Filter.type(Message.Message));
  const pendingMessages = useAtomValue(processor.messages);
  const messages = useMemo(
    () => Array.dedupeWith([...feedMessages, ...pendingMessages], ({ id: a }, { id: b }) => a === b),
    [feedMessages, pendingMessages],
  );

  const dump = useDebug({ processor });

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

const useRequestTiming = ({ active }: { active: boolean }) => {
  const [requestTiming, setRequestTiming] = useState<ChatRequestTiming | null>(null);
  useEffect(() => {
    if (active) {
      setRequestTiming({ startedAt: Date.now(), endedAt: null });
    } else {
      setRequestTiming((prev) => (prev && prev.endedAt == null ? { ...prev, endedAt: Date.now() } : prev));
    }
  }, [active]);

  return requestTiming;
};

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
// Content
//

const CHAT_CONTENT_NAME = 'Chat.Content';

type ChatContentProps = {};

const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { classNames: 'dx-expander flex flex-col' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

ChatContent.displayName = CHAT_CONTENT_NAME;

//
// Thread
//

const CHAT_THREAD_NAME = 'Chat.Thread';

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'>;

const ChatThread = ({ viewType, debug: debugProp, ...props }: ChatThreadProps) => {
  const { debug, event, messages, processor } = useChatContext(CHAT_THREAD_NAME);
  const debugView = viewType === 'debug';
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const extensions = useChatKeymapExtensions({ event });

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
      debug={debugProp ?? (debug || debugView)}
      viewType={viewType}
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

type ChatPromptProps = Omit<NaturalChatPromptProps, 'chat' | 'db' | 'processor' | 'event'>;

const ChatPrompt = (props: ChatPromptProps) => {
  const { chat, db, processor, event } = useChatContext(CHAT_PROMPT_NAME);
  return <NaturalChatPrompt {...props} chat={chat} db={db} processor={processor} event={event} />;
};

ChatPrompt.displayName = CHAT_PROMPT_NAME;

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Toolbar: ChatToolbar,
  Content: ChatContent,
  Prompt: ChatPrompt,
  Status: ChatStatus,
  Thread: ChatThread,
};

export type { ChatRootProps, ChatToolbarProps, ChatContentProps, ChatPromptProps, ChatThreadProps, ChatEvent };
