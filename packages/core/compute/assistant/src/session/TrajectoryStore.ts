//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { type Database, Feed } from '@dxos/echo';
import { Reducer, Trajectory, Transcript } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as Legacy from './Legacy.ts';
import { readItems } from './trajectory-items.ts';
import * as TrajectoryCache from './TrajectoryCache.ts';

export { type ReadRange, readItems } from './trajectory-items.ts';

/**
 * The types a host registers to read and write conversations: trajectory events, and the legacy records older feeds
 * still hold (a typed query for an unregistered type matches nothing).
 */
export const types = [Trajectory.Event, ...Legacy.types] as const;

/**
 * Every event in `feed`, legacy records converted in place, in local order.
 */
export const read = (feed: Feed.Feed): Effect.Effect<Trajectory.Event[], never, Database.Service> =>
  Effect.map(readItems(feed), Legacy.toEvents);

/**
 * Every message event in `feed` (any thread, queued or consumed), as messages in local order: what a reader that
 * looks for content rather than the model's prompt (a test, an activity view, a relay) wants.
 */
export const messages = (feed: Feed.Feed): Effect.Effect<Message.Message[], never, Database.Service> =>
  Effect.map(read(feed), (events) =>
    events.flatMap((event) =>
      event.payload._tag === 'message'
        ? [
            Message.make({
              id: event.id,
              created: event.created,
              sender: toActor(event.sender),
              blocks: [...event.payload.blocks],
              attachments: event.payload.attachments ? [...event.payload.attachments] : undefined,
              properties: event.payload.properties,
            }),
          ]
        : [],
    ),
  );

/**
 * The main conversation as a reader sees it, as messages in thread order: answers to requests applied, cancelled and
 * rewound items left out, a queued prompt where it waits.
 */
export const threadMessages = (feed: Feed.Feed): Effect.Effect<Message.Message[], never, Database.Service> =>
  Effect.map(load(feed, Reducer.thread), ({ state }) =>
    state.items
      .filter((item) => item.status !== 'cancelled' && item.status !== 'rewound')
      .map((item) =>
        Message.make({ id: item.id, created: item.created, sender: toActor(item.sender), blocks: [...item.blocks] }),
      ),
  );

/** A trajectory sender as a message actor; an `event` sender (alarm, hook, system note) speaks as a user. */
export const toActor = (sender: Trajectory.Sender): Message.Message['sender'] => ({
  role: sender.role === 'event' ? 'user' : sender.role,
  ...(sender.identity ? { identityDid: sender.identity } : {}),
  ...(sender.name ? { name: sender.name } : {}),
  ...(sender.subject ? { subject: sender.subject } : {}),
});

/**
 * Folds `feed` with `reducer`, through the checkpoint cache.
 */
export const load = <S>(
  feed: Feed.Feed,
  reducer: Reducer.Durable<S>,
): Effect.Effect<Reducer.Checkpoint<S>, never, Database.Service> => TrajectoryCache.load(feed, reducer);

/**
 * The conversation a turn in `thread` (absent: the main thread) sends, as messages: a forked feed's origin first,
 * then this feed's prompt.
 */
export const history = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  thread?: Trajectory.EventId,
): Effect.fn.Return<Message.Message[], never, Database.Service> {
  const { state } = yield* load(feed, Reducer.prompt);
  const origin = state.origin ? yield* originHistory(state.origin) : [];
  const status = thread === undefined ? undefined : siblingStatus(state, thread);
  return [...origin, ...Reducer.promptFor(state, thread).map(toMessage), ...(status ? [status] : [])];
});

/** The top-level thread (or main turn) `thread` nests in: a lane of the chat. */
const laneOf = (state: Reducer.PromptState, thread: Trajectory.EventId): Trajectory.EventId => {
  const parent = state.threads[thread]?.parent;
  return parent === undefined ? thread : laneOf(state, parent);
};

/** Threads and main turns running beside each other: open buffers with no parent. */
const runningLanes = (state: Reducer.PromptState): Trajectory.EventId[] =>
  Object.entries(state.threads)
    .filter(([, buffer]) => buffer.parent === undefined && !buffer.closed)
    .map(([id]) => id);

/**
 * The latest state of every other lane, after the history of a turn in a light thread, so it knows what changed since
 * its snapshot without the snapshot moving (which would cost the prompt cache).
 */
const siblingStatus = (state: Reducer.PromptState, thread: Trajectory.EventId): Message.Message | undefined => {
  const own = laneOf(state, thread);
  if (state.threads[own]?.entries.some((entry) => entry.ephemeral) !== true) {
    return undefined;
  }
  const others = runningLanes(state).filter((id) => id !== own);
  if (others.length === 0) {
    return undefined;
  }
  const lines = others.map((id) =>
    Transcript.status({
      id,
      purpose: state.threads[id]?.purpose,
      status: 'running',
      entries: Reducer.promptFor(state, id)
        .filter((entry) => !entry.ephemeral)
        .slice(-1),
    }),
  );
  return Message.make({
    sender: { role: 'user', name: 'threads' },
    blocks: [{ _tag: 'text', text: lines.join('\n'), disposition: 'synthetic' }],
  });
};

/**
 * Opens a light thread for a prompt that arrives while other lanes run: it forks main at this replica's head and
 * starts with a transcript of every running lane.
 */
export const openLightThread = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  { purpose, owner }: { purpose?: string; owner?: Trajectory.Sender } = {},
): Effect.fn.Return<Trajectory.EventId, never, Database.Service> {
  const { state, head } = yield* load(feed, Reducer.prompt);
  const open = Trajectory.make({
    payload: {
      _tag: 'threadOpen',
      mode: 'light',
      ...(head !== undefined ? { from: { event: head } } : {}),
      ...(purpose !== undefined ? { purpose } : {}),
      siblings: runningLanes(state),
    },
    sender: owner ?? { role: 'assistant' },
  });
  yield* append(feed, [open]);
  return open.id;
});

/** Who a delegated subagent's lane names as its owner. */
export const SUBAGENT: Trajectory.Sender = { role: 'assistant', name: 'subagent' };

/**
 * Delegates `task` to a subagent: opens a fresh thread on main, which starts with nothing but the task, and queues the
 * task in it for the lane scheduler to run in the background. Returns the thread's id, which `waitForThread` takes.
 */
export const delegate = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  { task, purpose, by }: { task: string; purpose?: string; by?: Trajectory.Sender },
): Effect.fn.Return<Trajectory.EventId, never, Database.Service> {
  const open = Trajectory.make({
    payload: { _tag: 'threadOpen', mode: 'fresh', ...(purpose !== undefined ? { purpose } : {}) },
    sender: SUBAGENT,
  });
  // A queued prompt is a user message; the delegating agent is the subagent's user.
  const prompt = Trajectory.make({
    payload: { _tag: 'message', blocks: [{ _tag: 'text', text: task }] },
    sender: { role: 'user', name: by?.name ?? 'assistant' },
    thread: open.id,
  });
  yield* append(feed, [open, prompt]);
  return open.id;
});

/**
 * The subagent thread a queued message was delegated to, while that thread runs; none for a person's prompt.
 */
export const delegatedThread = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  message: Trajectory.EventId,
): Effect.fn.Return<Trajectory.EventId | undefined, never, Database.Service> {
  const { state } = yield* load(feed, Reducer.thread);
  const item = state.items.find((item) => item.id === message && item.status === 'queued');
  const lane = item?.thread === undefined ? undefined : state.lanes.find((lane) => lane.id === item.thread);
  return lane?.kind === 'fresh' && lane.status === 'running' ? lane.id : undefined;
});

/** The text of a lane's last assistant message: what a subagent answers. */
const finalAnswer = (view: Reducer.ThreadView, lane: Trajectory.EventId): string =>
  view.items
    .filter((item) => item.lane === lane && item.sender.role === 'assistant' && item.status !== 'rewound')
    .map((item) => Message.extractText(Message.make({ sender: 'assistant', blocks: [...item.blocks] })).trim())
    .filter((value) => value.length > 0)
    .at(-1) ?? '';

/** How a subagent's answer reads in the conversation that delegated to it. */
const subagentAnswer = (lane: Reducer.Lane | undefined, id: Trajectory.EventId, answer: string) =>
  `Subagent ${lane?.purpose ? `"${lane.purpose}" ` : ''}(thread ${id}) finished:\n\n${answer || '(no answer)'}`;

/**
 * Joins a thread whose work is done to main. A light thread's entries follow what main holds now, as one block,
 * without its snapshot; a fresh thread (a subagent) never saw main, so only its final answer joins, as a summary.
 */
export const mergeThread = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  thread: Trajectory.EventId,
  sender: Trajectory.Sender = { role: 'assistant' },
): Effect.fn.Return<void, never, Database.Service> {
  const { state: view } = yield* load(feed, Reducer.thread);
  const lane = view.lanes.find((lane) => lane.id === thread);
  if (lane?.kind !== 'fresh') {
    yield* append(feed, [Trajectory.make({ payload: { _tag: 'threadMerge', thread, mode: 'raw' }, sender })]);
    return;
  }
  const summary = subagentAnswer(lane, thread, finalAnswer(view, thread));
  yield* append(feed, [
    Trajectory.make({
      payload: { _tag: 'threadMerge', thread, mode: 'summary', summary: [{ _tag: 'text', text: summary }] },
      sender,
    }),
  ]);
});

/** How often a waiting turn looks at the lane it waits for. */
const WAIT_POLL_MS = 500;

/**
 * Waits for the lane `on` to end, recording the wait in `turn`'s thread, and returns what the lane did as text; a
 * lane that is still running after `timeout` is reported as such rather than waited for forever.
 */
export const waitForThread = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  { turn, on, timeout = 20 * 60_000 }: { turn: Trajectory.EventId; on: Trajectory.EventId; timeout?: number },
): Effect.fn.Return<string, never, Database.Service> {
  const initial = (yield* load(feed, Reducer.thread)).state;
  const target = initial.laneOf[on] ?? on;
  if (!initial.lanes.some((lane) => lane.id === target)) {
    return `There is no thread ${on}.`;
  }
  if (initial.laneOf[turn] === target) {
    return 'A thread cannot wait for itself.';
  }
  yield* append(feed, [
    Trajectory.make({ payload: { _tag: 'threadWait', on: target }, sender: { role: 'assistant' }, thread: turn }),
  ]);
  const ended = (view: Reducer.ThreadView) => {
    const lane = view.lanes.find((lane) => lane.id === target);
    return lane !== undefined && lane.status !== 'running' && lane.status !== 'waiting';
  };
  const poll: Effect.Effect<Reducer.ThreadView, never, Database.Service> = Effect.flatMap(
    load(feed, Reducer.thread),
    ({ state }) => (ended(state) ? Effect.succeed(state) : Effect.flatMap(Effect.sleep(WAIT_POLL_MS), () => poll)),
  );
  const view = yield* poll.pipe(Effect.timeoutOption(timeout));
  if (view._tag === 'None') {
    return `Thread ${target} is still running.`;
  }
  const lane = view.value.lanes.find((lane) => lane.id === target);
  if (lane?.kind === 'fresh') {
    return subagentAnswer(lane, target, finalAnswer(view.value, target));
  }
  const entries = view.value.items
    .filter((item) => item.lane === target && item.status !== 'rewound')
    .map((item) => ({ role: item.sender.role, name: item.sender.name, blocks: item.blocks }));
  return Transcript.render({ id: target, purpose: lane?.purpose, status: 'done', entries });
});

/**
 * The prompt of the conversation a fork continues, up to and including the entry holding `origin.event`.
 */
const originHistory = Effect.fnUntraced(function* (
  origin: Trajectory.ThreadOrigin,
): Effect.fn.Return<Message.Message[], never, Database.Service> {
  const source = origin.feed?.target;
  if (!source) {
    return [];
  }

  const messages = yield* history(source);
  const cutoff = messages.findIndex((message) => message.id === origin.event);
  // A fork point the source no longer shows would otherwise splice in history the fork never had.
  return cutoff === -1 ? [] : messages.slice(0, cutoff + 1);
});

/** Messages already made for prompt entries: entries are immutable and keep their identity across loads. */
const entryMessages = new WeakMap<Reducer.PromptEntry, Message.Message>();

/**
 * A prompt entry as the message the model layer takes; its id is the first source event, so a reference to that
 * event (a fork point, a rewind) still names it.
 */
export const toMessage = (entry: Reducer.PromptEntry): Message.Message => {
  const cached = entryMessages.get(entry);
  if (cached) {
    return cached;
  }
  const message = Message.make({
    id: entry.source[0],
    sender: { role: entry.role === 'event' ? 'user' : entry.role, ...(entry.name ? { name: entry.name } : {}) },
    blocks: [...entry.blocks],
  });
  entryMessages.set(entry, message);
  return message;
};

/**
 * Appends events in one batch: the feed splits it into a few transactions instead of one per event.
 */
export const append = (
  feed: Feed.Feed,
  events: readonly Trajectory.Event[],
): Effect.Effect<void, never, Database.Service> => (events.length > 0 ? Feed.append(feed, [...events]) : Effect.void);

/**
 * Withdraws a prompt no turn has taken up yet: it leaves the queue and never reaches the model.
 */
export const cancelPrompt = (
  feed: Feed.Feed,
  message: Trajectory.EventId,
): Effect.Effect<void, never, Database.Service> =>
  append(feed, [Trajectory.make({ payload: { _tag: 'promptCancel', message }, sender: { role: 'user' } })]);

/**
 * Discards the conversation from `from` on (edit-and-resend): the next turn continues from what precedes it.
 */
export const rewind = (feed: Feed.Feed, from: Trajectory.EventId): Effect.Effect<void, never, Database.Service> =>
  append(feed, [Trajectory.make({ payload: { _tag: 'rewind', from }, sender: { role: 'user' } })]);

/**
 * Records an exchange that ran outside a model turn (a slash command and its result) as a prompt consumed on the
 * spot and its reply, so it reads like any other exchange in the conversation.
 */
export const appendExchange = (
  feed: Feed.Feed,
  { prompt, reply }: { prompt: string; reply: string },
): Effect.Effect<void, never, Database.Service> => {
  const message = Trajectory.make({
    payload: { _tag: 'message', blocks: [{ _tag: 'text', text: prompt }] },
    sender: { role: 'user' },
  });
  return append(feed, [
    message,
    Trajectory.make({ payload: { _tag: 'promptConsume', message: message.id }, sender: { role: 'assistant' } }),
    Trajectory.make({
      payload: { _tag: 'message', blocks: [{ _tag: 'text', text: reply }] },
      sender: { role: 'assistant' },
    }),
  ]);
};

/**
 * Records messages a writer produced outside an agent turn (a relay, a supervisor note, an external harness) as
 * events, keeping their ids. A user message among them already belongs to the conversation, so it is consumed on the
 * spot rather than queued.
 */
export const appendMessages = (
  feed: Feed.Feed,
  messages: readonly Message.Message[],
  options: { thread?: Trajectory.EventId } = {},
): Effect.Effect<void, never, Database.Service> =>
  append(
    feed,
    messages.flatMap((message) => {
      const event = Trajectory.make({
        id: message.id,
        payload: {
          _tag: 'message',
          blocks: message.blocks,
          attachments: message.attachments,
          properties: message.properties,
        },
        sender: Legacy.toSender(message.sender),
        thread: options.thread,
        created: message.created,
      });
      return message.sender.role === 'user'
        ? [
            event,
            Trajectory.make({
              payload: { _tag: 'promptConsume', message: message.id },
              sender: { role: 'assistant' },
              thread: options.thread,
            }),
          ]
        : [event];
    }),
  );

/**
 * The queued record a turn answers: a message it consumes, or an alarm it fires.
 */
export type TurnSource = { readonly message: Trajectory.EventId } | { readonly alarm: Trajectory.EventId };

const ALARM: Trajectory.Sender = { role: 'event', name: 'alarm' };

/**
 * Opens a turn: appends `turnBegin` recording the last item this replica has folded as what the turn saw, and
 * returns its id, which every event of the turn carries as its thread.
 */
export const beginTurn = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  {
    id,
    model,
    thread,
  }: { id?: Trajectory.EventId; model?: Trajectory.TurnBegin['model']; thread?: Trajectory.EventId } = {},
): Effect.fn.Return<Trajectory.EventId, never, Database.Service> {
  const { head } = yield* load(feed, Reducer.prompt);
  const begin = Trajectory.make({
    // Set when the turn already has an id elsewhere (a hosted agent's turn key), so a resumed turn is the same one.
    id,
    payload: {
      _tag: 'turnBegin',
      model,
      from:
        thread !== undefined
          ? // The thread's opener is in the feed, so a head is folded; the opener is the fallback if it is not yet.
            { thread, event: head ?? thread }
          : head !== undefined
            ? { event: head }
            : undefined,
    },
    sender: { role: 'assistant' },
  });
  yield* append(feed, [begin]);
  return begin.id;
});

/**
 * The events that put a turn's prompt into the conversation: a queued source is consumed (a message) or fired (an
 * alarm, whose wake-up text is `prompt`) rather than copied; a direct prompt goes on the main thread and is consumed.
 */
export const promptEvents = (
  prompt: Message.Message,
  turn: Trajectory.EventId,
  source?: TurnSource,
  { resumed = false }: { resumed?: boolean } = {},
): Trajectory.Event[] => {
  if (resumed) {
    return [];
  }
  if (source && 'message' in source) {
    return [consume(source.message, turn)];
  }
  const event = (thread?: Trajectory.EventId, sender?: Trajectory.Sender) =>
    Trajectory.make({
      id: prompt.id,
      payload: {
        _tag: 'message',
        blocks: prompt.blocks,
        attachments: prompt.attachments,
        properties: prompt.properties,
      },
      sender: sender ?? Legacy.toSender(prompt.sender),
      thread,
      created: prompt.created,
    });
  if (source) {
    return [
      Trajectory.make({ payload: { _tag: 'alarmFire', alarm: source.alarm }, sender: ALARM, thread: turn }),
      event(turn, ALARM),
    ];
  }
  return [event(), consume(prompt.id, turn)];
};

const consume = (message: Trajectory.EventId, thread: Trajectory.EventId): Trajectory.Event =>
  Trajectory.make({ payload: { _tag: 'promptConsume', message }, sender: { role: 'assistant' }, thread });

/**
 * The turn that consumed `message` and never ended: its writer died mid-turn, so the message is still owed a reply.
 */
export const interruptedTurn = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  message: Trajectory.EventId,
): Effect.fn.Return<Trajectory.EventId | undefined, never, Database.Service> {
  const { state: session } = yield* load(feed, Reducer.session);
  const { state: thread } = yield* load(feed, Reducer.thread);
  const item = thread.items.find((item) => item.id === message);
  return item?.status === 'consumed' && item.thread !== undefined && session.turns.includes(item.thread)
    ? item.thread
    : undefined;
});

/**
 * The light thread of the turn that consumed `message` and never ended, so a redelivery runs in that thread again;
 * none when the turn ran on main or its thread has already ended.
 */
export const interruptedThread = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  message: Trajectory.EventId,
): Effect.fn.Return<Trajectory.EventId | undefined, never, Database.Service> {
  const turn = yield* interruptedTurn(feed, message);
  if (turn === undefined) {
    return undefined;
  }
  const { state } = yield* load(feed, Reducer.prompt);
  const parent = state.threads[turn]?.parent;
  return parent !== undefined && state.threads[parent] && !state.threads[parent].closed ? parent : undefined;
});

/**
 * Prepares a turn that redelivers `source`: when the message was consumed by a turn that never ended, closes that
 * turn as interrupted (its partial output joins the conversation) and returns true, so the new turn does not consume
 * the message again.
 */
export const resumeInterrupted = Effect.fnUntraced(function* (
  feed: Feed.Feed,
  source?: TurnSource,
): Effect.fn.Return<boolean, never, Database.Service> {
  const dead = source && 'message' in source ? yield* interruptedTurn(feed, source.message) : undefined;
  if (dead === undefined) {
    return false;
  }
  yield* append(feed, [interrupted(dead)]);
  return true;
});

const interrupted = (begin: Trajectory.EventId): Trajectory.Event =>
  Trajectory.make({
    payload: { _tag: 'turnEnd', begin, finishReason: 'other', error: 'interrupted' },
    sender: { role: 'assistant' },
  });

/**
 * Closes a turn, recording how it ended; a stop the reader asked for is not an error. Its thread merges into the
 * conversation whether or not it succeeded. An interrupted turn answering a queued message stays open: its process
 * redelivers the message after a restart, or closes the turn when it acks the message after a stop.
 */
export const endTurn = (
  feed: Feed.Feed,
  begin: Trajectory.EventId,
  exit: Exit.Exit<unknown, unknown>,
  { source }: { source?: TurnSource } = {},
): Effect.Effect<void, never, Database.Service> => {
  const interruptedExit = Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause);
  if (interruptedExit && source && 'message' in source) {
    return Effect.void;
  }
  return append(feed, [
    interruptedExit
      ? interrupted(begin)
      : Trajectory.make({
          payload: Exit.isSuccess(exit)
            ? { _tag: 'turnEnd', begin, finishReason: 'stop' }
            : { _tag: 'turnEnd', begin, finishReason: 'error', error: Cause.pretty(exit.cause) },
          sender: { role: 'assistant' },
        }),
  ]);
};

/**
 * Runs `body` as one turn of the conversation: opens it, puts `prompt` in (see {@link promptEvents}), hands `body`
 * an appender that writes into the turn's thread, and closes it however `body` ends. For turn producers that do not
 * go through `AiSession`.
 */
export const turn = Effect.fnUntraced(function* <A, E, R>(
  feed: Feed.Feed,
  {
    prompt,
    source,
    model,
    thread,
  }: {
    prompt: Message.Message;
    source?: TurnSource;
    model?: Trajectory.TurnBegin['model'];
    /** The light thread the turn runs in; absent for main. */
    thread?: Trajectory.EventId;
  },
  body: (
    append: (messages: readonly Message.Message[]) => Effect.Effect<void, never, Database.Service>,
  ) => Effect.Effect<A, E, R>,
): Effect.fn.Return<A, E, R | Database.Service> {
  const resumed = yield* resumeInterrupted(feed, source);
  const begin = yield* beginTurn(feed, { model, thread });
  yield* append(feed, promptEvents(prompt, begin, source, { resumed }));
  return yield* body((messages) => appendMessages(feed, messages, { thread: begin })).pipe(
    Effect.onExit((exit) => endTurn(feed, begin, exit, { source })),
  );
});
