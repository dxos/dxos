//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

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
