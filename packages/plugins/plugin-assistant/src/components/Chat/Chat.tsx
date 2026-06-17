//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Agent, Plan } from '@dxos/assistant-toolkit';
import { Event } from '@dxos/async';
import { type Database, type Feed, Filter, Obj, Query } from '@dxos/echo';
import { UsageQuotaExceededError } from '@dxos/edge-client';
import { Account } from '@dxos/plugin-client';
import { useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, Toast, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { type MarkdownStreamController } from '@dxos/react-ui-markdown';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';

import { useChatKeymapExtensions, useChatToolbarActions, useDebug } from '#hooks';
import { meta } from '#meta';

import { findInCause } from '../../util/error-cause';
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
    feed?: Feed.Feed;
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

const ChatRoot = ({ children, chat, feed, processor, db: dbFallback, onEvent, onSubmit, ...props }: ChatRootProps) => {
  const [debug, setDebug] = useState(false);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const requestTiming = useRequestTiming({ active });
  const lastPrompt = useRef<string | undefined>(undefined);
  // Transient chats have no database of their own; fall back to the supplied space db so
  // the message query and context controls operate before the chat is persisted.
  const db = (chat && Obj.getDatabase(chat)) || dbFallback;

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

type ChatThreadProps = Omit<NaturalChatThreadProps, 'identity' | 'messages' | 'tools'>;

const ChatThread = ({ viewType, debug: debugProp, ...props }: ChatThreadProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { debug, event, messages, processor } = useChatContext(CHAT_THREAD_NAME);
  const extensions = useChatKeymapExtensions({ event });
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const [toastError, setToastError] = useState<Error | undefined>(undefined);
  const isQuotaError = toastError ? findInCause(toastError, UsageQuotaExceededError.is) !== undefined : false;
  const debugView = viewType === 'debug';

  const handleOpenUsageSettings = useCallback(() => {
    void invokePromise(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(Account.id) });
    void invokePromise(LayoutOperation.Open, { subject: [`${getSpacePath(Account.id)}/${Account.Usage}`] });
    setToastError(undefined);
  }, [invokePromise]);

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
        <Toast.Title
          icon={isQuotaError ? 'ph--chart-bar--duotone' : 'ph--warning--regular'}
          onClose={() => setToastError(undefined)}
        >
          {t(isQuotaError ? 'usage-quota-exceeded.label' : 'ai-service-error.label')}
        </Toast.Title>
        <Toast.Description>
          {isQuotaError ? t('usage-quota-exceeded.description') : toastError?.message}
        </Toast.Description>
        {isQuotaError && (
          <Toast.Actions>
            <Toast.Action altText={t('usage-quota-open-settings.alt')} asChild>
              <Button variant='primary' onClick={handleOpenUsageSettings}>
                {t('usage-quota-open-settings.label')}
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
  const parent = chat ? Obj.getParent(chat) : undefined;
  const agent = parent && Obj.instanceOf(Agent.Agent, parent) ? parent : undefined;
  const plan = planProp ?? agent?.plan.target;
  if (!plan) {
    return null;
  }

  return <TaskList {...props} plan={plan} ref={forwardedRef} />;
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

export type { ChatRootProps, ChatToolbarProps, ChatContentProps, ChatPromptProps, ChatThreadProps, ChatEvent };
