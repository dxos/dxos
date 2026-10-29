//
// Copyright 2025 DXOS.org
//

import { Collapsible } from '@ark-ui/react/collapsible';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SessionConfig } from '@dxos/ai';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { Alarm } from '@dxos/assistant';
import * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import * as AssistantChat from '@dxos/assistant/Chat';
import { Event } from '@dxos/async';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useIdentity, useMembers } from '@dxos/halo-react';
import { PublicKey, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type ChatThreadController,
  type ChatThreadEvent,
  type ChatView,
  ChatThread as NaturalChatThread,
} from '@dxos/react-ui-assistant';
import {
  type FeedModel,
  type MessageRange,
  type OutlineMarker,
  Outline as OutlineRail,
  isPrompt,
  useFeedModel,
} from '@dxos/react-ui-feed';
import { ActionToolbar, type ActionToolbarProps, createMenuAction } from '@dxos/react-ui-menu';
import { TaskList, TaskQuestion } from '@dxos/react-ui-task';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Toast from '@dxos/react-ui/Toast';
import * as Util from '@dxos/react-ui/Util';
import { type Actor, Message, Task } from '@dxos/types';
import { hexToFallback, keyToFallback, markWork } from '@dxos/util';

import { type ChatSwitcher, bindMentions, useChatToolbarActions, useDebug, useSlashCommands } from '#hooks';
import { AssistantOperation, ChatSurface } from '#types';

import {
  AiUsageQuotaError,
  type ChatRequestContext,
  getChatModelState,
  projectAlarms,
  projectSelfWakes,
  resolveRewind,
} from '../../chat-model/index.ts';
import { AssistantNamespace } from '../../namespace.ts';
import {
  ChatStatus,
  DEFAULT_MAX_QUEUE,
  ChatActivity as NaturalChatActivity,
  ChatPrompt as NaturalChatPrompt,
  type ChatPromptProps as NaturalChatPromptProps,
} from '../ChatPrompt/index.ts';
import {
  ChatContextProvider,
  type ChatContextValue,
  ChatReportContextProvider,
  type ChatRequestTiming,
  ChatThreadContextProvider,
  useChatContext,
  useChatThreadContext,
} from './context.ts';
import { type ChatDrawer, type ChatEvent } from './events.ts';
import { objectCardWidget } from './ObjectCardWidget.tsx';
import { SurfaceWidget } from './SurfaceWidget.tsx';

//
// Root
//

type ChatRootProps = PropsWithChildren<
  Pick<ChatContextValue, 'chat' | 'chatModel' | 'debug'> & {
    /** Fallback database when the chat is transient (not yet persisted). */
    db?: Database.Database;
    onEvent?: (event: ChatEvent) => void;
    /**
     * Runs (and is awaited) before the request fires on submit. Lets a transient chat
     * persist and flush its conversation feed so the agent can resolve it.
     */
    onSubmit?: (text: string) => Promise<void> | void;
    /** Called at submit time to capture ephemeral request context (e.g. companion selection). */
    getContext?: () => ChatRequestContext | undefined;
    /** The drawer open above the prompt on mount. */
    defaultDrawer?: ChatDrawer;
  }
>;

const ChatRoot = ({
  children,
  chat,
  chatModel,
  db: dbFallback,
  debug: debugProp,
  onEvent,
  onSubmit,
  getContext,
  defaultDrawer,
  ...props
}: ChatRootProps) => {
  const [debug, setDebug] = useState(debugProp ?? false);
  const [drawer, setDrawer] = useState<ChatDrawer | undefined>(defaultDrawer);
  // Slash commands run their operations through the same invoker the rest of the UI uses.
  const { invokePromise } = Hooks.useOperationInvoker();
  const chatModelState = getChatModelState(chatModel);
  const streaming = useAtomValue(chatModelState.streaming);
  const active = useAtomValue(chatModelState.active);
  const requestTiming = useRequestTiming({ active });
  const lastPrompt = useRef<string | undefined>(undefined);
  // A slash command runs outside the chat model, so `streaming` does not cover it.
  const commandPending = useRef(false);
  // Transient chats have no database of their own; fall back to the supplied space db so
  // the message query and context controls operate before the chat is persisted.
  const db = (chat && Obj.getDatabase(chat)) || dbFallback;
  const commands = useSlashCommands({ registry: chatModel?.registry, db });
  const slashCommands = UiHooks.useDynamicRef(commands);

  // Reactive subscription - re-renders when the feed ref resolves. Direct `.target` reads are not reactive.
  const [feedSnapshot] = useObject(chat?.feed);
  const feed = Obj.getReactiveOrUndefined(feedSnapshot);

  // Event sink.
  const event = useMemo(() => new Event<ChatEvent>(), []);

  // The thread controller and visible range are produced by `Chat.Thread` and consumed by
  // `Chat.Outline`; lifted here so both sub-components share the same instance.
  const [controller, setController] = useState<ChatThreadController | null>(null);
  const [visibleRange, setVisibleRange] = useState<MessageRange | undefined>(undefined);

  const feedAlarms = useQuery(
    db,
    feed ? Query.select(Filter.type(Alarm.Alarm)).from(feed) : Query.select(Filter.nothing()),
  );
  // The chat model queries the feed and reconciles it with the streamed turn and the outbox.
  const { messages, delivery, queued, tail } = useAtomValue(chatModelState.thread);
  const alarms = useMemo(() => projectAlarms({ feedAlarms }), [feedAlarms]);
  const selfWakes = useMemo(() => projectSelfWakes({ feedAlarms, messages }), [feedAlarms, messages]);

  const dump = useDebug({ chatModel });

  // Surface chat model failures (e.g., AI service unavailable) to subscribers via the event bus.
  const error = useAtomValue(chatModelState.error);
  useEffect(() => {
    if (Option.isSome(error)) {
      event.emit({ type: 'error', error: error.value });
    }
  }, [event, error]);

  useEffect(() => {
    return event.on((ev) => {
      switch (ev.type) {
        case 'set-drawer': {
          setDrawer(ev.drawer);
          break;
        }

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

        case 'rewind': {
          // Edit-and-resend: discard the prompt and everything after it, and put its text back in the
          // composer so it can be revised. Recorded on the feed rather than the chat because the
          // continuation is appended by the agent's process, which resolves the feed and never sees the
          // chat. A stale click (message already gone) resolves to nothing and is a no-op. A prompt sent
          // from here keeps its own row id, so the feed is pointed at its turn's message.
          const rewind = feed && resolveRewind(messages, ev.id);
          if (rewind) {
            Obj.update(feed, (feed) => {
              feed.rewindFrom = delivery.get(rewind.rewindFrom)?.turnId ?? rewind.rewindFrom;
            });
            event.emit({ type: 'update-prompt', text: rewind.text });
          }
          break;
        }

        case 'remove-prompt': {
          // Withdrawing a prompt the agent has not taken up: the queue is feed state, so removing the
          // entry is what takes it out of the agent's queue, and the outbox forgets this client's copy.
          const row = delivery.get(ev.id);
          if (row?.status === 'failed' || row?.status === 'delivered') {
            if (row.entryId && db && feed) {
              void db.removeFeedItemsByIds(feed, [row.entryId]).catch((err) => log.catch(err));
            }
            if (row.outboxId) {
              chatModel?.removePrompt(row.outboxId);
            }
          }
          break;
        }
      }

      onEvent?.(ev);
    });
    // `feed`, `messages` and `delivery` are dependencies because the rewind and prompt branches read
    // them: without them the handler would keep resolving against whatever was mounted first.
  }, [event, dump, onEvent, db, feed, messages, delivery, chatModel]);

  useEffect(() => {
    return event.on((ev) => {
      if (ev.type !== 'respond' || !chat) {
        return;
      }
      const { messageId, requestId, optionId } = ev;
      // The operation reads the chat's feed, so it runs in the chat's space.
      const spaceId = Obj.getDatabase(chat)?.spaceId;
      void invokePromise(
        AssistantOperation.RespondToRequest,
        { chat, messageId, requestId, optionId },
        spaceId ? { spaceId } : undefined,
      ).then(({ data, error }) => {
        if (error) {
          event.emit({ type: 'error', error });
        } else if (data && !data.answered) {
          // Otherwise the click looks like it did nothing.
          event.emit({
            type: 'error',
            error: new Error('The assistant is no longer waiting for this answer. Ask it again to retry.'),
          });
        }
      });
    });
  }, [event, chat, invokePromise]);

  useEffect(() => {
    if (!chatModel) {
      return;
    }

    const sendPrompt = (text: string) => {
      if (active && queued >= DEFAULT_MAX_QUEUE) {
        return;
      }
      markWork('chat.submit');
      lastPrompt.current = text;
      chatModel.send(
        { message: text, context: getContext?.() },
        {
          prepare: async () => {
            await onSubmit?.(text);
            const currentDb = (chat && Obj.getDatabase(chat)) || db;
            if (currentDb) {
              await bindMentions(chatModel.context, currentDb, text);
            }
          },
        },
      );
    };

    return event.on((ev) => {
      switch (ev.type) {
        case 'submit': {
          const text = ev.text.trim();
          if (text.length) {
            // A leading /command is a deterministic shortcut - executed directly, no model in
            // the loop; an unknown command falls through to the model as plain text.
            const resolved = SlashCommand.resolveSlashCommand(text, slashCommands.current);
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
                if (!resolved.command.chatOnly) {
                  await Promise.resolve(onSubmit?.(text));
                }
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
                  binder: chatModel.context,
                });
                if (result instanceof Error) {
                  throw result;
                }

                // The command's effect is otherwise invisible in the conversation: the prompt was
                // never sent, so nothing records that the user ran it. The feed is re-read here
                // because `onSubmit` is what persists a transient chat, creating it.
                const currentFeed = feed ?? chat.feed?.target;
                if (currentFeed && result.summary) {
                  const ran = result.prompt ? resolved.command.command : text;
                  await currentDb.appendToFeed(currentFeed, [
                    Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: ran }] }),
                    Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: result.summary }] }),
                  ]);
                }

                if (result.followUp) {
                  // Some effects run on the supervisor loop (delegation spawns post-turn), so the
                  // command wakes the conversation with a short synthetic prompt.
                  void chatModel.request({ message: result.followUp });
                }
                if (result.prompt) {
                  sendPrompt(result.prompt);
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
            sendPrompt(text);
          }
          break;
        }

        case 'report': {
          const text = ev.text.trim();
          if (text.length) {
            // Same seam as a submitted prompt (persist first, queue while a turn runs), but the
            // content is synthetic - nobody typed it.
            void Promise.resolve(onSubmit?.(text)).then(() =>
              active
                ? chatModel.enqueue({ message: text, disposition: 'synthetic' })
                : chatModel.request({ message: text, disposition: 'synthetic' }),
            );
          }
          break;
        }

        case 'retry': {
          if (!streaming) {
            void chatModel.retry();
          }
          break;
        }

        case 'cancel': {
          void chatModel.cancel();
          if (streaming) {
            if (lastPrompt.current) {
              event.emit({ type: 'update-prompt', text: lastPrompt.current });
            }
          }
          break;
        }
      }
    });
  }, [event, chatModel, streaming, active, queued, onSubmit, getContext, invokePromise, chat, db, feed]);

  // An inline surface (connector prompt, plugin prompt) reports its completed flow as a synthetic
  // turn, so the agent resumes without the report reading as something the user typed.
  const handleReport = useCallback((text: string) => event.emit({ type: 'report', text }), [event]);

  return (
    <ChatContextProvider
      debug={debug}
      event={event}
      db={db}
      chat={chat}
      chatModel={chatModel}
      queueSize={queued}
      started={messages.length > 0 || queued > 0}
      setController={setController}
      setVisibleRange={setVisibleRange}
      slashCommands={commands}
      drawer={drawer}
      setDrawer={setDrawer}
      {...props}
    >
      <ChatThreadContextProvider
        messages={messages}
        tail={tail}
        alarms={alarms}
        selfWakes={selfWakes}
        requestTiming={requestTiming}
        controller={controller}
        visibleRange={visibleRange}
      >
        <ChatReportContextProvider submit={handleReport}>{children}</ChatReportContextProvider>
      </ChatThreadContextProvider>
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

type ChatToolbarProps = Pick<ActionToolbarProps, 'attendableId' | 'alwaysActive' | 'customActions'> & {
  companionTo?: Obj.Unknown;
  /** Scopes the chat switcher; defaults to the companion chats of `companionTo`. */
  switcher?: ChatSwitcher;
};

const ChatToolbar = Util.composable<HTMLDivElement, ChatToolbarProps>(
  ({ attendableId, alwaysActive, customActions, companionTo, switcher, ...props }, forwardedRef) => {
    const { chat } = useChatContext(CHAT_TOOLBAR_NAME);
    const menuActions = useChatToolbarActions({ chat, companionTo, switcher });

    return (
      <ActionToolbar
        {...menuActions}
        attendableId={attendableId}
        alwaysActive={alwaysActive}
        customActions={customActions}
        {...Util.composableProps(props)}
        ref={forwardedRef}
      />
    );
  },
);

ChatToolbar.displayName = CHAT_TOOLBAR_NAME;

//
// Content
//

const CHAT_CONTENT_NAME = 'Chat.Content';

type ChatContentProps = {};

const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...Util.composableProps(props, { classNames: 'dx-expand flex flex-col' })} ref={forwardedRef}>
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
  return firstLine.length > PROMPT_TITLE_CHARS ? `${firstLine.slice(0, PROMPT_TITLE_CHARS)}\u2026` : firstLine;
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
  return snippet.length > PROMPT_SNIPPET_CHARS ? `${snippet.slice(0, PROMPT_SNIPPET_CHARS)}\u2026` : snippet;
};

/**
 * Build one outline marker per user-prompt turn: title = the prompt text, description = a snippet
 * of the following assistant reply, range = the turn's index span (prompt -> next prompt). Message
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

type ChatThreadProps = Util.ThemedClassName<{
  viewType?: ChatView;
  /** Blank lines kept below the tail at rest - breathing room above the composer. */
  tailLines?: number;
  /** Hue of the user's messages; defaults to the identity's hue. */
  userHue?: string;
  /** Invoked from the over-quota error toast to open the usage dashboard. */
  onViewUsage?: () => void;
}>;

/**
 * Tells the feed model when a message changes in place: a feed query re-emits only when its set of
 * ids changes, so an edit (a permission card recording its answer) reaches its row only this way.
 */
const useInPlaceUpdates = (model: FeedModel, messages: readonly Message.Message[]) => {
  useEffect(() => {
    const unsubscribes = messages
      .filter((message) => Obj.isObject(message))
      .map((message) => Obj.subscribe(message, () => model.update(message.id)));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [model, messages]);
};

const ChatThread = ({ classNames, viewType, tailLines, userHue: userHueProp, onViewUsage }: ChatThreadProps) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  const { chat, db, debug, event, chatModel, setController, setVisibleRange } = useChatContext(CHAT_THREAD_NAME);
  const { messages, tail } = useChatThreadContext(CHAT_THREAD_NAME);
  const identity = useIdentity();
  // Embedded objects resolve against the chat's database (the fallback one while it is transient).
  const objectImage = useMemo(() => objectCardWidget(db), [db]);
  // A block reference's chip reads the object's name once it is loaded - resolved through the
  // database's own ref, which honours the URI's space and the DXN forms - and the package default's
  // bare "Object" until then; the thread re-renders as the message's blocks settle.
  const getObjectLabel = useCallback(
    (uri: URI.URI): string => {
      let object: Obj.Unknown | undefined;
      try {
        object = db?.makeRef<Obj.Unknown>(uri).target;
      } catch {
        object = undefined;
      }
      return (object && Obj.getLabel(object)) || 'Object';
    },
    [db],
  );
  const [toastError, setToastError] = useState<Error | undefined>(undefined);
  // The toast renders whatever action the error declares (data-driven) rather than branching on type.
  const toastAction = toastError instanceof AiUsageQuotaError ? toastError.action : undefined;

  // The model is the adapter: the projected array is folded in with `replace`, streaming chunks
  // arrive as updates on one identity, and the window is told - the old `MessageSyncer`'s cursor
  // and range table have no equivalent left.
  const model = useFeedModel(messages, { stops: 'prompt' });
  useInPlaceUpdates(model, messages);
  const streaming = useAtomValue(getChatModelState(chatModel).streaming);
  useEffect(() => {
    // The answer streams above any prompts still waiting for the agent, which end the thread.
    const last = messages[messages.length - 1 - tail];
    model.setStreaming(streaming && last?.sender.role === 'assistant' ? last.id : undefined);
  }, [model, streaming, messages, tail]);

  // Prompts carry their author's DID; members resolve it to the name and colours presence shows them with.
  const members = useMembers(db?.spaceId);
  const getAuthor = useCallback(
    (sender: Actor.Actor) => {
      const member = sender.identityDid ? members.find((member) => member.did === sender.identityDid) : undefined;
      if (!member) {
        return undefined;
      }

      const fallback = member.identityKey ? hexToFallback(member.identityKey) : undefined;
      return {
        name: member.displayName,
        hue: member.data?.hue ?? fallback?.hue,
        emoji: member.data?.emoji ?? fallback?.emoji,
      };
    },
    [members],
  );

  const userHue = useMemo(
    () =>
      userHueProp ||
      identity?.data?.hue ||
      keyToFallback(identity?.identityKey ? PublicKey.fromHex(identity.identityKey) : PublicKey.random()).hue,
    [userHueProp, identity],
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
        objectImage={objectImage}
        getObjectLabel={getObjectLabel}
        userHue={userHue}
        userDid={identity.did}
        getAuthor={getAuthor}
        tailLines={tailLines}
        debug={debug}
        // An external agent keeps its own context, which a rewind of the transcript cannot reach.
        rewind={SessionConfig.harnessOf(chat?.session) === SessionConfig.COMPOSER_HARNESS}
        onEvent={handleEvent}
        onRangeChange={setVisibleRange}
        controllerRef={handleControllerRef}
      >
        <NaturalChatThread.Viewport classNames={classNames} />
      </NaturalChatThread.Root>

      {/* TODO(burdon): Why is this required? */}
      <Toast.Root
        data-testid='assistant.error'
        open={!!toastError}
        duration={20_000}
        onOpenChange={(open) => !open && setToastError(undefined)}
      >
        <Toast.Header icon='ph--warning--regular'>{t('ai-service-error.label')}</Toast.Header>
        <Toast.Description>{toastError?.message}</Toast.Description>
        {toastAction && onViewUsage && (
          <Toast.Footer>
            <Toast.ActionTrigger
              onClick={() => {
                setToastError(undefined);
                onViewUsage();
              }}
            >
              {t(toastAction.labelKey)}
            </Toast.ActionTrigger>
          </Toast.Footer>
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

type ChatOutlineProps = Util.ThemedClassName<{}>;

/**
 * Anchor-marker rail for the thread: one tick per user-prompt turn. Reads the shared controller
 * and the visible index range from context; clicking a tick jumps the thread to that turn, on the
 * same navigation seam as the toolbar and the arrow keys.
 */
const ChatOutline = ({ classNames }: ChatOutlineProps) => {
  const { messages, visibleRange, controller } = useChatThreadContext(CHAT_OUTLINE_NAME);

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

type ChatPromptProps = Omit<
  NaturalChatPromptProps,
  'chat' | 'db' | 'chatModel' | 'event' | 'drawers' | 'started' | 'slashCommands'
>;

/**
 * The composer with its drawers above it: the chat's checklist, and what it has in context (with any
 * section a plugin contributes). One drawer is open at a time.
 */
const ChatPrompt = ({ classNames, ...props }: ChatPromptProps) => {
  const { chat, db, chatModel, event, queueSize, started, slashCommands, drawer, setDrawer } =
    useChatContext(CHAT_PROMPT_NAME);

  const [tasks] = useObject(chat, 'tasks');
  const available = useMemo(() => {
    const drawers: ChatDrawer[] = [];
    if (tasks != null) {
      drawers.push('tasks');
    }
    if (chat && chatModel && db) {
      drawers.push('context');
    }
    return drawers;
  }, [chat, chatModel, db, tasks]);
  const open = drawer && available.includes(drawer) ? drawer : undefined;

  // Switching drawers closes the open one first, so the next slides in rather than swapping in place.
  const [visible, setVisible] = useState(open);
  const [requested, setRequested] = useState(open);
  if (open !== requested) {
    setRequested(open);
    setVisible(visible && open ? undefined : open);
  }

  // With animations off no `animationend` fires, so a switch with no close animation running completes at once.
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible && open && (drawerRef.current?.getAnimations().length ?? 0) === 0) {
      setVisible(open);
    }
  }, [visible, open]);

  const shownRef = useRef(visible);
  if (visible) {
    shownRef.current = visible;
  }
  const shown = visible ?? shownRef.current ?? available[0];

  const contextOpenedRef = useRef(false);
  if (open === 'context') {
    contextOpenedRef.current = true;
  }

  return (
    <Collapsible.Root
      open={visible !== undefined}
      onOpenChange={({ open }) => !open && setDrawer(undefined)}
      lazyMount={false}
    >
      {/* The height the machine measures is what the ramp animates against, so the region clips. */}
      {available.length > 0 && (
        <Collapsible.Content
          ref={drawerRef}
          className='overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down'
          onAnimationEnd={(event) => event.target === event.currentTarget && !visible && open && setVisible(open)}
        >
          {/* The same surface and border as the prompt below, so the two read as one shell. */}
          <div className='shrink-0 max-h-[40dvh] overflow-y-auto dx-group-surface border border-separator-subtle border-b-0 rounded-t-sm'>
            {available.includes('tasks') && (
              <div hidden={shown !== 'tasks'}>
                <ChatTaskList classNames='text-fg-muted' />
              </div>
            )}
            {available.includes('context') && contextOpenedRef.current && (
              <div hidden={shown !== 'context'}>
                <ChatContextDrawer />
              </div>
            )}
          </div>
        </Collapsible.Content>
      )}
      <NaturalChatPrompt
        {...props}
        classNames={[visible && 'rounded-t-none', classNames]}
        db={db}
        chat={chat}
        chatModel={chatModel}
        event={event}
        queueSize={queueSize}
        started={started}
        slashCommands={slashCommands}
        drawers={{ available, open }}
      />
    </Collapsible.Root>
  );
};

ChatPrompt.displayName = CHAT_PROMPT_NAME;

const CHAT_CONTEXT_DRAWER_NAME = 'Chat.ContextDrawer';

const ChatContextDrawer = () => {
  const { chat, db, chatModel } = useChatContext(CHAT_CONTEXT_DRAWER_NAME);
  return (
    <div className='flex flex-col gap-1 p-1' data-testid='assistant.details'>
      {chat && <Surface.Surface type={ChatSurface.ChatDetails} data={{ chat, db, context: chatModel?.context }} />}
    </div>
  );
};

//
// TaskList
//

const CHAT_TASK_LIST_NAME = 'Chat.TaskList';

/** Rows the chat's checklist shows before it scrolls. */
const CHAT_TASK_ROWS = 4;

const ChatTaskList = Util.composable<HTMLDivElement>((props, forwardedRef) => {
  const { chat, event } = useChatContext(CHAT_TASK_LIST_NAME);
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);

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

  // Execution is a prompt, not a direct write: the agent owns the task's lifecycle (assignment,
  // delegation, status), so the row asks for the work the way the reader would, by ordinal - the
  // number the row shows, and the one `/task:run` and the agent's selectors resolve.
  const handleExecute = useCallback(
    (task: Task.Task) => {
      const ordinal = tasks.findIndex(({ id }) => id === task.id) + 1;
      event.emit({ type: 'submit', text: t('execute-task.prompt', { ordinal }) });
    },
    [tasks, event, t],
  );

  // Contributed actions rather than fixed chrome, matching `TaskSetArticle`: two items, so the row
  // shows one overflow menu rather than a bare delete button.
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`execute-${task.id}`, () => handleExecute(task), {
        label: t('execute-task.label'),
        icon: 'ph--play--regular',
        // A finished task has nothing left to implement.
        disabled: task.status === 'done' || task.status === 'cancelled',
        testId: 'tasks.task.execute',
      }),
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: t('delete-task.label'),
        icon: 'ph--trash--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [handleExecute, handleDelete, t],
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
      // The prompt frames the list, and its rows are too narrow for who holds a task or its mnemonic.
      flush
      showAssignees={false}
      showMnemonics={false}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      getTaskActions={getTaskActions}
    >
      <div {...Util.composableProps(props, { classNames: 'flex flex-col dx-grow' })} ref={forwardedRef}>
        {/* Sized to its rows up to four tasks; only a longer list scrolls, never showing a partial row. */}
        <TaskList.Viewport rows={CHAT_TASK_ROWS}>
          <TaskList.Content />
        </TaskList.Viewport>
        {/* What the agent is blocked on, under the list it asked about: the list itself carries no
            questions - a row replaying them grew by a line each - but a chat is where the asking
            happened, so the answer is given here rather than in a pane the reader has to open. */}
        <ChatTaskQuestions tasks={tasks} />
        {/* Only creates: a task is changed through its own row controls, not by selecting it into the strip. */}
        <TaskList.Editor createOnly />
      </div>
    </TaskList.Root>
  );
});

ChatTaskList.displayName = CHAT_TASK_LIST_NAME;

/**
 * The open questions across the chat's tasks, each with the means to answer it.
 *
 * Answers go through the operation rather than `Task.answer`, so the conversation that asked is
 * resumed - which is the whole point of answering here instead of on the task.
 */
const ChatTaskQuestions = ({ tasks }: { tasks: readonly Task.Task[] }) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const threads = useMemo(
    () =>
      tasks.flatMap((task) =>
        Task.getQuestions(task.history)
          .filter(({ answer }) => !answer)
          .map((thread) => ({ task, thread })),
      ),
    [tasks],
  );

  const handleAnswer = useCallback(
    (task: Task.Task, questionId: string, answer: string) => {
      const spaceId = Obj.getDatabase(task)?.spaceId;
      if (spaceId) {
        // The operation reports a refused write in its result, not only by rejecting, so both are checked.
        invokePromise(AssistantOperation.AnswerQuestion, { task, question: questionId, answer }, { spaceId })
          .then((result) => {
            if (result.error || !result.data?.accepted) {
              log.warn('question was not answered', { task: task.id, question: questionId, error: result.error });
            }
          })
          .catch((err) => log.catch(err));
      }
    },
    [invokePromise],
  );

  if (threads.length === 0) {
    return null;
  }

  return (
    <Layout.Flex column gap='sm' classNames='p-2' data-testid='chat.taskQuestions'>
      {threads.map(({ task, thread }) => (
        <TaskQuestion
          key={thread.question.id}
          thread={thread}
          onAnswer={(answer) => handleAnswer(task, thread.question.id, answer)}
        />
      ))}
    </Layout.Flex>
  );
};

ChatTaskQuestions.displayName = 'Chat.TaskQuestions';

//
// Activity
//

const CHAT_ACTIVITY_NAME = 'Chat.Activity';

/**
 * The activity line bound to the chat's chat model and the chat's pending alarms: what the agent is
 * doing, for as long as it is doing anything. The line itself takes resolved values, so it lives
 * beside the prompt with the rest of the presentational parts and only the binding is here.
 */
const ChatActivity = ({ classNames }: Util.ThemedClassName) => {
  const { chatModel } = useChatContext(CHAT_ACTIVITY_NAME);
  const { alarms } = useChatThreadContext(CHAT_ACTIVITY_NAME);
  const activity = useAtomValue(getChatModelState(chatModel).activity);

  // Earliest pending alarm: the agent wakes at the first one, so a later one says nothing about the
  // wait in front of the reader.
  return <NaturalChatActivity classNames={classNames} activity={activity} wakeAt={alarms[0]?.wakeAt} />;
};

ChatActivity.displayName = CHAT_ACTIVITY_NAME;

//
// Chat
//

export const Chat = {
  Root: ChatRoot,
  Toolbar: ChatToolbar,
  Content: ChatContent,
  Prompt: ChatPrompt,
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
  ChatRootProps,
  ChatThreadProps,
  ChatToolbarProps,
};
