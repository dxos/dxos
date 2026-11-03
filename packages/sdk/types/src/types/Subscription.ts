//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';

/** What a subscriber hears about. */
export const Kind = Schema.Literals(['comments']);
export type Kind = Schema.Schema.Type<typeof Kind>;

/**
 * One subscriber's entry. `kinds` holds explicit choices only: a kind it does not name is on, and
 * `false` is an unsubscribe that outlives the subscriber's next comment.
 */
export const Entry = Schema.Struct({
  /** ISO time the subscriber was added. */
  since: Schema.String,
  kinds: Schema.optional(Schema.Struct({ comments: Schema.optional(Schema.Boolean) })),
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}

/** Subscribers keyed by identity DID. */
export const Subscribers = Schema.Record(Schema.String, Entry);
export type Subscribers = Schema.Schema.Type<typeof Subscribers>;

/**
 * The people who hear about activity on an object, stored on the object itself so no object is created
 * per subscriber and deleting the object deletes them. Written only through the helpers below, which
 * change one key at a time so concurrent subscribers merge.
 */
export const Subscription: Annotation.Annotation<Subscribers> = Annotation.make({
  id: 'org.dxos.annotation.subscription',
  schema: Subscribers,
});

/** Whether an entry (possibly absent) receives `kind`. */
export const isSubscribed = (entry: Entry | undefined, kind: Kind): boolean =>
  entry !== undefined && entry.kinds?.[kind] !== false;

/** The DIDs that receive `kind` for an object. */
export const getSubscribers = (obj: Obj.Unknown, kind: Kind): string[] =>
  Annotation.get(obj, Subscription).pipe(
    Option.map((subscribers) =>
      Object.entries(subscribers).flatMap(([did, entry]) => (isSubscribed(entry, kind) ? [did] : [])),
    ),
    Option.getOrElse(() => []),
  );

/** Adds a subscriber with every kind on; leaves an existing entry, including an unsubscribe, as it is. */
export const add = (obj: Obj.Unknown, did: string): void => {
  const subscribers = Annotation.get(obj, Subscription);
  if (Option.isSome(subscribers) && subscribers.value[did]) {
    return;
  }

  write(obj, did, { since: new Date().toISOString() });
};

/** Records an explicit choice for one kind, adding the subscriber if needed. */
export const set = (obj: Obj.Unknown, did: string, kind: Kind, subscribed: boolean): void => {
  const subscribers = Annotation.get(obj, Subscription);
  const entry = Option.isSome(subscribers) ? subscribers.value[did] : undefined;
  if (!entry) {
    write(obj, did, { since: new Date().toISOString(), kinds: { [kind]: subscribed } });
  } else if (entry.kinds?.[kind] !== subscribed) {
    Annotation.update(obj, Subscription, (subscribers) => {
      const entry = subscribers[did];
      if (entry.kinds) {
        entry.kinds[kind] = subscribed;
      } else {
        entry.kinds = { [kind]: subscribed };
      }
    });
  }
};

/** Adds one entry; `Annotation.set` only for the first, since it replaces the whole map. */
const write = (obj: Obj.Unknown, did: string, entry: Entry): void => {
  if (Option.isSome(Annotation.get(obj, Subscription))) {
    Annotation.update(obj, Subscription, (subscribers) => {
      subscribers[did] = entry;
    });
  } else {
    Obj.update(obj, (obj) => {
      Annotation.set(obj, Subscription, { [did]: entry });
    });
  }
};
