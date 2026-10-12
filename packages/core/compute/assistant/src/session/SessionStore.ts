//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, type Feed, Obj } from '@dxos/echo';
import { Durable, type Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as Alarm from './Alarm.ts';
import * as Legacy from './Legacy.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

/**
 * The pending (queued, un-acked) portion of a session's feed state.
 */
export interface PendingState {
  /** Input messages owed a reply: those whose turn died mid-way, then the queue in feed order. */
  pendingMessages: Message.Message[];
  /** Alarms that have neither fired nor been cancelled, earliest `wakeAt` first. */
  pendingAlarms: Alarm.Alarm[];
}

/**
 * The session state reconstructed from the feed for the next turn.
 */
export interface SessionState extends PendingState {
  /** The conversation as the model should see it (queued messages excluded, a fork's origin included). */
  history: Message.Message[];
}

export type SetAlarmProps = Alarm.MakeProps;

/**
 * The agent process's view of a session feed: the input queue, pending alarms and history, all folded from the
 * feed's trajectory events (legacy records converted on read) and written back as events.
 *
 * A queued message leaves the queue when the turn it drives consumes it (`promptConsume`), which is also where it
 * enters the conversation, so the queue entry and the turn's prompt are one record rather than two.
 */
export class SessionStore {
  /**
   * Reconstructs {@link PendingState} from the cached session and thread reductions.
   */
  loadPending(feed: Feed.Feed): Effect.Effect<PendingState, never, Database.Service> {
    return Effect.gen(function* () {
      const { state: session } = yield* TrajectoryStore.load(feed, Durable.session);
      const { state: thread } = yield* TrajectoryStore.load(feed, Durable.thread);
      const queued = new Map(thread.items.map((item) => [item.id, item]));
      // A message whose turn never ended (its process died mid-turn) is owed a reply, so it stays pending.
      const open = new Set(session.turns);
      const interrupted = thread.items.filter(
        (item) => item.status === 'consumed' && item.thread !== undefined && open.has(item.thread),
      );
      const pendingMessages = [
        ...interrupted.map(toQueuedMessage),
        ...session.queue.flatMap((id) => {
          const item = queued.get(id);
          return item ? [toQueuedMessage(item)] : [];
        }),
      ];
      const pendingAlarms = session.alarms
        .map((alarm) =>
          Obj.make(Alarm.Alarm, { id: alarm.id, wakeAt: alarm.wakeAt, message: alarm.message, created: '' }),
        )
        .sort((left, right) => left.wakeAt - right.wakeAt);
      return { pendingMessages, pendingAlarms };
    });
  }

  /**
   * Reconstructs {@link SessionState}: {@link loadPending} plus the conversation history.
   */
  loadState(feed: Feed.Feed): Effect.Effect<SessionState, never, Database.Service> {
    return Effect.gen({ self: this }, function* () {
      const pending = yield* this.loadPending(feed);
      const history = yield* TrajectoryStore.history(feed);
      return { history, ...pending };
    });
  }

  /**
   * Appends `message` to the feed as queued input: a user message waits until a turn consumes it.
   */
  enqueueMessage(feed: Feed.Feed, message: Message.Message): Effect.Effect<Message.Message, never, Database.Service> {
    return TrajectoryStore.append(feed, [
      Trajectory.make({
        id: message.id,
        payload: {
          _tag: 'message',
          blocks: message.blocks,
          attachments: message.attachments,
          properties: message.properties,
        },
        sender: { ...Legacy.toSender(message.sender), role: 'user' },
        created: message.created,
      }),
    ]).pipe(Effect.as(message));
  }

  /**
   * Retires a queued item without a turn: an alarm fires, a message is cancelled, and a turn that died consuming a
   * message is closed as interrupted. A message whose turn ended is already out of the queue, so acking it writes
   * nothing.
   */
  ack(feed: Feed.Feed, item: Message.Message | Alarm.Alarm): Effect.Effect<void, never, Database.Service> {
    return Effect.gen(function* () {
      const { state } = yield* TrajectoryStore.load(feed, Durable.session);
      if (Obj.instanceOf(Alarm.Alarm, item)) {
        if (state.alarms.some((alarm) => alarm.id === item.id)) {
          yield* TrajectoryStore.append(feed, [
            Trajectory.make({ payload: { _tag: 'alarmFire', alarm: item.id }, sender: ALARM }),
          ]);
        }
      } else if (state.queue.includes(item.id)) {
        yield* TrajectoryStore.append(feed, [
          Trajectory.make({ payload: { _tag: 'promptCancel', message: item.id }, sender: { role: 'assistant' } }),
        ]);
      } else {
        yield* TrajectoryStore.resumeInterrupted(feed, { message: item.id });
      }
    });
  }

  /**
   * Schedules an alarm. Multiple alarms may be pending.
   */
  setAlarm(feed: Feed.Feed, props: SetAlarmProps): Effect.Effect<Alarm.Alarm, never, Database.Service> {
    const alarm = Alarm.make(props);
    return TrajectoryStore.append(feed, [
      Trajectory.make({
        id: alarm.id,
        payload: { _tag: 'alarmSet', wakeAt: alarm.wakeAt, message: alarm.message },
        sender: ALARM,
        created: alarm.created,
      }),
    ]).pipe(Effect.as(alarm));
  }

  /**
   * Cancels a pending alarm.
   */
  cancelAlarm(feed: Feed.Feed, alarm: Alarm.Alarm): Effect.Effect<void, never, Database.Service> {
    return TrajectoryStore.append(feed, [
      Trajectory.make({ payload: { _tag: 'alarmCancel', alarm: alarm.id }, sender: ALARM }),
    ]);
  }
}

const ALARM: Trajectory.Sender = { role: 'event', name: 'alarm' };

/**
 * A queued thread item as the message the agent process takes a prompt from.
 */
const toQueuedMessage = (item: Reducer.ThreadItem): Message.Message =>
  Message.make({
    id: item.id,
    created: item.created,
    sender: { ...TrajectoryStore.toActor(item.sender), role: 'user' },
    blocks: [...item.blocks],
  });
