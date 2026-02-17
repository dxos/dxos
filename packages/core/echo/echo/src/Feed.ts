//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { DXN } from '@dxos/keys';

import * as Entity from './Entity';
import * as Err from './Err';
import * as Obj from './Obj';
import * as Type from './Type';

//
// Types
//

/**
 * Meta key source for storing the backing DXN bound to a feed object.
 */
export const DXN_KEY = 'dxos.org/key/feed';

/**
 * A Feed echo object instance.
 */
export type Feed = Obj.Obj<Type.Feed>;

/**
 * Opaque cursor for iterating over feed items.
 * Generic parameter `T` is the expected item type.
 */
export interface Cursor<T = Obj.Snapshot> {
  /** Internal: the feed's backing DXN. */
  readonly _feedDxn: DXN;
  /** Internal: cached items loaded from the feed. */
  _items: T[] | null;
  /** Internal: current position in the items array. */
  _position: number;
}

/**
 * Retention options for a feed.
 */
export interface RetentionOptions {
  /** Maximum number of items to retain. */
  count?: number;
}

//
// Factory
//

/**
 * Creates a new feed object.
 *
 * @example
 * ```ts
 * const feed = Feed.make({ name: 'notifications', kind: 'dxos.org/plugin/notifications/v1' });
 * ```
 */
export const make = (props: Obj.MakeProps<typeof Type.Feed>): Feed => Obj.make(Type.Feed, props);

//
// Service
//

/**
 * Effect service for feed operations.
 * Provides the bridge to the underlying storage implementation.
 * Must be provided by the application layer (e.g., echo-db).
 */
export class Service extends Context.Tag('@dxos/echo/Feed/Service')<
  Service,
  {
    /**
     * Ensures backing storage exists for the feed, creating it if needed.
     * Stores the DXN as a meta key on the feed object.
     * @returns The backing DXN.
     */
    ensureBacking(feed: Feed): DXN;

    /**
     * Appends items to a feed.
     */
    append(feedDxn: DXN, items: Entity.Unknown[]): Promise<void>;

    /**
     * Removes items from a feed by ID.
     */
    remove(feedDxn: DXN, ids: string[]): Promise<void>;

    /**
     * Loads all items from a feed.
     */
    loadItems(feedDxn: DXN): Promise<Obj.Snapshot[]>;
  }
>() {}

//
// Helpers
//

/**
 * Resolves the backing DXN from a feed object's meta key.
 */
const getDxn = (feed: Feed | Obj.Snapshot): DXN | undefined => {
  const keys = Entity.getKeys(feed as Entity.Unknown, DXN_KEY);
  if (keys.length === 0) {
    return undefined;
  }
  return DXN.parse(keys[0].id);
};

/**
 * Resolves or creates the backing DXN for a feed.
 */
const resolveDxn = (feed: Feed, service: Context.Tag.Service<Service>): DXN => {
  return getDxn(feed) ?? service.ensureBacking(feed);
};

//
// Operations
//

/**
 * Appends items to a feed.
 *
 * @example
 * ```ts
 * yield* Feed.append(feed, [Obj.make(Notification, { title: 'Hello' })]);
 * ```
 */
export const append = (feed: Feed, items: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Effect.gen(function* () {
    const service = yield* Service;
    const feedDxn = resolveDxn(feed, service);
    yield* Effect.promise(() => service.append(feedDxn, items));
  });

/**
 * Creates a cursor for iterating over feed items.
 * The cursor loads all items on first use and iterates locally.
 * Pass a type parameter for typed iteration.
 *
 * @example
 * ```ts
 * const cursor = yield* Feed.cursor<Person>(feed);
 * const item = yield* Feed.next(cursor); // typed as Person
 * ```
 */
// TODO(wittjosiah): Should cursor accept a schema and validate items instead of just casting?
export const cursor = <T = Obj.Snapshot>(feed: Feed): Effect.Effect<Cursor<T>, never, Service> =>
  Effect.gen(function* () {
    const service = yield* Service;
    const feedDxn = resolveDxn(feed, service);
    return { _feedDxn: feedDxn, _items: null, _position: 0 } as Cursor<T>;
  });

/**
 * Returns the next item from a feed cursor.
 * Items are returned as immutable snapshots.
 * Fails with `CursorExhaustedError` when the cursor has no more items.
 *
 * @example
 * ```ts
 * const cursor = yield* Feed.cursor(feed);
 * const item = yield* Feed.next(cursor);
 * ```
 */
export const next = <T = Obj.Snapshot>(feedCursor: Cursor<T>): Effect.Effect<T, Err.CursorExhaustedError, Service> =>
  Effect.gen(function* () {
    const result = yield* nextOption(feedCursor);
    if (Option.isNone(result)) {
      return yield* Effect.fail(new Err.CursorExhaustedError());
    }
    return result.value;
  });

/**
 * Returns the next item from a feed cursor as an Option.
 * Items are returned as immutable snapshots.
 * Returns `Option.none()` when the cursor is exhausted.
 *
 * @example
 * ```ts
 * const cursor = yield* Feed.cursor(feed);
 * const item = yield* Feed.nextOption(cursor);
 * if (Option.isSome(item)) {
 *   console.log(item.value);
 * }
 * ```
 */
export const nextOption = <T = Obj.Snapshot>(feedCursor: Cursor<T>): Effect.Effect<Option.Option<T>, never, Service> =>
  Effect.gen(function* () {
    if (feedCursor._items === null) {
      const service = yield* Service;
      feedCursor._items = (yield* Effect.promise(() => service.loadItems(feedCursor._feedDxn))) as T[];
    }

    if (feedCursor._position >= feedCursor._items.length) {
      return Option.none();
    }

    return Option.some(feedCursor._items[feedCursor._position++]);
  });

/**
 * Removes items from a feed.
 *
 * @example
 * ```ts
 * yield* Feed.remove(feed, [item]);
 * ```
 */
export const remove = (feed: Feed, items: (Entity.Unknown | Obj.Snapshot)[]): Effect.Effect<void, never, Service> =>
  Effect.gen(function* () {
    const service = yield* Service;
    const feedDxn = resolveDxn(feed, service);
    const ids = items.map((item) => item.id);
    yield* Effect.promise(() => service.remove(feedDxn, ids));
  });

/**
 * Sets the local retention policy for a feed.
 * Currently stubbed — queues do not yet support retention.
 *
 * @example
 * ```ts
 * yield* Feed.setRetention(feed, { count: 1000 });
 * ```
 */
// TODO(feed): Implement when queue retention is supported.
export const setRetention = (_feed: Feed, _options: RetentionOptions): Effect.Effect<void, never, Service> =>
  Effect.void;
