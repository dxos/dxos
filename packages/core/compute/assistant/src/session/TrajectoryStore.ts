//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { type Database, Feed } from '@dxos/echo';
import { Durable, Reducer, Trajectory } from '@dxos/trajectory';
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
            }),
          ]
        : [],
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
  reducer: Durable.Durable<S>,
): Effect.Effect<Reducer.Checkpoint<S>, never, Database.Service> => TrajectoryCache.load(feed, reducer);

/**
 * The conversation a turn in `thread` (absent: the main thread) sends, as messages: a forked feed's origin first,
 * then this feed's prompt.
 */
export const history = (
  feed: Feed.Feed,
  thread?: Trajectory.EventId,
): Effect.Effect<Message.Message[], never, Database.Service> =>
  Effect.gen(function* () {
    const { state } = yield* load(feed, Durable.prompt);
    const origin = state.origin ? yield* originHistory(state.origin) : [];
    return [...origin, ...Reducer.promptFor(state, thread).map(toMessage)];
  });

/**
 * The prompt of the conversation a fork continues, up to and including the entry holding `origin.event`.
 */
const originHistory = (origin: Trajectory.ThreadOrigin): Effect.Effect<Message.Message[], never, Database.Service> =>
  Effect.gen(function* () {
    const source = origin.feed?.target;
    if (!source) {
      return [];
    }

    const messages = yield* history(source);
    const cutoff = messages.findIndex((message) => message.id === origin.event);
    // A fork point the source no longer shows would otherwise splice in history the fork never had.
    return cutoff === -1 ? [] : messages.slice(0, cutoff + 1);
  });

/**
 * A prompt entry as the message the model layer takes; its id is the first source event, so a reference to that
 * event (a fork point, a rewind) still names it.
 */
export const toMessage = (entry: Reducer.PromptEntry): Message.Message =>
  Message.make({
    id: entry.source[0],
    sender: { role: entry.role === 'event' ? 'user' : entry.role, ...(entry.name ? { name: entry.name } : {}) },
    blocks: [...entry.blocks],
  });

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
        payload: { _tag: 'message', blocks: message.blocks, attachments: message.attachments },
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
export const beginTurn = (
  feed: Feed.Feed,
  { id, model }: { id?: Trajectory.EventId; model?: Trajectory.TurnBegin['model'] } = {},
): Effect.Effect<Trajectory.EventId, never, Database.Service> =>
  Effect.gen(function* () {
    const { head } = yield* load(feed, Durable.prompt);
    const begin = Trajectory.make({
      // Set when the turn already has an id elsewhere (a hosted agent's turn key), so a resumed turn is the same one.
      id,
      payload: { _tag: 'turnBegin', model, from: head !== undefined ? { event: head } : undefined },
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
): Trajectory.Event[] => {
  if (source && 'message' in source) {
    return [consume(source.message, turn)];
  }
  const event = (thread?: Trajectory.EventId, sender?: Trajectory.Sender) =>
    Trajectory.make({
      id: prompt.id,
      payload: { _tag: 'message', blocks: prompt.blocks, attachments: prompt.attachments },
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
 * Closes a turn, recording how it ended; a stop the reader asked for is not an error. Its thread merges into the
 * conversation whether or not it succeeded.
 */
export const endTurn = (
  feed: Feed.Feed,
  begin: Trajectory.EventId,
  exit: Exit.Exit<unknown, unknown>,
): Effect.Effect<void, never, Database.Service> =>
  append(feed, [
    Trajectory.make({
      payload: Exit.isSuccess(exit)
        ? { _tag: 'turnEnd', begin, finishReason: 'stop' }
        : Cause.hasInterrupts(exit.cause)
          ? { _tag: 'turnEnd', begin, finishReason: 'other', error: 'interrupted' }
          : { _tag: 'turnEnd', begin, finishReason: 'error', error: Cause.pretty(exit.cause) },
      sender: { role: 'assistant' },
    }),
  ]);

/**
 * Runs `body` as one turn of the conversation: opens it, puts `prompt` in (see {@link promptEvents}), hands `body`
 * an appender that writes into the turn's thread, and closes it however `body` ends. For turn producers that do not
 * go through `AiSession`.
 */
export const turn = <A, E, R>(
  feed: Feed.Feed,
  { prompt, source, model }: { prompt: Message.Message; source?: TurnSource; model?: Trajectory.TurnBegin['model'] },
  body: (
    append: (messages: readonly Message.Message[]) => Effect.Effect<void, never, Database.Service>,
  ) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | Database.Service> =>
  Effect.gen(function* () {
    const begin = yield* beginTurn(feed, { model });
    yield* append(feed, promptEvents(prompt, begin, source));
    return yield* body((messages) => appendMessages(feed, messages, { thread: begin })).pipe(
      Effect.onExit((exit) => endTurn(feed, begin, exit)),
    );
  });
