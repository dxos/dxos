//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Feed, Obj } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as AiContext from './AiContext.ts';
import * as Alarm from './Alarm.ts';
import * as SessionLink from './SessionLink.ts';
import { isConsumed, isQueued } from './SessionStore.ts';

/**
 * A record a feed held before conversations became trajectories.
 */
export type Record = Message.Message | AiContext.Binding | Alarm.Alarm | SessionLink.SessionLink;

/** Every legacy record type, for selecting them out of a feed. */
export const types = [Message.Message, AiContext.Binding, Alarm.Alarm, SessionLink.SessionLink] as const;

export const isRecord = (item: unknown): item is Record =>
  Obj.instanceOf(Message.Message, item) ||
  Obj.instanceOf(AiContext.Binding, item) ||
  Obj.instanceOf(Alarm.Alarm, item) ||
  Obj.instanceOf(SessionLink.SessionLink, item);

/**
 * Converts the legacy records among `items` (in feed order) to the events that reproduce their conversation, passing
 * trajectory events through, so a feed written in both formats folds as one log.
 *
 * The converted events exist only in memory and are never appended, so a consume or fire reuses the id of the record
 * it stands for: events written later still reference that record by its id.
 */
export const toEvents = (items: readonly (Record | Trajectory.Event)[]): Trajectory.Event[] => {
  const live = items.filter((item) => !Obj.isDeleted(item));
  // Rewound turns stay in the log but left the conversation, so only the lineage the head reaches is kept.
  const messages = live.filter((item): item is Message.Message => Obj.instanceOf(Message.Message, item));
  const reachable = new Set(Feed.history(messages.filter((message) => !isQueued(message))).items.map(({ id }) => id));

  return live.flatMap((item): Trajectory.Event[] => {
    if (Obj.instanceOf(Trajectory.Event, item)) {
      return [item];
    }
    if (Obj.instanceOf(Message.Message, item)) {
      return fromMessage(item, reachable);
    }
    if (Obj.instanceOf(AiContext.Binding, item)) {
      return fromBinding(item);
    }
    if (Obj.instanceOf(Alarm.Alarm, item)) {
      return fromAlarm(item);
    }
    return [
      Trajectory.make({
        id: item.id,
        payload: { _tag: 'fork', from: { feed: item.feedRef, event: item.messageId } },
        sender: { role: 'event' },
      }),
    ];
  });
};

const fromMessage = (message: Message.Message, reachable: ReadonlySet<string>): Trajectory.Event[] => {
  const queued = isQueued(message);
  // A consumed queue entry was copied into the user message its turn appended, which is what the conversation shows.
  if ((queued && isConsumed(message)) || (!queued && !reachable.has(message.id))) {
    return [];
  }

  const sender = toSender(message.sender);
  const content = Trajectory.make({
    id: message.id,
    payload: { _tag: 'message', blocks: message.blocks, attachments: message.attachments },
    sender,
    created: message.created,
  });
  // A user message outside the queue went straight into the conversation, which a consume now expresses.
  return sender.role === 'user' && !queued
    ? [
        content,
        Trajectory.make({
          id: message.id,
          payload: { _tag: 'promptConsume', message: message.id },
          sender: { role: 'assistant' },
          created: message.created,
        }),
      ]
    : [content];
};

const fromBinding = (binding: AiContext.Binding): Trajectory.Event[] => {
  const sender: Trajectory.Sender = { role: 'event', name: 'context' };
  const bind =
    binding.skills.added.length > 0 || binding.objects.added.length > 0
      ? [
          Trajectory.make({
            id: binding.id,
            payload: { _tag: 'contextBind', skills: binding.skills.added, objects: binding.objects.added },
            sender,
          }),
        ]
      : [];
  const unbind =
    binding.skills.removed.length > 0 || binding.objects.removed.length > 0
      ? [
          Trajectory.make({
            id: binding.id,
            payload: { _tag: 'contextUnbind', skills: binding.skills.removed, objects: binding.objects.removed },
            sender,
          }),
        ]
      : [];
  return [...bind, ...unbind];
};

const fromAlarm = (alarm: Alarm.Alarm): Trajectory.Event[] => {
  const sender: Trajectory.Sender = { role: 'event', name: 'alarm' };
  const set = Trajectory.make({
    id: alarm.id,
    payload: { _tag: 'alarmSet', wakeAt: alarm.wakeAt, message: alarm.message },
    sender,
    created: alarm.created,
  });
  return isConsumed(alarm)
    ? [set, Trajectory.make({ id: alarm.id, payload: { _tag: 'alarmFire', alarm: alarm.id }, sender })]
    : [set];
};

/**
 * The trajectory sender for a message's actor; an actor without a role wrote into the conversation as a user.
 */
export const toSender = (actor: Message.Message['sender']): Trajectory.Sender => ({
  role: actor.role ?? 'user',
  ...(IdentityDid.isValid(actor.identityDid) ? { identity: actor.identityDid } : {}),
  ...(actor.subject ? { subject: actor.subject } : {}),
  ...(actor.name ? { name: actor.name } : {}),
});
