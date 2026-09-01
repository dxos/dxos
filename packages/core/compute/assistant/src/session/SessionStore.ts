//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Database, EID, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as Alarm from './Alarm';
import * as SessionLink from './SessionLink';

/**
 * Marks a feed `Message` as queued agent input, pending processing. A queued message never enters
 * conversation history — when the agent dequeues it, the echo appended by {@link SessionStore.ackMessage}
 * carries the history instead.
 */
export const QueuedAnnotation: Annotation.Annotation<boolean> = Annotation.make({
  id: 'org.dxos.annotation.queued',
  schema: Schema.Boolean,
});

/**
 * References the queued item (a `Message` or an {@link Alarm.Alarm}) that the carrying message
 * dequeues.
 */
export const AckAnnotation: Annotation.Annotation<Ref.Ref<Obj.Unknown>> = Annotation.make({
  id: 'org.dxos.annotation.ack',
  schema: Ref.Ref(Obj.Unknown),
});

export const isQueued = (item: Obj.Unknown | Obj.Snapshot): boolean =>
  Option.getOrElse(Annotation.get(item, QueuedAnnotation), () => false);

/** The entity id of the queued item the carrying message acks, or `undefined` when it acks nothing. */
export const getAck = (item: Obj.Unknown | Obj.Snapshot): Obj.ID | undefined => {
  const ref = Option.getOrUndefined(Annotation.get(item, AckAnnotation));
  if (ref === undefined) {
    return undefined;
  }
  const eid = EID.tryParse(ref.uri);
  return eid !== undefined ? EID.getEntityId(eid) : undefined;
};

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
 * advance that state. The pending queue is a projection: an item is pending until a message carrying
 * {@link AckAnnotation} names it; acked items stay in the feed, and `Feed.remove` is only the
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
      const items = yield* Feed.query(feed, Filter.everything()).run;

      const messages: Message.Message[] = [];
      const alarms: Alarm.Alarm[] = [];
      const acked = new Set<string>();
      for (const item of items) {
        if (Obj.instanceOf(Message.Message, item)) {
          messages.push(item);
          const ack = getAck(item);
          if (ack !== undefined) {
            acked.add(ack);
          }
        } else if (Obj.instanceOf(Alarm.Alarm, item)) {
          alarms.push(item);
        }
      }

      const ordered = [...messages].sort(byFeedPosition);
      const pendingMessages = ordered.filter((message) => isQueued(message) && !acked.has(message.id));
      const pendingAlarms = alarms.filter((alarm) => !acked.has(alarm.id)).sort((a, b) => a.wakeAt - b.wakeAt);

      return { ordered, pendingMessages, pendingAlarms };
    });
  }

  /**
   * Prepends linked history to `messages` when the feed contains a SessionLink.
   * Queries the feed for any SessionLink record; if found, loads messages from
   * the referenced feed up to and including `messageId` and prepends them.
   * Queued originals never enter history — their ack echoes carry it.
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
   * Dequeues `original` by appending an echo of it that carries {@link AckAnnotation}. The echo is
   * the message that enters history; the single append is the atomic ack. Returns the echo.
   */
  ackMessage(feed: Feed.Feed, original: Message.Message): Effect.Effect<Message.Message, never, Database.Service> {
    const echo = Message.make({
      parentMessage: original.parentMessage,
      threadId: original.threadId,
      created: original.created,
      sender: original.sender,
      blocks: [...original.blocks],
      attachments: original.attachments !== undefined ? [...original.attachments] : undefined,
      properties: original.properties !== undefined ? { ...original.properties } : undefined,
    });
    Obj.update(echo, (echo) => Annotation.set(echo, AckAnnotation, Ref.make(original)));
    return Feed.append(feed, [echo]).pipe(Effect.as(echo));
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

  /**
   * Dequeues a fired alarm by appending its wake-up `message` stamped with {@link AckAnnotation}.
   * Returns the appended message.
   */
  ackAlarm(
    feed: Feed.Feed,
    alarm: Alarm.Alarm,
    message: Message.Message,
  ): Effect.Effect<Message.Message, never, Database.Service> {
    Obj.update(message, (message) => Annotation.set(message, AckAnnotation, Ref.make(alarm)));
    return Feed.append(feed, [message]).pipe(Effect.as(message));
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
