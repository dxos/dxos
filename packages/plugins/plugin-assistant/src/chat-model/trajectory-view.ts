//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import { Alarm, Legacy, TrajectoryCache, TrajectoryStore } from '@dxos/assistant';
import * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Annotation, type Database, type Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
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
  /** Lanes (light threads, and turns on main) in the order they opened. */
  readonly lanes: readonly Reducer.Lane[];
  /** The lane of each message that belongs to one, by message id. */
  readonly laneOf: ReadonlyMap<string, string>;
  /** Every fork of the chat, which main shows as a marker at the message it forks at. */
  readonly forks: readonly Reducer.Lane[];
};

export const EMPTY_VIEW: TrajectoryView = {
  messages: [],
  alarms: [],
  selfWakes: 0,
  discarded: [],
  lanes: [],
  laneOf: new Map(),
  forks: [],
};

/**
 * The view of one thread of the chat. Main (no `thread`) leaves out every fork, which never joins main on its own; a
 * fork shows main up to the message it forks at, then its own messages. Lanes are those of the selection.
 */
export const selectThread = (view: TrajectoryView, thread?: Trajectory.ThreadId): TrajectoryView => {
  const forks = new Set(view.lanes.filter((lane) => lane.kind === 'fork').map((lane) => lane.id));
  if (forks.size === 0 && thread === undefined) {
    return view;
  }
  const onMain = (message: Message.Message) => {
    const lane = view.laneOf.get(message.id);
    return lane === undefined || !forks.has(Trajectory.ThreadId.make(lane));
  };
  const fork = thread === undefined ? undefined : view.lanes.find((lane) => lane.id === thread);
  if (fork === undefined) {
    return {
      ...view,
      messages: view.messages.filter(onMain),
      lanes: view.lanes.filter((lane) => !forks.has(lane.id)),
    };
  }
  const forkPoint = view.messages.findIndex((message) => message.id === fork.from);
  return {
    ...view,
    messages: view.messages.filter(
      (message, index) => (onMain(message) && index <= forkPoint) || view.laneOf.get(message.id) === fork.id,
    ),
    lanes: view.lanes.filter((lane) => lane.id === fork.id),
  };
};

/** Where a view starts: checkpoints of both reducers taken at the same item, and that item's local cursor. */
export type ViewBase = {
  readonly thread: Reducer.Checkpoint<Reducer.ThreadView>;
  readonly session: Reducer.Checkpoint<Reducer.SessionState>;
  readonly cursor?: Feed.LocalCursor;
};

/** A view of an empty feed. */
export const EMPTY_BASE: ViewBase = {
  thread: Reducer.run(Reducer.thread, []),
  session: Reducer.run(Reducer.session, []),
};

/** Loads stop retrying to align the two checkpoints after this many, and the view starts from the whole feed. */
const ALIGN_ATTEMPTS = 3;

/**
 * Loads the view's checkpoints through `TrajectoryCache`, so the chat resumes from what the agent (or an earlier
 * view) on this device already folded. Writes can land between the two loads, so they are repeated until both stop at
 * the same item.
 */
export const loadViewBase = Effect.fnUntraced(function* (
  feed: Feed.Feed,
): Effect.fn.Return<ViewBase, never, Database.Service> {
  for (let attempt = 0; attempt < ALIGN_ATTEMPTS; attempt++) {
    const thread = yield* TrajectoryCache.loadAt(feed, Reducer.thread);
    const session = yield* TrajectoryCache.loadAt(feed, Reducer.session);
    if (thread.cursor === session.cursor) {
      return { thread: thread.checkpoint, session: session.checkpoint, cursor: thread.cursor };
    }
  }
  return EMPTY_BASE;
});

/** What a view folded: the checkpoints it started from, and every item after them it has folded since. */
type Fold = {
  readonly base: ViewBase;
  readonly items: readonly unknown[];
  readonly thread: Reducer.Checkpoint<Reducer.ThreadView>;
  readonly session: Reducer.Checkpoint<Reducer.SessionState>;
};

export type CachedViewProps = {
  /** The checkpoints the view starts from (see {@link loadViewBase}). */
  readonly load: () => Promise<ViewBase>;
  /** The feed's items after `cursor` in local order (all of them without one), live. */
  readonly follow: (cursor: Feed.LocalCursor | undefined) => Atom.Atom<readonly Obj.Unknown[]>;
};

/**
 * A {@link TrajectoryView} that starts from cached checkpoints and folds only the items after them, so opening a long
 * chat reads what is new since the device last folded it rather than the whole feed. Until the checkpoints load it is
 * empty. A legacy record after them (whose conversion needs the whole feed) loads them again.
 */
export const makeCachedTrajectoryView = ({ load, follow }: CachedViewProps): Atom.Atom<TrajectoryView> => {
  const base = Atom.make((get): Loaded | undefined => {
    let open = true;
    get.addFinalizer(() => {
      open = false;
    });
    void load().then(
      (loaded) => open && get.setSelf({ base: loaded, tail: follow(loaded.cursor) }),
      (error) => log.catch(error),
    );
    // A reload keeps showing what the view had until the new checkpoints arrive.
    return Option.getOrUndefined(get.self<Loaded>());
  });
  return viewOf((get) => {
    const current = get(base);
    if (current === undefined) {
      return undefined;
    }
    const tail = get(current.tail);
    if (tail.some(Legacy.isRecord)) {
      get.refresh(base);
    }
    return { base: current.base, items: tail.filter(isEvent) };
  });
};

/**
 * Folds the feed's items (read in local order) into a {@link TrajectoryView} from the start, with no cache. Local
 * order only ever grows at the end, so each update folds just the new items; a change anywhere else (a legacy record,
 * which converts with the whole feed in view) refolds everything.
 */
export const makeTrajectoryView = (items: Atom.Atom<readonly Obj.Unknown[]>): Atom.Atom<TrajectoryView> =>
  viewOf((get) => ({ base: EMPTY_BASE, items: get(items).filter(isItem) }));

type Loaded = { readonly base: ViewBase; readonly tail: Atom.Atom<readonly Obj.Unknown[]> };

type Source = { readonly base: ViewBase; readonly items: readonly (Trajectory.Event | Legacy.Record)[] };

const viewOf = (source: (get: Atom.AtomContext) => Source | undefined): Atom.Atom<TrajectoryView> => {
  let last: Fold | undefined;
  const views = new Map<string, Message.Message>();
  const alarmViews = new Map<string, Alarm.Alarm>();
  return Atom.make((get) => {
    const next = source(get);
    if (next === undefined) {
      return EMPTY_VIEW;
    }
    last = fold(next, last);
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
      selfWakes: last.session.state.selfWakes,
      lanes: last.thread.state.lanes,
      forks: last.thread.state.lanes.filter((lane) => lane.kind === 'fork'),
      laneOf: new Map(last.thread.state.items.flatMap((item) => (item.lane ? [[item.id, item.lane]] : []))),
    };
  });
};

const fold = ({ base, items }: Source, previous: Fold | undefined): Fold => {
  const resumable =
    previous !== undefined &&
    previous.base === base &&
    items.length >= previous.items.length &&
    previous.items.every((item, index) => items[index] === item) &&
    !items.slice(previous.items.length).some(Legacy.isRecord);
  const tail = Legacy.toEvents(resumable ? items.slice(previous.items.length) : items);
  return {
    base,
    items,
    thread: Reducer.run(Reducer.thread, tail, resumable ? previous.thread : base.thread),
    session: Reducer.run(Reducer.session, tail, resumable ? previous.session : base.session),
  };
};

const isEvent = (item: Obj.Unknown): item is Trajectory.Event => Obj.instanceOf(Trajectory.Event, item);

const isItem = (item: Obj.Unknown): item is Trajectory.Event | Legacy.Record => Legacy.isRecord(item) || isEvent(item);

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
