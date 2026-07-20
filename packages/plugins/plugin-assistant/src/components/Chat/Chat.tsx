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
import { useIdentity } from '@dxos/halo-react';
import { useObject, useQuery } from '@dxos/react-client/echo';
import {
  Button,
  type ThemedClassName,
  Toast,
  composable,
  composableProps,
  useDynamicRef,
  useTranslation,
} from '@dxos/react-ui';
import { Minimap, type MinimapMarker } from '@dxos/react-ui-components';
import { type DocumentRange, type MarkdownStreamController } from '@dxos/react-ui-markdown';
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
import {
  type MessageRange,
  ChatThread as NaturalChatThread,
  type ChatThreadProps as NaturalChatThreadProps,
} from '../ChatThread';
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

  // The editor controller and per-message ranges are produced by `Chat.Thread` and consumed by
  // `Chat.Minimap`; lifted here so both sub-components share the same instance.
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [messageRanges, setMessageRanges] = useState<MessageRange[]>([]);

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
      controller={controller}
      setController={setController}
      messageRanges={messageRanges}
      setMessageRanges={setMessageRanges}
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
// Markers
//

const PROMPT_SNIPPET_LINES = 3;
const PROMPT_SNIPPET_CHARS = 280;
const PROMPT_TITLE_CHARS = 100;

/** First non-empty line of a message's text, truncated for the marker title. */
const promptTitle = (message: Message.Message): string => {
  const text = Message.extractText(message).trim();
  const firstLine = text.split('\n').find((line) => line.trim().length) ?? '';
  return firstLine.length > PROMPT_TITLE_CHARS ? `${firstLine.slice(0, PROMPT_TITLE_CHARS)}…` : firstLine;
};

/** First few text lines of an assistant reply (tool calls, reasoning and status are excluded). */
const replySnippet = (message: Message.Message): string | undefined => {
  // `extractText` keeps only `text` blocks, so tool calls / reasoning / status are dropped.
  const text = Message.extractText(message).trim();
  if (!text.length) {
    return undefined;
  }
  const snippet = text
    .split('\n')
    .filter((line) => line.trim().length)
    .slice(0, PROMPT_SNIPPET_LINES)
    .join('\n');
  return snippet.length > PROMPT_SNIPPET_CHARS ? `${snippet.slice(0, PROMPT_SNIPPET_CHARS)}…` : snippet;
};

/**
 * Build one minimap marker per user-prompt turn: title = the prompt text, description = a
 * snippet of the following assistant reply, range = the turn's document span (prompt start →
 * next prompt start). Positions come from the syncer's per-message range table.
 */
const buildMarkers = (messages: Message.Message[], ranges: MessageRange[]): MinimapMarker[] => {
  const rangeById = new Map(ranges.map((range) => [range.id, range] as const));
  const markers: MinimapMarker[] = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.sender.role !== 'user') {
      continue;
    }
    const range = rangeById.get(message.id);
    if (!range) {
      continue;
    }

    // Extend the turn through the following non-user messages and grab the first assistant reply.
    let turnTo = range.to;
    let description: string | undefined;
    for (let next = index + 1; next < messages.length; next++) {
      const nextMessage = messages[next];
      const nextRange = rangeById.get(nextMessage.id);
      if (nextMessage.sender.role === 'user') {
        if (nextRange) {
          turnTo = nextRange.from;
        }
        break;
      }
      if (nextRange) {
        turnTo = nextRange.to;
      }
      if (!description && nextMessage.sender.role === 'assistant') {
        description = replySnippet(nextMessage);
      }
    }

    markers.push({
      id: message.id,
      title: promptTitle(message) || 'Prompt',
      description,
      range: { from: range.from, to: turnTo },
    });
  }
  return markers;
};

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
  const { debug, event, messages, processor, messageRanges, setController, setMessageRanges } =
    useChatContext(CHAT_THREAD_NAME);
  const extensions = useChatKeymapExtensions({ event });
  const identity = useIdentity();
  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const [toastError, setToastError] = useState<Error | undefined>(undefined);
  // The toast renders whatever action the error declares (data-driven) rather than branching on type.
  const toastAction = toastError instanceof AiUsageQuotaError ? toastError.action : undefined;
  const debugView = viewType === 'debug';

  const controllerRef = useRef<MarkdownStreamController | null>(null);
  // Share the controller with `Chat.Minimap` (and keep the local ref for event handling).
  const handleControllerRef = useCallback(
    (instance: MarkdownStreamController | null) => {
      controllerRef.current = instance;
      setController(instance);
    },
    [setController],
  );

  // Prompt-turn positions for navigation; a ref keeps the event handler stable without stale reads.
  const promptPositions = useMemo(
    () =>
      buildMarkers(messages, messageRanges)
        .map((marker) => marker.range.from)
        .sort((a, b) => a - b),
    [messages, messageRanges],
  );
  const promptPositionsRef = useDynamicRef(promptPositions);

  // Navigate between prompt turns using the range table (not the xml-tag widget bookmarks).
  const navigateToPrompt = useCallback(
    (direction: 1 | -1) => {
      const controller = controllerRef.current;
      const positions = promptPositionsRef.current;
      if (!controller || !positions.length) {
        return;
      }
      const anchor = controller.getVisibleRange()?.from ?? 0;
      const epsilon = 2;
      const target =
        direction > 0
          ? positions.find((pos) => pos > anchor + epsilon)
          : [...positions].reverse().find((pos) => pos < anchor - epsilon);
      if (target != null) {
        controller.scrollTo(target, { y: 'start' });
      }
    },
    [promptPositionsRef],
  );

  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit':
        case 'scroll-to-bottom':
          controllerRef.current?.scrollToBottom();
          break;
        case 'nav-previous':
          navigateToPrompt(-1);
          break;
        case 'nav-next':
          navigateToPrompt(1);
          break;
        case 'error':
          setToastError(event.error);
          break;
      }
    });
  }, [event, navigateToPrompt]);

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
        onRanges={setMessageRanges}
        ref={handleControllerRef}
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
// Minimap
//

const CHAT_MINIMAP_NAME = 'Chat.Minimap';

type ChatMinimapProps = ThemedClassName<{}>;

/**
 * Anchor-marker rail for the thread: one tick per user-prompt turn. Reads the shared controller
 * and the syncer's range table from context; clicking a tick scrolls the thread to that turn.
 */
const ChatMinimap = ({ classNames }: ChatMinimapProps) => {
  const { messages, messageRanges, controller } = useChatContext(CHAT_MINIMAP_NAME);
  const [visibleRange, setVisibleRange] = useState<DocumentRange | undefined>(undefined);
  useEffect(() => {
    if (!controller) {
      return;
    }
    return controller.onVisibleRangeChange(setVisibleRange);
  }, [controller]);

  const markers = useMemo(() => buildMarkers(messages, messageRanges), [messages, messageRanges]);
  const handleSelect = useCallback(
    (marker: MinimapMarker) => {
      controller?.scrollTo(marker.range.from, { y: 'start' });
    },
    [controller],
  );

  if (!markers.length) {
    return null;
  }

  return <Minimap classNames={classNames} markers={markers} visibleRange={visibleRange} onSelect={handleSelect} />;
};

ChatMinimap.displayName = CHAT_MINIMAP_NAME;

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
  Minimap: ChatMinimap,
  TaskList: ChatTaskList,
};

export type {
  ChatContentProps,
  ChatEvent,
  ChatMinimapProps,
  ChatPromptProps,
  ChatRootProps,
  ChatThreadProps,
  ChatToolbarProps,
};
