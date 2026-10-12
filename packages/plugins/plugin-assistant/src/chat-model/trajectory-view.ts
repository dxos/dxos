//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { Alarm, Legacy, TrajectoryStore } from '@dxos/assistant';
import { Annotation, Obj } from '@dxos/echo';
import { Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

/**
 * What the chat renders from its feed: messages as the thread shows them, the alarms still waiting, and how many
 * alarms have woken the agent since the last prompt a person typed.
 */
export type TrajectoryView = {
  /** Every message in thread order; a prompt still waiting for the agent carries the legacy queued annotation. */
  readonly messages: readonly Message.Message[];
  readonly alarms: Alarm.Alarm[];
  readonly selfWakes: number;
  /** Messages a rewind discarded: a prompt or streamed message among these was shown, and is now gone. */
  readonly discarded: readonly Message.Message[];
};

export const EMPTY_VIEW: TrajectoryView = { messages: [], alarms: [], selfWakes: 0, discarded: [] };

type Fold = {
  readonly items: readonly unknown[];
  readonly events: readonly Trajectory.Event[];
  readonly thread: Reducer.Checkpoint<Reducer.ThreadView>;
  readonly session: Reducer.Checkpoint<Reducer.SessionState>;
  readonly selfWakes: number;
};

/**
 * Folds the feed's items (read in local order) into a {@link TrajectoryView}. Local order only ever grows at the end,
 * so each update folds just the new items; a change anywhere else (a legacy record, which converts with the whole
 * feed in view) refolds everything.
 */
export const makeTrajectoryView = (items: Atom.Atom<readonly Obj.Unknown[]>): Atom.Atom<TrajectoryView> => {
  let last: Fold | undefined;
  const views = new Map<string, Message.Message>();
  const alarmViews = new Map<string, Alarm.Alarm>();
  return Atom.make((get) => {
    last = fold(get(items), last);
    return {
      messages: last.thread.state.items.flatMap((item) => {
        const view = item.status === 'rewound' ? undefined : toView(item, views);
        return view ? [view] : [];
      }),
      discarded: last.thread.state.items.flatMap((item) => {
        const view = item.status === 'rewound' ? toView(item, views) : undefined;
        return view ? [view] : [];
      }),
      alarms: [...last.session.state.alarms]
        .sort((left, right) => left.wakeAt - right.wakeAt)
        .map((alarm) => alarmView(alarm, alarmViews)),
      selfWakes: last.selfWakes,
    };
  });
};

const fold = (items: readonly Obj.Unknown[], previous: Fold | undefined): Fold => {
  const records = items.filter(
    (item): item is Trajectory.Event | Legacy.Record => Legacy.isRecord(item) || Obj.instanceOf(Trajectory.Event, item),
  );
  const resumable =
    previous !== undefined &&
    records.length >= previous.items.length &&
    previous.items.every((item, index) => records[index] === item) &&
    !records.slice(previous.items.length).some(Legacy.isRecord);
  const tail = resumable ? Legacy.toEvents(records.slice(previous.items.length)) : Legacy.toEvents(records);
  const base = resumable ? previous : undefined;
  return {
    items: records,
    events: [...(base?.events ?? []), ...tail],
    thread: Reducer.run(Reducer.thread, tail, base?.thread),
    session: Reducer.run(Reducer.session, tail, base?.session),
    selfWakes: tail.reduce(countWake, base?.selfWakes ?? 0),
  };
};

/** Alarms fired since the last prompt a person typed: the count the runtime caps at `Alarm.MAX_SELF_WAKES`. */
const countWake = (count: number, event: Trajectory.Event): number =>
  event.payload._tag === 'alarmFire'
    ? count + 1
    : event.payload._tag === 'message' &&
        event.sender.role === 'user' &&
        event.payload.blocks.some((block) => block._tag === 'text' && block.disposition !== 'synthetic')
      ? 0
      : count;

/**
 * A thread item as the message the chat components render, reused while the item is unchanged so rows keep their
 * identity. A cancelled prompt is gone from the thread.
 */
const toView = (item: Reducer.ThreadItem, views: Map<string, Message.Message>): Message.Message | undefined => {
  if (item.status === 'cancelled') {
    return undefined;
  }
  const key = `${item.id}:${item.status}`;
  const cached = views.get(key);
  if (cached) {
    return cached;
  }
  const view = Message.make({
    id: item.id,
    created: item.created,
    sender: TrajectoryStore.toActor(item.sender),
    blocks: [...item.blocks],
  });
  if (item.status === 'queued') {
    Obj.update(view, (view) => Annotation.set(view, Legacy.QueuedAnnotation, true));
  }
  views.set(key, view);
  return view;
};

const alarmView = (alarm: Reducer.Alarm, views: Map<string, Alarm.Alarm>): Alarm.Alarm => {
  const cached = views.get(alarm.id);
  if (cached) {
    return cached;
  }
  const view = Obj.make(Alarm.Alarm, { id: alarm.id, wakeAt: alarm.wakeAt, message: alarm.message, created: '' });
  views.set(alarm.id, view);
  return view;
};
