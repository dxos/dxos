//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/sql/SqlClient';

import { Fact, MemoryError, MemoryService } from '@dxos/echo-memory';
import { type FeedStore } from '@dxos/feed';
import { FeedProtocol } from '@dxos/protocols';

/** A write to the knowledge base, as recorded in the log; replaying the entries in order rebuilds the store. */
export const Entry = Schema.Union([
  Schema.TaggedStruct('put', {
    facts: Schema.Array(Fact.Fact),
    read: Schema.optional(MemoryService.ReadCursor),
    /** Speakers whose facts wake nothing on their own, on every replica that applies the entry. */
    quiet: Schema.optional(Schema.Array(Fact.EntityKey)),
  }),
  Schema.TaggedStruct('reset', {}),
]);
export type Entry = Schema.Schema.Type<typeof Entry>;

/** Entries after a cursor, and the cursor to read on from. */
export type Page = {
  readonly entries: readonly Entry[];
  /** Pass to the next {@link FactLog.read}; undefined only when the log is empty. */
  readonly next: string | undefined;
};

/**
 * The durable, replicated record of a space's knowledge-base writes. A memory appends to it first and applies what it
 * reads back, so its store is a cache of the log that can be rebuilt from it.
 */
export interface FactLog {
  readonly append: (entry: Entry) => Effect.Effect<void, MemoryError.MemoryError>;
  /** The entries after `cursor` (all of them when it is undefined), in log order. */
  readonly read: (cursor: string | undefined) => Effect.Effect<Page, MemoryError.MemoryError>;
  /**
   * Calls `onChange` whenever entries may have been added, including by replication, until the scope closes. The
   * listener is registered before this returns, so a reader that listens and then reads misses nothing.
   */
  readonly listen: (onChange: () => void) => Effect.Effect<void, never, Scope.Scope>;
}

const encodeEntry = Schema.encodeSync(Entry);
const decodeEntry = Schema.decodeUnknownSync(Entry);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Serializes an entry as a block payload. */
export const toBytes = (entry: Entry): Uint8Array => textEncoder.encode(JSON.stringify(encodeEntry(entry)));

/** Inverse of {@link toBytes}. */
export const fromBytes = (data: Uint8Array): Entry => decodeEntry(JSON.parse(textDecoder.decode(data)));

/** A log held in process memory, for tests and hosts that need no durability. */
export const memory = (): FactLog => {
  const entries: Entry[] = [];
  const listeners = new Set<() => void>();
  return {
    append: (entry) =>
      Effect.sync(() => {
        entries.push(entry);
        listeners.forEach((listener) => listener());
      }),
    read: (cursor) =>
      Effect.sync(() => {
        const start = cursor === undefined ? 0 : Number(cursor);
        return {
          entries: entries.slice(start),
          next: entries.length === 0 ? undefined : String(entries.length),
        };
      }),
    listen: (onChange) =>
      Effect.acquireRelease(
        Effect.sync(() => listeners.add(onChange)),
        () => Effect.sync(() => listeners.delete(onChange)),
      ),
  };
};

/** The feed namespace a space's fact log is kept in. */
export const NAMESPACE = FeedProtocol.WellKnownNamespaces.facts;

/** Most blocks one {@link FactLog.read} pulls from the feed per query. */
const PAGE_SIZE = 500;

export type FeedOptions = {
  readonly feeds: FeedStore;
  readonly spaceId: FeedProtocol.QueryRequest['spaceId'];
  /** The space's fact feed. */
  readonly feedId: string;
};

/**
 * A log over a feed in the `facts` namespace of the space's feed store, which replicates it like any other feed. The
 * cursor is the feed's own query cursor.
 */
export const feed = ({ feeds, spaceId, feedId }: FeedOptions): Effect.Effect<FactLog, never, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const services = yield* Effect.context<SqlClient.SqlClient>();
    const fail = MemoryError.MemoryError.wrap({ message: 'Failed to access the fact feed' });

    const read = (cursor: string | undefined): Effect.Effect<Page, MemoryError.MemoryError> =>
      Effect.gen(function* () {
        const entries: Entry[] = [];
        let next = cursor === undefined ? undefined : FeedProtocol.FeedCursor.make(cursor);
        while (true) {
          const page = yield* feeds.query({
            spaceId,
            feedNamespace: NAMESPACE,
            query: { feedIds: [feedId] },
            cursor: next,
            limit: PAGE_SIZE,
          });
          entries.push(...page.blocks.map(({ data }) => fromBytes(data)));
          next = page.nextCursor;
          if (!page.hasMore) {
            return { entries, next };
          }
        }
      }).pipe(Effect.mapError(fail), Effect.provide(services));

    return {
      append: (entry) =>
        feeds
          .appendLocal([{ spaceId, feedId, feedNamespace: NAMESPACE, data: toBytes(entry) }])
          .pipe(Effect.asVoid, Effect.mapError(fail), Effect.provide(services)),
      read,
      listen: (onChange) =>
        Effect.acquireRelease(
          Effect.sync(() =>
            feeds.onNewBlocks.on((event) => {
              if (event.spaceId === spaceId && (event.feedNamespace ?? NAMESPACE) === NAMESPACE) {
                onChange();
              }
            }),
          ),
          (unsubscribe) => Effect.sync(() => unsubscribe()),
        ),
    };
  });
