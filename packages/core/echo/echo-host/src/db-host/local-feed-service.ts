//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as EffectStream from 'effect/Stream';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { type ObjectJSON } from '@dxos/echo/internal';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { type FeedStore } from '@dxos/feed';
import { assertArgument, invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';
import type { SqlTransaction } from '@dxos/sql-sqlite';

/**
 * Writes feed data to a local FeedStore.
 */
export class LocalFeedServiceImpl implements FeedService.Handlers {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  #feedStore: FeedStore;
  #syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;
  #getSyncState?: (ctx: Context, request: FeedService.GetSyncStateRequest) => Promise<FeedService.GetSyncStateResponse>;

  'constructor'(
    runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>,
    feedStore: FeedStore,
    options?: {
      syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;
      getSyncState?: (
        ctx: Context,
        request: FeedService.GetSyncStateRequest,
      ) => Promise<FeedService.GetSyncStateResponse>;
    },
  ) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
    this.#syncFeed = options?.syncFeed;
    this.#getSyncState = options?.getSyncState;
  }

  ['FeedService.queryFeed'](request: FeedService.QueryFeedRequest): Effect.Effect<FeedService.FeedQueryResult, Error> {
    return Effect.tryPromise({
      try: () => this.#queryFeedImpl(request),
      catch: (error) => error as Error,
    });
  }

  /**
   * Pushes a fresh query snapshot on subscribe, then again whenever {@link FeedStore.onNewBlocks}
   * fires and the recomputed snapshot actually differs from the last one sent -- replacing the
   * client's previous poll loop with a real subscription. Unlike `subscribeSyncState`'s small
   * aggregate payload, this recomputation re-fetches the feed's full object set on every signal, so
   * suppressing unchanged snapshots server-side (rather than leaving dedup to the client) matters
   * more here.
   */
  ['FeedService.subscribeFeed'](
    request: FeedService.QueryFeedRequest,
  ): EffectStream.Stream<FeedService.FeedQueryResult, Error> {
    return this.#recomputeOnNewBlocks(() => this.#queryFeedImpl(request), feedQueryResultChanged);
  }

  async #queryFeedImpl(request: FeedService.QueryFeedRequest): Promise<FeedService.FeedQueryResult> {
    const { query } = request;
    invariant(query, 'query is required');
    const { spaceId, feedIds } = query;
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen({ self: this }, function* () {
        const result = yield* this.#feedStore.query({
          requestId: crypto.randomUUID(),
          feedNamespace: request.query.feedNamespace || FeedProtocol.WellKnownNamespaces.data,
          spaceId: spaceId! as SpaceId,
          query: { feedIds: feedIds ?? [] },
          cursor: query.after ? FeedProtocol.FeedCursor.make(query.after) : undefined,
          limit: query.limit,
        });

        const objects = result.blocks.map((block: FeedProtocol.Block) =>
          JSON.stringify(EchoFeedCodec.decode(block.data, block.position ?? undefined) as ObjectJSON),
        );

        return Function.identity<FeedService.FeedQueryResult>({
          objects,
          nextCursor: result.nextCursor,
          prevCursor: '',
        });
      }),
    );
  }

  ['FeedService.insertIntoFeed'](request: FeedService.InsertIntoFeedRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const { subspaceTag, spaceId, feedId, objects } = request;
        const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
        assertArgument(
          FeedProtocol.isWellKnownNamespace(feedNamespace),
          'request.subspaceTag',
          'expected a well-known feed namespace',
        );
        await RuntimeProvider.runPromise(this.#runtime)(
          Effect.gen({ self: this }, function* () {
            const messages = (objects ?? []).map((encoded) => ({
              spaceId: spaceId,
              feedId: feedId!,
              feedNamespace,
              data: EchoFeedCodec.encode(JSON.parse(encoded) as ObjectJSON),
            }));

            yield* this.#feedStore.appendLocal(messages);
          }),
        );
      },
      catch: (error) => error as Error,
    });
  }

  ['FeedService.deleteFromFeed'](request: FeedService.DeleteFromFeedRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const { subspaceTag, spaceId, feedId, objectIds } = request;
        const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
        assertArgument(
          FeedProtocol.isWellKnownNamespace(feedNamespace),
          'request.subspaceTag',
          'expected a well-known feed namespace',
        );
        await RuntimeProvider.runPromise(this.#runtime)(
          Effect.gen({ self: this }, function* () {
            const messages = objectIds!.map((id) => ({
              spaceId: spaceId,
              feedId: feedId!,
              feedNamespace,
              data: EchoFeedCodec.encode({ id, '@deleted': true }),
            }));

            yield* this.#feedStore.appendLocal(messages);
          }),
        );
      },
      catch: (error) => error as Error,
    });
  }

  ['FeedService.syncFeed'](request: FeedService.SyncFeedRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.#syncFeed?.(Context.default(), request);
      },
      catch: (error) => error as Error,
    });
  }

  ['FeedService.getSyncState'](
    request: FeedService.GetSyncStateRequest,
  ): Effect.Effect<FeedService.GetSyncStateResponse, Error> {
    return Effect.tryPromise({
      try: () => this.#getSyncStateImpl(request),
      catch: (error) => error as Error,
    });
  }

  /**
   * `onNewBlocks` is unscoped (fires for any space's writes), so every active subscription
   * recomputes on each signal regardless of relevance.
   */
  ['FeedService.subscribeSyncState'](
    request: FeedService.GetSyncStateRequest,
  ): EffectStream.Stream<FeedService.GetSyncStateResponse, Error> {
    return this.#recomputeOnNewBlocks(() => this.#getSyncStateImpl(request), syncStateResponseChanged);
  }

  /**
   * Shared by every `subscribeX` RPC: pushes `compute()`'s result on subscribe, then again whenever
   * {@link FeedStore.onNewBlocks} fires and `changed` says the recomputed value actually differs from
   * the last one sent. Coalesced, not concurrent -- an `onNewBlocks` signal that arrives
   * mid-recomputation only marks `dirty` rather than starting a second overlapping read, so a slow
   * recomputation can never finish after (and thus emit over) a faster, later one.
   */
  #recomputeOnNewBlocks<T>(
    compute: () => Promise<T>,
    changed: (before: T, after: T) => boolean,
  ): EffectStream.Stream<T, Error> {
    return EffectEx.streamFromEmitter<T, Error>((emit) => {
      const ctx = Context.default();
      let last: T | undefined;
      let running = false;
      let dirty = false;
      const recompute = async () => {
        if (running) {
          dirty = true;
          return;
        }
        running = true;
        try {
          do {
            dirty = false;
            const next = await compute();
            if (!last || changed(last, next)) {
              last = next;
              emit.single(next);
            }
          } while (dirty);
        } catch (err) {
          emit.fail(err as Error);
        } finally {
          running = false;
        }
      };
      void recompute();
      this.#feedStore.onNewBlocks.on(ctx, () => void recompute());
      return Effect.promise(() => ctx.dispose());
    });
  }

  #getSyncStateImpl(request: FeedService.GetSyncStateRequest): Promise<FeedService.GetSyncStateResponse> {
    const ctx = Context.default();
    if (this.#getSyncState) {
      return this.#getSyncState(ctx, request);
    }

    const spaceId = request.spaceId as SpaceId;
    const namespaces =
      request.namespaces != null && request.namespaces.length > 0
        ? request.namespaces
        : Object.values(FeedProtocol.WellKnownNamespaces);

    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen({ self: this }, function* () {
        const namespaceStates = yield* Effect.forEach(
          namespaces,
          (feedNamespace) =>
            Effect.gen({ self: this }, function* () {
              const blocksToPush = yield* this.#feedStore.countUnpositionedBlocks({
                spaceId,
                feedNamespace,
              });
              const totalBlocks = yield* this.#feedStore.countNamespaceBlocks({
                spaceId,
                feedNamespace,
              });
              return {
                namespace: feedNamespace,
                blocksToPull: '0',
                blocksToPush: String(blocksToPush),
                totalBlocks: String(totalBlocks),
              };
            }),
          { concurrency: 'unbounded' },
        );
        return { namespaces: namespaceStates };
      }),
    );
  }
}

/**
 * Assumes both responses enumerate namespaces in the same order -- true for both `#getSyncState`
 * paths, which always iterate the same fixed `namespaces` list for a given request.
 */
const syncStateResponseChanged = (
  before: FeedService.GetSyncStateResponse,
  after: FeedService.GetSyncStateResponse,
): boolean => {
  const beforeNamespaces = before.namespaces ?? [];
  const afterNamespaces = after.namespaces ?? [];
  if (beforeNamespaces.length !== afterNamespaces.length) {
    return true;
  }
  return beforeNamespaces.some((namespaceState, index) => {
    const other = afterNamespaces[index];
    return (
      namespaceState.namespace !== other.namespace ||
      namespaceState.blocksToPull !== other.blocksToPull ||
      namespaceState.blocksToPush !== other.blocksToPush ||
      namespaceState.totalBlocks !== other.totalBlocks
    );
  });
};

/**
 * String equality on the encoded objects (not a decoded/semantic diff) plus cursors -- cheap, and
 * exact enough: a feed only grows via new blocks, so any real content change shows up as an
 * appended or altered entry in `objects`, or a moved cursor.
 */
const feedQueryResultChanged = (before: FeedService.FeedQueryResult, after: FeedService.FeedQueryResult): boolean => {
  if (before.nextCursor !== after.nextCursor || before.prevCursor !== after.prevCursor) {
    return true;
  }
  const beforeObjects = before.objects ?? [];
  const afterObjects = after.objects ?? [];
  if (beforeObjects.length !== afterObjects.length) {
    return true;
  }
  return beforeObjects.some((object, index) => object !== afterObjects[index]);
};
