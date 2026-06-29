//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { Event } from '@dxos/async';
import { getSpace } from '@dxos/client/echo';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Toast, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { type MarkdownStreamController } from '@dxos/react-ui-markdown';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';

import { useChatKeymapExtensions, useChatToolbarActions, useDebug, useTraceMessages } from '#hooks';
import { meta } from '#meta';

import { AiUsageQuotaError } from '../../processor';
import {
  ChatStatus,
  ChatPrompt as NaturalChatPrompt,
  type ChatPromptProps as NaturalChatPromptProps,
} from '../ChatPrompt';
import { ChatThread as NaturalChatThread, type ChatThreadProps as NaturalChatThreadProps } from '../ChatThread';
import { TaskList } from '../TaskList';
import { ChatContextProvider, type ChatContextValue, type ChatRequestTiming, useChatContext } from './context';
import { type ChatEvent } from './events';

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'chat' | 'processor'> & {
    /** Fallback database when the chat is transient (not yet persisted). */
    db?: Database.Database;
    onEvent?: (event: ChatEvent) => void;
    /**
     * Runs (and is awaited) before the request fires on submit. Lets a transient chat
     * persist and flush its conversation feed so the agent can resolve it.
     */
    onSubmit?: (text: string) => Promise<void> | void;
  }
>;

const ChatRoot = ({ children, chat, processor, db: dbFallback, onEvent, onSubmit, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const requestTiming = useRequestTiming({ active });
  const lastPrompt = useRef<string | undefined>(undefined);
  // Transient chats have no database of their own; fall back to the supplied space db so
  // the message query and context controls operate before the chat is persisted.
  const db = (chat && Obj.getDatabase(chat)) || dbFallback;

  // Reactive subscription — re-renders when the feed ref resolves. Direct `.target` reads are not reactive.
  const [feedSnapshot] = useObject(chat?.feed);
  const feed = Obj.getReactiveOrUndefined(feedSnapshot);

  // Event sink.
  const event = useMemo(() => new Event<ChatEvent>(), []);

  const feedMessages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const pendingMessages = useAtomValue(processor.messages);
  const messages = useMemo(
    () => Array.dedupeWith([...feedMessages, ...pendingMessages], ({ id: a }, { id: b }) => a === b),
    [feedMessages, pendingMessages],
  );

  const dump = useDebug({ processor });

  // Surface processor failures (e.g., AI service unavailable) to subscribers via the event bus.
  const error = useAtomValue(processor.error);
  useEffect(() => {
    if (Option.isSome(error)) {
      event.emit({ type: 'error', error: error.value });
    }
  }, [event, error]);

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
            // Await persistence (transient chat) before requesting so the agent resolves the
            // now-durable conversation feed; resolves immediately when there is no hook.
            void Promise.resolve(onSubmit?.(text)).then(() => processor.request({ message: text }));
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
          void processor.cancel();
          if (streaming) {
            if (lastPrompt.current) {
              event.emit({ type: 'update-prompt', text: lastPrompt.current });
            }
          }
          break;
        }
      }

      onEvent?.(ev);
    });
  }, [event, dump, processor, streaming, onEvent, onSubmit]);

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

type ChatToolbarProps = Pick<MenuRootProps, 'attendableId' | 'alwaysActive'> &
  PropsWithChildren<{
    companionTo?: Obj.Unknown;
  }>;

const ChatToolbar = composable<HTMLDivElement, ChatToolbarProps>(
  ({ children, attendableId, alwaysActive, companionTo, ...props }, forwardedRef) => {
    const { chat } = useChatContext(CHAT_TOOLBAR_NAME);
    const menuActions = useChatToolbarActions({ chat, companionTo });

    return (
      <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive={alwaysActive}>
        <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
          {children}
        </Menu.Toolbar>
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

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'> & {
  /** Invoked from the over-quota error toast to open the usage dashboard. */
  onViewUsage?: () => void;
};

const ChatThread = ({ viewType, debug: debugProp, onViewUsage, ...props }: ChatThreadProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { debug, event, messages, processor } = useChatContext(CHAT_THREAD_NAME);
  const extensions = useChatKeymapExtensions({ event });
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const [toastError, setToastError] = useState<Error | undefined>(undefined);
  // The toast renders whatever action the error declares (data-driven) rather than branching on type.
  const toastAction = toastError instanceof AiUsageQuotaError ? toastError.action : undefined;
  const debugView = viewType === 'debug';

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
        case 'error':
          setToastError(event.error);
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
    return <div className='dx-expander' />;
  }

  return (
    <>
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

      <Toast.Root
        type='foreground'
        open={!!toastError}
        duration={20_000}
        onOpenChange={(open) => !open && setToastError(undefined)}
      >
        <Toast.Title icon='ph--warning--regular' onClose={() => setToastError(undefined)}>
          {t('ai-service-error.label')}
        </Toast.Title>
        <Toast.Description>{toastError?.message}</Toast.Description>
        {toastAction && onViewUsage && (
          <Toast.Actions>
            <Toast.Action altText={t(toastAction.labelKey)} asChild>
              <Button
                onClick={() => {
                  setToastError(undefined);
                  onViewUsage();
                }}
              >
                {t(toastAction.labelKey)}
              </Button>
            </Toast.Action>
          </Toast.Actions>
        )}
      </Toast.Root>
    </>
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
// TaskList
//

const CHAT_TASK_LIST_NAME = 'Chat.TaskList';

type ChatTaskListProps = {
  plan?: Plan.Plan;
};

const ChatTaskList = composable<HTMLDivElement, ChatTaskListProps>(({ plan: planProp, ...props }, forwardedRef) => {
  const { chat } = useChatContext(CHAT_TASK_LIST_NAME);

  const plan = useAtomValue(
    useMemo(
      () =>
        Atom.make(
          (get) =>
            planProp ??
            Option.fromNullable(chat).pipe(
              Option.map((_) => get(Obj.atom(_))),
              Option.flatMapNullable((_) => _?.plan?.atom),
              Option.map(get),
              Option.getOrUndefined,
            ),
        ),
      [chat, planProp],
    ),
  );
  const space = chat ? getSpace(chat) : undefined;
  const traceMessages = useTraceMessages(space);
  const conversationId = chat?.feed?.target?.id;
  if (!plan || !(plan.tasks?.length ?? 0)) {
    return null;
  }

  return (
    <TaskList
      {...props}
      plan={plan}
      space={space}
      traceMessages={traceMessages}
      conversationId={conversationId}
      ref={forwardedRef}
    />
  );
});

ChatTaskList.displayName = CHAT_TASK_LIST_NAME;

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
  TaskList: ChatTaskList,
};

export type { ChatContentProps, ChatEvent, ChatPromptProps, ChatRootProps, ChatThreadProps, ChatToolbarProps };
