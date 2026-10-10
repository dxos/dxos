//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { Message } from '@dxos/types';

/**
 * Foreign-key source under which a stored message records the inbox envelope id it came from, so
 * every device that materializes the same envelope finds the copy another device already wrote.
 */
export const INBOX_KEY_SOURCE = 'org.dxos.inbox';

/**
 * The user's cross-space notifications: messages relayed through the HALO inbox, plus which of them
 * have been read. Not a user type, so it stays out of the navtree; one lives in the default space.
 */
export class Notifications extends Type.makeObject<Notifications>(DXN.make('org.dxos.type.notifications', '0.1.0'))(
  Schema.Struct({
    /** Messages in arrival order; feed items are immutable, which is why read state lives below. */
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(), FormInputAnnotation.set(false)),
    /**
     * Keys (see {@link messageKey}) of read messages; keys rather than ids, so read state holds for
     * every copy of a message that concurrent devices wrote.
     */
    readKeys: Schema.Array(Schema.String).pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--envelope--regular', hue: 'amber' })),
) {}

/** Checks if a value is a Notifications object. */
export const instanceOf = (value: unknown): value is Notifications => Obj.instanceOf(Notifications, value);

/** Creates a notifications container with a backing feed. */
export const make = (): Notifications => Obj.make(Notifications, { feed: Ref.make(Feed.make()), readKeys: [] });

/**
 * Orders containers so every device agrees on the one to keep: devices online when the first message
 * arrives each create one, and replication then leaves several; the lowest id wins.
 */
export const order = <T extends { id: string }>(candidates: readonly T[]): T[] =>
  candidates.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Picks the container every device writes to: the lowest id. */
export const select = <T extends { id: string }>(candidates: readonly T[]): T | undefined => order(candidates)[0];

/** All live containers, the one to keep first; more than one only until {@link converge} runs. */
export const getAll: Effect.Effect<Notifications[], never, Database.Service> = Database.query(
  Filter.type(Notifications),
).run.pipe(Effect.map(order));

/** Finds the database's notifications container, creating it on first use. */
export const getOrCreate: Effect.Effect<Notifications, never, Database.Service> = Effect.gen(function* () {
  const existing = select(yield* getAll);
  return existing ?? (yield* Database.add(make()));
});

const feedScopes = (feeds: readonly Feed.Feed[]) =>
  feeds.map((feed) => Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })));

/** Query for the messages stored across notifications feeds. */
export const messagesQuery = (feeds: readonly Feed.Feed[]) =>
  feeds.length === 0
    ? Query.select(Filter.nothing())
    : Query.select(Filter.type(Message.Message)).from(...feedScopes(feeds));

/** Matches the stored copy of an inbox envelope, if any device has written one. */
export const envelopeFilter = (envelopeId: string) =>
  Filter.foreignKeys(Message.Message, [{ source: INBOX_KEY_SOURCE, id: envelopeId }]);

/** Query for the stored copies of an inbox envelope across notifications feeds. */
export const envelopeQuery = (envelopeId: string, feeds: readonly Feed.Feed[]) =>
  feeds.length === 0
    ? Query.select(Filter.nothing())
    : Query.select(envelopeFilter(envelopeId)).from(...feedScopes(feeds));

/** Identifies a message across copies in different feeds: its inbox envelope id, else its own id. */
export const messageKey = (message: Message.Message): string =>
  Obj.getMeta(message).keys.find((key) => key.source === INBOX_KEY_SOURCE)?.id ?? message.id;

/** The read keys of every container, since a message may be marked read in any of them before they converge. */
export const readKeys = (containers: readonly { readKeys: readonly string[] }[]): string[] => [
  ...new Set(containers.flatMap((container) => container.readKeys)),
];

/**
 * Collapses copies of one message (two devices wrote or converged it concurrently) to the lowest id,
 * and resolves which of the remaining messages are read.
 */
export const view = (
  messages: readonly Message.Message[],
  readKeys: readonly string[],
): { messages: Message.Message[]; read: ReadonlySet<string> } => {
  const readSet = new Set(readKeys);
  const byKey = new Map<string, Message.Message>();
  for (const message of order(messages)) {
    const key = messageKey(message);
    if (!byKey.has(key)) {
      byKey.set(key, message);
    }
  }

  return {
    messages: [...byKey.values()],
    read: new Set([...byKey].flatMap(([key, message]) => (readSet.has(key) ? [message.id] : []))),
  };
};

export type View = ReturnType<typeof view>;

/**
 * Derives the {@link view} of every container's messages and read state, subscribing through `get`;
 * containers are read together because more than one exists until they converge.
 */
export const deriveView = (get: Atom.AtomContext, containers: readonly Notifications[]): View => {
  const feeds = containers.flatMap((container) => {
    const feed = get(container.feed.atom);
    return feed ? [feed] : [];
  });
  const db = containers[0] && Obj.getDatabase(containers[0]);
  const messages = db && feeds.length > 0 ? get(db.query(messagesQuery(feeds)).atom) : [];
  return view(messages, readKeys(containers.map((container) => get(Obj.atom(container)))));
};

/** Counts messages not yet read. */
export const countUnread = ({ messages, read }: View): number =>
  messages.filter((message) => !read.has(message.id)).length;

/** Appends keys to a container's read state; appends, unlike a replaced array, merge with concurrent writes. */
const addReadKeys = (container: Notifications, keys: Iterable<string>): void => {
  const existing = new Set(container.readKeys);
  const missing = [...new Set(keys)].filter((key) => !existing.has(key));
  if (missing.length > 0) {
    Obj.update(container, (container) => {
      container.readKeys.push(...missing);
    });
  }
};

/** Removes keys from every container's read state. */
const removeReadKeys = (containers: readonly Notifications[], keys: ReadonlySet<string>): void => {
  for (const container of containers) {
    if (container.readKeys.some((key) => keys.has(key))) {
      Obj.update(container, (container) => {
        container.readKeys = container.readKeys.filter((key) => !keys.has(key));
      });
    }
  }
};

/** Marks messages read in the container every device writes to; idempotent. */
export const markRead = (containers: readonly Notifications[], messages: readonly Message.Message[]): void => {
  const target = select(containers);
  const read = new Set(readKeys(containers));
  if (target) {
    addReadKeys(
      target,
      messages.map(messageKey).filter((key) => !read.has(key)),
    );
  }
};

/** Marks messages unread in every container that records them read; idempotent. */
export const markUnread = (containers: readonly Notifications[], messages: readonly Message.Message[]): void =>
  removeReadKeys(containers, new Set(messages.map(messageKey)));

/** Removes messages, and every copy of them, from whichever feeds hold them, together with their read state. */
export const remove = Effect.fn('Notifications.remove')(function* (
  containers: readonly Notifications[],
  messages: readonly Message.Message[],
) {
  const keys = new Set(messages.map(messageKey));
  for (const container of containers) {
    const feed = yield* Database.load(container.feed);
    const stored = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const removed = stored.filter((message) => keys.has(messageKey(message)));
    if (removed.length > 0) {
      yield* Feed.remove(feed, removed);
    }
  }
  removeReadKeys(containers, keys);
});

/** Feed bookkeeping a copy must not inherit, since it is positioned afresh in the target feed. */
const FEED_KEY_SOURCES = new Set([Feed.POSITION_KEY, Feed.PARENT_KEY]);

const copyMessage = (message: Message.Message): Message.Message => {
  const { id: _id, ...data } = message;
  return Obj.make(Message.Message, {
    ...data,
    [Obj.Meta]: { keys: Obj.getMeta(message).keys.filter((key) => !FEED_KEY_SOURCES.has(key.source)) },
  });
};

/**
 * Folds every other container into the one {@link select} picks: moves their messages into its feed
 * (skipping any it already holds, by {@link messageKey}), merges their read keys, and deletes them; also
 * drops a second copy of a message in its own feed.
 *
 * Safe to run on several devices at once: a copy another device already made is skipped, and a
 * concurrent duplicate is collapsed by {@link view}. Deleted containers are scanned too, since a device
 * that had not yet seen the winner may still have written to one after another device deleted it.
 */
export const converge = Effect.fn('Notifications.converge')(function* () {
  const all = order(
    yield* Database.query(Query.select(Filter.type(Notifications)).options({ deleted: 'include' })).run,
  );
  const target = all.find((container) => !Obj.isDeleted(container));
  if (!target) {
    return undefined;
  }

  const targetFeed = yield* Database.load(target.feed);
  const present = new Set<string>();
  const duplicates: Message.Message[] = [];
  for (const message of order(yield* Feed.query(targetFeed, Filter.type(Message.Message)).run)) {
    const key = messageKey(message);
    if (present.has(key)) {
      duplicates.push(message);
    } else {
      present.add(key);
    }
  }
  if (duplicates.length > 0) {
    yield* Feed.remove(targetFeed, duplicates);
  }

  for (const other of all.filter((container) => container !== target)) {
    const feed = yield* Database.load(other.feed, { deleted: 'include' });
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const copies = messages.filter((message) => !present.has(messageKey(message))).map(copyMessage);
    copies.forEach((copy) => present.add(messageKey(copy)));
    if (copies.length > 0) {
      yield* Feed.append(targetFeed, copies);
    }
    // Moved, not copied: a message deleted from the target later must not be restored from here.
    if (messages.length > 0) {
      yield* Feed.remove(feed, messages);
    }
    // A deleted container's read keys were merged by whoever deleted it; merging them again would undo a
    // later mark-unread.
    if (!Obj.isDeleted(other)) {
      addReadKeys(target, other.readKeys);
      yield* Database.remove(other);
    }
  }

  yield* Database.flush();
  return target;
});
