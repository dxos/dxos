//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
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
    /** Ids of read messages still in the feed. */
    readIds: Schema.Array(Schema.String).pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--envelope--regular', hue: 'amber' })),
) {}

/** Checks if a value is a Notifications object. */
export const instanceOf = (value: unknown): value is Notifications => Obj.instanceOf(Notifications, value);

/** Creates a notifications container with a backing feed. */
export const make = (): Notifications => Obj.make(Notifications, { feed: Ref.make(Feed.make()), readIds: [] });

/**
 * Picks the container to use when devices raced to create one: the lowest id, so every device agrees.
 */
export const select = <T extends { id: string }>(candidates: readonly T[]): T | undefined =>
  candidates.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];

/** Finds the database's notifications container, creating it on first use. */
export const getOrCreate: Effect.Effect<Notifications, never, Database.Service> = Effect.gen(function* () {
  const existing = select(yield* Database.query(Filter.type(Notifications)).run);
  return existing ?? (yield* Database.add(make()));
});

/** Query for the messages stored in a notifications feed. */
export const messagesQuery = (feed: Feed.Feed) =>
  Query.select(Filter.type(Message.Message)).from(Scope.feed(Obj.getURI(feed, { prefer: 'absolute' })));

/** Matches the stored copy of an inbox envelope, if any device has written one; run it against the feed. */
export const envelopeFilter = (envelopeId: string) =>
  Filter.foreignKeys(Message.Message, [{ source: INBOX_KEY_SOURCE, id: envelopeId }]);

/** Counts messages not yet read. */
export const countUnread = (messages: readonly { id: string }[], readIds: readonly string[]): number => {
  const read = new Set(readIds);
  return messages.filter((message) => !read.has(message.id)).length;
};

/** Marks messages read; idempotent. */
export const markRead = (notifications: Notifications, ids: readonly string[]): void => {
  const missing = ids.filter((id) => !notifications.readIds.includes(id));
  if (missing.length === 0) {
    return;
  }

  Obj.update(notifications, (notifications) => {
    notifications.readIds.push(...missing);
  });
};

/** Marks a message unread; idempotent. */
export const markUnread = (notifications: Notifications, id: string): void => {
  if (!notifications.readIds.includes(id)) {
    return;
  }

  Obj.update(notifications, (notifications) => {
    notifications.readIds = notifications.readIds.filter((readId) => readId !== id);
  });
};

/** Removes messages from the feed together with their read state. */
export const remove = Effect.fn('Notifications.remove')(function* (
  notifications: Notifications,
  messages: readonly Message.Message[],
) {
  const feed = yield* Database.load(notifications.feed);
  yield* Feed.remove(feed, [...messages]);
  const ids = new Set(messages.map((message) => message.id));
  Obj.update(notifications, (notifications) => {
    notifications.readIds = notifications.readIds.filter((id) => !ids.has(id));
  });
});
