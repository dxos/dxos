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
 * Every event in `feed`, legacy records converted in place, in local order.
 */
export const read = (feed: Feed.Feed): Effect.Effect<Trajectory.Event[], never, Database.Service> =>
  Effect.map(readItems(feed), Legacy.toEvents);

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
    sender: { role: entry.role === 'event' ? 'user' : entry.role },
    blocks: [...entry.blocks],
  });

/**
 * Appends events in one batch: the feed splits it into a few transactions instead of one per event.
 */
export const append = (
  feed: Feed.Feed,
  events: readonly Trajectory.Event[],
): Effect.Effect<void, never, Database.Service> => (events.length > 0 ? Feed.append(feed, [...events]) : Effect.void);
