//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, type Entity, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';

/**
 * Identifies a schema as an object that owns a canonical feed, naming the property that holds the
 * `Ref<Feed>`. Carrying the property name (rather than a bare `true`) is what lets a generic host
 * resolve the feed without hardcoding `.feed` — see {@link getFeedRef}.
 */
export const FeedAnnotation = Annotation.make({
  id: 'org.dxos.annotation.feed',
  schema: Schema.Struct({
    /** Name of the property holding the canonical `Ref<Feed>`. */
    property: Schema.String,
  }),
});

/** @returns True if the schema is annotated as a feed owner. */
export const isFeedOwnerSchema = (schema: Type.AnyEntity): boolean =>
  Option.isSome(FeedAnnotation.get(Type.getSchema(schema)));

/**
 * The canonical feed reference of a feed-owning object, resolved through the property named by
 * {@link FeedAnnotation}. Undefined when the object's schema is unannotated or the property is empty.
 */
export const getFeedRef = (obj: Obj.Unknown): Ref.Unknown | undefined => {
  const type = Obj.getType(obj);
  if (!type) {
    return undefined;
  }

  const annotation = FeedAnnotation.get(Type.getSchema(type));
  if (Option.isNone(annotation)) {
    return undefined;
  }

  const candidate: unknown = Obj.getValue(obj, [annotation.value.property]);
  return Ref.isRef(candidate) ? candidate : undefined;
};

/**
 * Set on a feed to the cursor of the newest item a member's open view has shown. One value for the space, so a
 * feed one member has read is read for everyone. Absent until a view first opens the feed; see {@link trackSeen}.
 */
export const SeenAnnotation = Annotation.make({
  id: 'org.dxos.annotation.feed-seen',
  schema: Feed.Cursor,
});

/** The feed's seen cursor; `undefined` while no view has opened it, which reports nothing as unseen. */
export const getSeen = (feed: Feed.Feed | Obj.Snapshot<Feed.Feed>): Feed.Cursor | undefined =>
  Option.getOrUndefined(Annotation.get(feed, SeenAnnotation));

/** Starts tracking a feed nobody has viewed yet, from its start; a no-op once it has a seen cursor. */
export const trackSeen = (feed: Feed.Feed): void => {
  if (getSeen(feed) === undefined) {
    Obj.update(feed, (feed) => Annotation.set(feed, SeenAnnotation, Feed.START));
  }
};

/** The feed's positioned items after `seen`, on every branch, in append order. */
export const unseenQuery = (feed: Feed.Feed, seen: Feed.Cursor) =>
  Query.select(Filter.feedCursor({ begin: seen })).from(
    Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }).toString(), { branches: 'all' }),
  );

/**
 * Moves the seen cursor to an item {@link unseenQuery} returned. That item is after the stored cursor, so the cursor
 * only moves forward; concurrent writers can still merge it back, which shows as unread until a view catches up.
 */
export const markSeen = (feed: Feed.Feed, item: Entity.Unknown): void => {
  const cursor = Feed.getCursor(item);
  if (cursor !== undefined && cursor !== getSeen(feed)) {
    Obj.update(feed, (feed) => Annotation.set(feed, SeenAnnotation, cursor));
  }
};
