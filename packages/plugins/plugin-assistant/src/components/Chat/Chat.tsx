//
// Copyright 2025 DXOS.org
//

import { Collapsible } from '@ark-ui/react/collapsible';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Alarm } from '@dxos/assistant';
import { resolveSlashCommand } from '@dxos/assistant-toolkit';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Event } from '@dxos/async';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Button, type ThemedClassName, Toast, composable, composableProps, useTranslation } from '@dxos/react-ui';
import {
  type ChatThreadController,
  type ChatThreadEvent,
  type ChatView,
  ChatThread as NaturalChatThread,
} from '@dxos/react-ui-assistant';
import {
  type MessageRange,
  type OutlineMarker,
  Outline as OutlineRail,
  isPrompt,
  useFeedModel,
} from '@dxos/react-ui-feed';
import { Menu, MenuRootProps, createMenuAction } from '@dxos/react-ui-menu';
import { TaskList } from '@dxos/react-ui-task';
import { Message, Task } from '@dxos/types';
import { keyToFallback } from '@dxos/util';

import { useChatToolbarActions, useDebug } from '#hooks';
import { meta } from '#meta';

import { TaskSlashCommands } from '../../commands';
import { AiUsageQuotaError, type ProcessorRequestContext } from '../../processor';
import {
  ChatActivity,
  ChatStatus,
  ChatPrompt as NaturalChatPrompt,
  type ChatPromptProps as NaturalChatPromptProps,
} from '../ChatPrompt';
import { ChatQueue as NaturalChatQueue, type ChatQueueProps as NaturalChatQueueProps } from '../ChatQueue';
import { ChatContextProvider, type ChatContextValue, type ChatRequestTiming, useChatContext } from './context';
import { type ChatEvent } from './events';
import { SurfaceWidget } from './SurfaceWidget';
import { projectAlarms, projectThread, resolveRewind } from './thread';

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'chat' | 'processor' | 'debug'> & {
    /** Fallback database when the chat is transient (not yet persisted). */
    db?: Database.Database;
    onEvent?: (event: ChatEvent) => void;
    /**
     * Runs (and is awaited) before the request fires on submit. Lets a transient chat
     * persist and flush its conversation feed so the agent can resolve it.
     */
    onSubmit?: (text: string) => Promise<void> | void;
    /** Called at submit time to capture ephemeral request context (e.g. companion selection). */
    getContext?: () => ProcessorRequestContext | undefined;
  }
>;

const ChatRoot = ({
  children,
  chat,
  processor,
  db: dbFallback,
  debug: debugProp,
  onEvent,
  onSubmit,
  getContext,
  ...props
}: ChatRootProps) => {
  const [debug, setDebug] = useState(debugProp ?? false);
  // Slash commands run their operations through the same invoker the rest of the UI uses.
  const { invokePromise } = useOperationInvoker();
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const requestTiming = useRequestTiming({ active });
  const lastPrompt = useRef<string | undefined>(undefined);
  // A slash command runs outside the processor, so `streaming` does not cover it.
  const commandPending = useRef(false);
  // Transient chats have no database of their own; fall back to the supplied space db so
  // the message query and context controls operate before the chat is persisted.
  const db = (chat && Obj.getDatabase(chat)) || dbFallback;

  // Reactive subscription — re-renders when the feed ref resolves. Direct `.target` reads are not reactive.
  const [feedSnapshot] = useObject(chat?.feed);
  const feed = Obj.getReactiveOrUndefined(feedSnapshot);

  // Event sink.
  const event = useMemo(() => new Event<ChatEvent>(), []);

  // The thread controller and visible range are produced by `Chat.Thread` and consumed by
  // `Chat.Outline`; lifted here so both sub-components share the same instance.
  const [controller, setController] = useState<ChatThreadController | null>(null);
  const [visibleRange, setVisibleRange] = useState<MessageRange | undefined>(undefined);

  const feedMessages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const feedAlarms = useQuery(
    db,
    feed ? Query.select(Filter.type(Alarm.Alarm)).from(feed) : Query.select(Filter.nothing()),
  );
  const pendingMessages = useAtomValue(processor.messages);
  const { messages, queued } = useMemo(
    () => projectThread({ feedMessages, pendingMessages, rewindFrom: feedSnapshot?.rewindFrom }),
    [feedMessages, pendingMessages, feedSnapshot?.rewindFrom],
  );
  const alarms = useMemo(() => projectAlarms({ feedAlarms }), [feedAlarms]);

  // Cancelling is a plain feed removal: the queue and the alarm set are projections over the feed,
  // so dropping the record is what takes the item out of them.
  const handleCancel = useCallback(
    (item: Message.Message | Alarm.Alarm) => {
      if (db && feed) {
        void db.removeFeedItemsByIds(feed, [item.id]).catch((err) => log.catch(err));
      }
    },
    [db, feed],
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
          if (text.length) {
            // A leading /command is a deterministic shortcut — executed directly, no model in
            // the loop; an unknown command falls through to the model as plain text.
            const resolved = resolveSlashCommand(text, TaskSlashCommands);
            if (resolved) {
              // One command at a time: `invokePromise` does not queue, so two quick submissions
              // would interleave their operations and land their summaries out of order.
              if (commandPending.current) {
                break;
              }
              commandPending.current = true;
              // One rejection handler for the whole chain: `onSubmit` can throw synchronously and
              // `appendToFeed` can reject, and either would otherwise be lost with no error shown.
              void (async () => {
                await Promise.resolve(onSubmit?.(text));
                // Re-read after `onSubmit`: that is what persists a transient chat, so a chat that
                // began without a database has one only now.
                const currentDb = (chat && Obj.getDatabase(chat)) || db;
                if (!chat || !currentDb) {
                  throw new Error('Command requires a persisted chat.');
                }

                const result = await resolved.command.execute(resolved.args, {
                  db: currentDb,
                  chat,
                  invoke: invokePromise,
                });
                if (result instanceof Error) {
                  throw result;
                }

                // The command's effect is otherwise invisible in the conversation: the prompt was
                // never sent, so nothing records that the user ran it. The feed is re-read here
                // because `onSubmit` is what persists a transient chat, creating it.
                const currentFeed = feed ?? chat.feed?.target;
                if (currentFeed && result.summary) {
                  await currentDb.appendToFeed(currentFeed, [
                    Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text }] }),
                    Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: result.summary }] }),
                  ]);
                }

                if (result.followUp) {
                  // Some effects run on the supervisor loop (delegation spawns post-turn), so the
                  // command wakes the conversation with a short synthetic prompt.
                  void processor.request({ message: result.followUp });
                }
              })()
                .catch((error) => {
                  event.emit({ type: 'error', error: error instanceof Error ? error : new Error(String(error)) });
                })
                .finally(() => {
                  commandPending.current = false;
                });
              break;
            }
            lastPrompt.current = ev.text;
            const context = getContext?.();
            // Await persistence (transient chat) before requesting so the agent resolves the
            // now-durable conversation feed; resolves immediately when there is no hook.
            //
            // A prompt submitted while a turn is running is QUEUED, not requested: `request` would
            // cancel the running turn to start its own, whereas the agent's queue is feed state that
            // it drains in order once the current turn settles.
            void Promise.resolve(onSubmit?.(text)).then(() =>
              active ? processor.enqueue({ message: text, context }) : processor.request({ message: text, context }),
            );
          }
          break;
        }

        case 'rewind': {
          // Edit-and-resend: discard the prompt and everything after it, and put its text back in the
          // composer so it can be revised. Recorded on the feed rather than the chat because the
          // continuation is appended by the agent's process, which resolves the feed and never sees the
          // chat. A stale click (message already gone) resolves to nothing and is a no-op.
          const rewind = feed && resolveRewind(messages, ev.id);
          if (rewind) {
            Obj.update(feed, (feed) => {
              feed.rewindFrom = rewind.rewindFrom;
            });
            event.emit({ type: 'update-prompt', text: rewind.text });
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
    // `feed` and `messages` are dependencies because the rewind branch reads and writes them: without
    // them the handler would keep resolving rewinds against whatever was mounted first.
  }, [event, dump, processor, streaming, active, onEvent, onSubmit, getContext, feed, messages, chat, db]);

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      db={db}
      chat={chat}
      messages={messages}
      queued={queued}
      alarms={alarms}
      onCancel={handleCancel}
      processor={processor}
      requestTiming={requestTiming}
      controller={controller}
      setController={setController}
      visibleRange={visibleRange}
      setVisibleRange={setVisibleRange}
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
          <Menu.Items />
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
    <div {...composableProps(props, { classNames: 'dx-expand flex flex-col' })} ref={forwardedRef}>
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

/**
 * The text the reader actually wrote. Synthetic blocks carry injected context and tool results, so
 * titling a marker from them would name the machinery rather than the prompt.
 */
const authoredText = (message: Message.Message): string =>
  message.blocks
    .flatMap((block) => (block._tag === 'text' && block.disposition !== 'synthetic' ? [block.text] : []))
    .join('\n');

/** First non-empty line of a message's text, truncated for the marker title. */
const promptTitle = (message: Message.Message): string => {
  const text = authoredText(message).trim();
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
 * Build one outline marker per user-prompt turn: title = the prompt text, description = a snippet
 * of the following assistant reply, range = the turn's index span (prompt → next prompt). Message
 * indices, not document offsets: the feed navigates by index, so no range table exists any more.
 */
const buildMarkers = (messages: Message.Message[]): OutlineMarker[] => {
  const markers: OutlineMarker[] = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    // Role alone would also match tool results and injected context, which travel back as
    // `user`-role messages; `isPrompt` is the feed's single definition of a stop.
    if (!isPrompt(message)) {
      continue;
    }

    // Extend the turn up to the next prompt: a tool-result turn belongs to the turn it serves, so
    // stopping on any `user`-role message would cut the range at the first tool call.
    let turnTo = index + 1;
    let description: string | undefined;
    for (let next = index + 1; next < messages.length; next++) {
      const nextMessage = messages[next];
      if (isPrompt(nextMessage)) {
        break;
      }
      turnTo = next + 1;
      if (!description && nextMessage.sender.role === 'assistant') {
        description = replySnippet(nextMessage);
      }
    }

    markers.push({
      id: message.id,
      title: promptTitle(message) || 'Prompt',
      description,
      range: { from: index, to: turnTo },
    });
  }
  return markers;
};

//
// Thread
//

const CHAT_THREAD_NAME = 'Chat.Thread';

/** The plugin's `surface` widget layered over the package registry: it can dispatch a Surface. */
const chatRegistry = {
  surface: {
    block: true,
    Component: SurfaceWidget,
  },
} as const;

type ChatThreadProps = ThemedClassName<{
  viewType?: ChatView;
  /** Blank lines kept below the tail at rest — breathing room above the composer. */
  tailLines?: number;
  /** Invoked from the over-quota error toast to open the usage dashboard. */
  onViewUsage?: () => void;
}>;

const ChatThread = ({ classNames, viewType, tailLines, onViewUsage }: ChatThreadProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { debug, event, messages, processor, setController, setVisibleRange } = useChatContext(CHAT_THREAD_NAME);
  const identity = useIdentity();
  const [toastError, setToastError] = useState<Error | undefined>(undefined);
  // The toast renders whatever action the error declares (data-driven) rather than branching on type.
  const toastAction = toastError instanceof AiUsageQuotaError ? toastError.action : undefined;

  // The model is the adapter: the projected array is folded in with `replace`, streaming chunks
  // arrive as updates on one identity, and the window is told — the old `MessageSyncer`'s cursor
  // and range table have no equivalent left.
  const model = useFeedModel(messages, { stops: 'prompt' });
  const streaming = useAtomValue(processor.streaming);
  useEffect(() => {
    const last = messages[messages.length - 1];
    model.setStreaming(streaming && last?.sender.role === 'assistant' ? last.id : undefined);
  }, [model, streaming, messages]);

  const userHue = useMemo(
    () =>
      identity?.data?.hue ||
      keyToFallback(identity?.identityKey ? PublicKey.fromHex(identity.identityKey) : PublicKey.random()).hue,
    [identity],
  );

  const controllerRef = useRef<ChatThreadController | null>(null);
  // Share the controller with `Chat.Outline` (and keep the local ref for event handling).
  const handleControllerRef = useCallback(
    (instance: ChatThreadController | null) => {
      controllerRef.current = instance;
      setController(instance);
    },
    [setController],
  );

  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'submit':
        case 'scroll-to-bottom':
          controllerRef.current?.scrollToBottom();
          break;
        case 'nav-previous':
          controllerRef.current?.navigation.step(-1);
          break;
        case 'nav-next':
          controllerRef.current?.navigation.step(1);
          break;
        case 'error':
          setToastError(event.error);
          break;
        default:
          log.info('no handled', event);
      }
    });
  }, [event]);

  // Rewind (the prompt toolbar) and submit (suggestion/select widgets) land on the shared bus,
  // where `Chat.Root` already resolves them.
  const handleEvent = useCallback((ev: ChatThreadEvent) => event.emit(ev), [event]);

  if (!identity) {
    return <div className='dx-expand' />;
  }

  return (
    <>
      <NaturalChatThread.Root
        model={model}
        viewType={viewType}
        registry={chatRegistry}
        userHue={userHue}
        tailLines={tailLines}
        debug={debug}
        onEvent={handleEvent}
        onRangeChange={setVisibleRange}
        controllerRef={handleControllerRef}
      >
        <NaturalChatThread.Viewport classNames={classNames} padding />
      </NaturalChatThread.Root>

      {/* TODO(burdon): Why is this required? */}
      <Toast.Root
        data-testid='assistant.error'
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
// Outline
//

const CHAT_OUTLINE_NAME = 'Chat.Outline';

type ChatOutlineProps = ThemedClassName<{}>;

/**
 * Anchor-marker rail for the thread: one tick per user-prompt turn. Reads the shared controller
 * and the visible index range from context; clicking a tick jumps the thread to that turn, on the
 * same navigation seam as the toolbar and the arrow keys.
 */
const ChatOutline = ({ classNames }: ChatOutlineProps) => {
  const { messages, visibleRange, controller } = useChatContext(CHAT_OUTLINE_NAME);

  const markers = useMemo(() => buildMarkers(messages), [messages]);
  const handleSelect = useCallback(
    (marker: OutlineMarker) => {
      controller?.navigation.jumpTo(marker.range.from, 'smooth');
    },
    [controller],
  );
  const handleNavigate = useCallback((delta: number) => controller?.navigation.step(delta), [controller]);

  if (markers.length < 2) {
    return null;
  }

  return (
    <OutlineRail
      classNames={classNames}
      markers={markers}
      // `endIndex` is inclusive; the rail's `to` is exclusive.
      visibleRange={visibleRange ? { from: visibleRange.startIndex, to: visibleRange.endIndex + 1 } : undefined}
      onSelect={handleSelect}
      onNavigate={handleNavigate}
    />
  );
};

ChatOutline.displayName = CHAT_OUTLINE_NAME;

//
// Prompt
//

const CHAT_PROMPT_NAME = 'Chat.Prompt';

type ChatPromptProps = Omit<NaturalChatPromptProps, 'chat' | 'db' | 'processor' | 'event' | 'tasksVisible'> & {
  /** Whether the checklist is disclosed on mount. */
  defaultTasksVisible?: boolean;
};

/**
 * The composer with the chat's checklist disclosed above it.
 *
 * One component rather than two siblings: they share a border and a rounded shell, and the control
 * that discloses the checklist lives in the composer's own action bar — so a host that placed them
 * side by side had to hold the disclosure state between them and coordinate the corner radius.
 *
 * Ark's `Collapsible` owns the disclosure (it measures the height the animation ramps against). Its
 * trigger is not used: the toggle is a button inside the composer, which reports through the chat
 * event rather than being wrapped in a `Collapsible.Trigger` it cannot reach.
 */
const ChatPrompt = ({ classNames, defaultTasksVisible = false, ...props }: ChatPromptProps) => {
  const { chat, db, processor, event } = useChatContext(CHAT_PROMPT_NAME);

  // A chat with no checklist at all has nothing to disclose, so the toggle is withheld rather than
  // shown pointing at nothing — `ChatActions` renders it only when `tasksVisible` is defined.
  const hasTasks = chat?.tasks != null;

  // Collapsed by default: the checklist is the assistant's working state, not the reader's, so the
  // prompt keeps the room and the toggle is how they ask for it. Per mount rather than persisted —
  // it is a glance, not a preference.
  const [tasksVisible, setTasksVisible] = useState(chat?.tasks?.length ? defaultTasksVisible : false);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type === 'toggle-tasks') {
        setTasksVisible((visible) => !visible);
      }
    });
  }, [event]);

  return (
    <Collapsible.Root
      open={tasksVisible}
      onOpenChange={({ open }) => setTasksVisible(open)}
      // Clipped rather than unmounted: the list holds its own subscriptions, and remounting it on
      // every toggle would refetch the checklist to show what the reader just hid.
      lazyMount={false}
    >
      {/* The height the machine measures is what the ramp animates against, so the region clips. */}
      {hasTasks && (
        <Collapsible.Content className='overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down'>
          <ChatTaskList classNames='shrink-0 max-h-[calc(4*2rem+1px)] border border-separator border-b-0 rounded-t-sm text-description' />
        </Collapsible.Content>
      )}
      <NaturalChatPrompt
        {...props}
        // Square where the checklist meets it, so the two read as one shell rather than two cards.
        classNames={[tasksVisible && 'rounded-t-none', classNames]}
        db={db}
        chat={chat}
        processor={processor}
        event={event}
        tasksVisible={hasTasks ? tasksVisible : undefined}
      />
    </Collapsible.Root>
  );
};

ChatPrompt.displayName = CHAT_PROMPT_NAME;

//
// TaskList
//

const CHAT_TASK_LIST_NAME = 'Chat.TaskList';

const ChatTaskList = composable<HTMLDivElement>((props, forwardedRef) => {
  const { chat } = useChatContext(CHAT_TASK_LIST_NAME);
  const { t } = useTranslation(meta.profile.key);

  // Both the chat (membership) and each ref (row objects): a query re-emits only on membership.
  const [chatSnapshot] = useObject(chat);
  const taskRefs = chatSnapshot?.tasks;
  const tasks = useAtomValue(
    useMemo(() => Atom.make((get) => Task.dedupeById((taskRefs ?? []).map((ref) => get(ref.atom)))), [taskRefs]),
  );

  // The same primitive the task commands use, so the parent edge and the refs cannot diverge.
  const handleCreate = useCallback(
    ({ title, ...props }: Task.Draft) => {
      const db = chat && Obj.getDatabase(chat);
      if (chat && db) {
        AssistantChat.addTask(db, chat, title, props);
      }
    },
    [chat],
  );

  // The same primitive the task commands use: it sweeps the checklist and destroys only what the
  // chat owns, so a delegated task keeps the set that parents it.
  const handleDelete = useCallback(
    (task: Task.Task) => {
      const db = chat && Obj.getDatabase(chat);
      if (chat && db) {
        AssistantChat.deleteTask(db, chat, tasks, task);
      }
    },
    [chat, tasks],
  );

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Task.update(task, patch);
  }, []);

  // Delete is a contributed action rather than fixed chrome, matching `TaskSetArticle`: a row shows
  // one trailing affordance whatever ends up on the list.
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: t('delete-task.label'),
        icon: 'ph--x--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [handleDelete, t],
  );

  if (!chat) {
    return null;
  }

  return (
    <TaskList.Root
      tasks={tasks}
      showGroupLabels={false}
      showOrdinals
      showEstimates
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      getTaskActions={getTaskActions}
    >
      <div {...composableProps(props, { classNames: 'flex flex-col dx-grow' })} ref={forwardedRef}>
        <TaskList.Viewport>
          <TaskList.Content />
        </TaskList.Viewport>
        <TaskList.Edit grid />
      </div>
    </TaskList.Root>
  );
});

ChatTaskList.displayName = CHAT_TASK_LIST_NAME;

//
// Queue
//

const CHAT_QUEUE_NAME = 'Chat.Queue';

type ChatQueueProps = Omit<NaturalChatQueueProps, 'queued' | 'onCancel'>;

const ChatQueue = (props: ChatQueueProps) => {
  const { queued, onCancel } = useChatContext(CHAT_QUEUE_NAME);
  return <NaturalChatQueue {...props} queued={queued} onCancel={onCancel} />;
};

ChatQueue.displayName = CHAT_QUEUE_NAME;

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Toolbar: ChatToolbar,
  Content: ChatContent,
  Prompt: ChatPrompt,
  Queue: ChatQueue,
  Activity: ChatActivity,
  Status: ChatStatus,
  Thread: ChatThread,
  Outline: ChatOutline,
};

export type {
  ChatContentProps,
  ChatEvent,
  ChatOutlineProps,
  ChatPromptProps,
  ChatQueueProps,
  ChatRootProps,
  ChatThreadProps,
  ChatToolbarProps,
};
