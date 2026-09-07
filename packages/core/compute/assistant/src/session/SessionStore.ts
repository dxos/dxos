//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Database, Feed, Filter, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as Alarm from './Alarm';
import * as SessionLink from './SessionLink';

/**
 * Marks a feed `Message` as queued agent input, pending processing. A queued message is the queue
 * entry, not a turn, so it never enters conversation history — the turn the agent runs from it
 * appends its own user message, which is what history shows.
 */
export const QueuedAnnotation: Annotation.Annotation<boolean> = Annotation.make({
  id: 'org.dxos.annotation.queued',
  schema: Schema.Boolean,
});

/**
 * Marks a queued item (a `Message` or an {@link Alarm.Alarm}) as taken up and finished with.
 *
 * Written by the agent AFTER the turn it drove, never before: the mark is the ack in a queue, and an
 * ack written up front would drop the item on a process that dies mid-turn. Because it lands late,
 * an interrupted turn is redelivered — at-least-once, matching how tool results already behave.
 */
export const ConsumedAnnotation: Annotation.Annotation<boolean> = Annotation.make({
  id: 'org.dxos.annotation.consumed',
  schema: Schema.Boolean,
});

/**
 * Marks a queued item as taken up by the turn currently running.
 *
 * Distinct from {@link ConsumedAnnotation}, which cannot serve this purpose: the ack lands only after
 * the turn, so between the agent dequeuing an entry and finishing with it the entry is still pending
 * — and the turn has meanwhile appended its own user message built from the entry's blocks, leaving
 * the same content rendered in both the queue and the thread. An in-flight entry stays in the pending
 * set, so a process that dies mid-turn still redelivers it; it is only held out of the queue view,
 * which the thread now speaks for.
 */
export const InFlightAnnotation: Annotation.Annotation<boolean> = Annotation.make({
  id: 'org.dxos.annotation.inFlight',
  schema: Schema.Boolean,
});

export const isQueued = (item: Obj.Unknown | Obj.Snapshot): boolean =>
  Option.getOrElse(Annotation.get(item, QueuedAnnotation), () => false);

export const isConsumed = (item: Obj.Unknown | Obj.Snapshot): boolean =>
  Option.getOrElse(Annotation.get(item, ConsumedAnnotation), () => false);

export const isInFlight = (item: Obj.Unknown | Obj.Snapshot): boolean =>
  Option.getOrElse(Annotation.get(item, InFlightAnnotation), () => false);

/**
 * The pending (queued, un-acked) portion of a session's feed state.
 */
export interface PendingState {
  /** Queued, un-acked input messages in feed order. */
  pendingMessages: Message.Message[];
  /** Un-acked alarms, earliest `wakeAt` first. */
  pendingAlarms: Alarm.Alarm[];
}

/**
 * The session state reconstructed from the feed for the next turn.
 */
export interface SessionState extends PendingState {
  /** The conversation as the model should see it (queued originals excluded, fork history reified). */
  history: Message.Message[];
}

export type SetAlarmProps = Alarm.MakeProps;

/**
 * Maps between a session feed and reified session state: conversation history (resolving
 * `SessionLink` fork records), the pending input queue, and pending alarms — plus the writes that
 * advance that state. The pending queue is a projection: an item is pending until it is marked with
 * {@link ConsumedAnnotation}; consumed items stay in the feed, and `Feed.remove` is only the
 * cancellation of a still-pending item.
 */
export class SessionStore {
  /**
   * Reconstructs {@link PendingState} with a single feed query and one linear scan over its items.
   */
  loadPending(feed: Feed.Feed): Effect.Effect<PendingState, never, Database.Service> {
    return Effect.map(this.#scan(feed), ({ pendingMessages, pendingAlarms }) => ({ pendingMessages, pendingAlarms }));
  }

  /**
   * Reconstructs {@link SessionState}: the linear scan of {@link loadPending} plus reified history.
   */
  loadState(feed: Feed.Feed): Effect.Effect<SessionState, never, Database.Service> {
    return Effect.gen({ self: this }, function* () {
      const { ordered, pendingMessages, pendingAlarms } = yield* this.#scan(feed);
      const { items: reachable } = Feed.history(ordered.filter((message) => !isQueued(message)));
      const history = yield* this.reifyHistory(feed, reachable);
      return { history, pendingMessages, pendingAlarms };
    });
  }

  /** One feed query, one linear scan: partitions items and projects the pending sets. */
  #scan(feed: Feed.Feed): Effect.Effect<PendingState & { ordered: Message.Message[] }, never, Database.Service> {
    return Effect.gen(function* () {
      // The two record kinds by type rather than `Filter.everything()`: the queue only cares about
      // these, and an everything-query also drags in the tombstone a cancellation leaves behind.
      const items = yield* Feed.query(feed, Filter.or(Filter.type(Message.Message), Filter.type(Alarm.Alarm))).run;

      const messages: Message.Message[] = [];
      const alarms: Alarm.Alarm[] = [];
      for (const item of items) {
        // A cancelled entry is removed from the feed, and `Feed.remove` leaves a tombstone that keeps
        // the item's type and body (so it still looks queued) — skip it or a cancellation never takes.
        if (Obj.isDeleted(item)) {
          continue;
        }
        if (Obj.instanceOf(Message.Message, item)) {
          messages.push(item);
        } else if (Obj.instanceOf(Alarm.Alarm, item)) {
          alarms.push(item);
        }
      }

      const ordered = [...messages].sort(byFeedPosition);
      const pendingMessages = ordered.filter((message) => isQueued(message) && !isConsumed(message));
      const pendingAlarms = alarms.filter((alarm) => !isConsumed(alarm)).sort((a, b) => a.wakeAt - b.wakeAt);

      return { ordered, pendingMessages, pendingAlarms };
    });
  }

  /**
   * Prepends linked history to `messages` when the feed contains a SessionLink.
   * Queries the feed for any SessionLink record; if found, loads messages from
   * the referenced feed up to and including `messageId` and prepends them.
   * Queued entries never enter history — the turn driven from one appends its own user message.
   */
  reifyHistory(
    feed: Feed.Feed,
    messages: Message.Message[],
  ): Effect.Effect<Message.Message[], never, Database.Service> {
    const current = messages.filter((message) => !isQueued(message));
    return Effect.gen(function* () {
      const links = yield* Feed.query(feed, Filter.type(SessionLink.SessionLink)).run;
      const sessionLinks = links.filter(Obj.instanceOf(SessionLink.SessionLink));

      const link = sessionLinks[0];
      if (!link) {
        return current;
      }

      const sourceFeed = link.feedRef.target;
      if (!sourceFeed) {
        return current;
      }

      const sourceMessages = yield* Feed.query(sourceFeed, Filter.type(Message.Message)).run;
      const filtered = sourceMessages.filter(Obj.instanceOf(Message.Message)).filter((message) => !isQueued(message));

      // Sort by creation timestamp so history is in chronological order.
      const sorted = [...filtered].sort((a, b) => a.created.localeCompare(b.created));

      // Include messages up to and including the fork point.
      const cutoffIndex = sorted.findIndex((m) => m.id === link.messageId);
      if (cutoffIndex < 0) {
        // Fork point not found; return original messages unmodified to avoid injecting unexpected history.
        return current;
      }

      return [...sorted.slice(0, cutoffIndex + 1), ...current];
    });
  }

  /**
   * Appends `message` to the feed as queued input (pending until acked or removed).
   */
  enqueueMessage(feed: Feed.Feed, message: Message.Message): Effect.Effect<Message.Message, never, Database.Service> {
    Obj.update(message, (message) => Annotation.set(message, QueuedAnnotation, true));
    return Feed.append(feed, [message]).pipe(Effect.as(message));
  }

  /**
   * Marks a queued item as consumed, taking it out of the pending projection. Re-appending an item
   * by id is an upsert, so this records the mark without adding a record to the log.
   *
   * Call it AFTER the work the item drove: the pending set is what a rehydrated process reads, so an
   * item marked early is an item silently dropped when that process dies mid-turn.
   */
  /**
   * Marks a queued item as taken up by the running turn, taking it out of the queue view without
   * taking it out of the pending set (see {@link InFlightAnnotation}).
   *
   * Call it when the item is dequeued, BEFORE the work it drives — the opposite of {@link ack}.
   */
  markInFlight(feed: Feed.Feed, item: Message.Message | Alarm.Alarm): Effect.Effect<void, never, Database.Service> {
    Obj.update(item, (item) => Annotation.set(item, InFlightAnnotation, true));
    return Feed.append(feed, [item]).pipe(Effect.asVoid);
  }

  ack(feed: Feed.Feed, item: Message.Message | Alarm.Alarm): Effect.Effect<void, never, Database.Service> {
    Obj.update(item, (item) => Annotation.set(item, ConsumedAnnotation, true));
    return Feed.append(feed, [item]).pipe(Effect.asVoid);
  }

  /**
   * Schedules an alarm by appending an {@link Alarm.Alarm} record. Multiple alarms may be pending.
   */
  setAlarm(feed: Feed.Feed, props: SetAlarmProps): Effect.Effect<Alarm.Alarm, never, Database.Service> {
    const alarm = Alarm.make(props);
    return Feed.append(feed, [alarm]).pipe(Effect.as(alarm));
  }

  /**
   * Cancels a pending alarm (plain feed CRUD; an already-acked alarm needs no cancellation).
   */
  cancelAlarm(feed: Feed.Feed, alarm: Alarm.Alarm): Effect.Effect<void, never, Database.Service> {
    return Feed.remove(feed, [alarm]);
  }
}

/**
 * Orders feed items by the position the server assigned them. Unpositioned blocks (written locally
 * and not yet acknowledged) sort last: a message just written is the newest.
 */
const byFeedPosition = (a: Message.Message, b: Message.Message): number => {
  const positionA = Feed.getPosition(a);
  const positionB = Feed.getPosition(b);
  return positionA === positionB ? 0 : positionA < positionB ? -1 : 1;
};
