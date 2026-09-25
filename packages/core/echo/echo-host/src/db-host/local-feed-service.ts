//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as EffectStream from 'effect/Stream';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import { type ObjectJSON } from '@dxos/echo/internal';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { type FeedStore } from '@dxos/feed';
import { assertArgument, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { FeedProtocol, toServiceError } from '@dxos/protocols';
import { type FeedService } from '@dxos/protocols/rpc';

/**
 * Writes feed data to a local FeedStore.
 */
export class LocalFeedServiceImpl implements FeedService.Handlers {
  #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  #feedStore: FeedStore;
  #syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;

  'constructor'(
    runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>,
    feedStore: FeedStore,
    options?: {
      syncFeed?: (ctx: Context, request: FeedService.SyncFeedRequest) => Promise<void>;
    },
  ) {
    this.#runtime = runtime;
    this.#feedStore = feedStore;
    this.#syncFeed = options?.syncFeed;
  }

  ['FeedService.queryFeed'](
    request: FeedService.QueryFeedRequest,
  ): Effect.Effect<FeedService.FeedQueryResult, BaseError> {
    return Effect.tryPromise({
      try: () => this.#queryFeedImpl(request),
      catch: toServiceError,
    });
  }

  /**
   * Pushes the feed's full contents on subscribe, then on every {@link FeedStore.onNewBlocks} signal
   * a delta: the blocks written since, and position changes and removals of blocks sent before. Each
   * push costs a scan of block heads plus the new payloads, not a re-read of the whole feed.
   *
   * `after`, `limit` and `reverse` are ignored: a subscriber is sent every block of its feeds.
   */
  ['FeedService.subscribeFeed'](
    request: FeedService.QueryFeedRequest,
  ): EffectStream.Stream<FeedService.FeedQueryResult, Error> {
    const { query } = request;
    invariant(query, 'query is required');
    const spaceId = query.spaceId;
    const feedNamespace = query.feedNamespace || FeedProtocol.WellKnownNamespaces.data;
    const feedStore = this.#feedStore;
    let dataAfter = -1;
    let sent: Map<string, number | null> | undefined;
    return this.#recomputeOn(
      this.#feedStore.onNewBlocks,
      spaceId,
      () =>
        RuntimeProvider.runPromise(this.#runtime)(
          Effect.gen(function* () {
            const { heads, blocks } = yield* feedStore.queryHeads({
              spaceId,
              feedNamespace,
              feedIds: query.feedIds,
              dataAfter,
            });
            const current = new Map<string, number | null>();
            for (const head of [...heads, ...blocks]) {
              current.set(EchoFeedCodec.blockId(head.actorId, head.sequence), head.position);
              dataAfter = Math.max(dataAfter, head.insertionId ?? -1);
            }
            const objects = blocks.map((block) => JSON.stringify(EchoFeedCodec.decodeBlock(block)));
            const previous = sent;
            sent = current;
            if (previous === undefined) {
              return Function.identity<FeedService.FeedQueryResult>({ objects, nextCursor: '', prevCursor: '' });
            }
            return Function.identity<FeedService.FeedQueryResult>({
              objects,
              nextCursor: '',
              prevCursor: '',
              delta: true,
              positions: [...current]
                .filter(([block, position]) => previous.has(block) && previous.get(block) !== position)
                .map(([block, position]) => ({ block, position })),
              removed: [...previous.keys()].filter((block) => !current.has(block)),
            });
          }),
        ),
      (_, next) =>
        next.delta !== true ||
        (next.objects?.length ?? 0) + (next.positions?.length ?? 0) + (next.removed?.length ?? 0) > 0,
    );
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
          JSON.stringify(EchoFeedCodec.decodeBlock(block)),
        );

        return Function.identity<FeedService.FeedQueryResult>({
          objects,
          nextCursor: result.nextCursor,
          prevCursor: '',
        });
      }),
    );
  }

  ['FeedService.insertIntoFeed'](
    request: FeedService.InsertIntoFeedRequest,
  ): Effect.Effect<FeedService.InsertIntoFeedResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const { subspaceTag, spaceId, feedId, objects } = request;
        const feedNamespace = subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
        assertArgument(
          FeedProtocol.isWellKnownNamespace(feedNamespace),
          'request.subspaceTag',
          'expected a well-known feed namespace',
        );
        return RuntimeProvider.runPromise(this.#runtime)(
          Effect.gen({ self: this }, function* () {
            const messages = (objects ?? []).map((encoded) => ({
              spaceId: spaceId,
              feedId: feedId!,
              feedNamespace,
              data: EchoFeedCodec.encode(JSON.parse(encoded) as ObjectJSON),
            }));

            const blocks = yield* this.#feedStore.appendLocal(messages);
            return { blocks: blocks.map((block) => EchoFeedCodec.blockId(block.actorId, block.sequence)) };
          }),
        );
      },
      catch: toServiceError,
    });
  }

  ['FeedService.deleteFromFeed'](request: FeedService.DeleteFromFeedRequest): Effect.Effect<void, BaseError> {
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
      catch: toServiceError,
    });
  }

  ['FeedService.syncFeed'](request: FeedService.SyncFeedRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        await this.#syncFeed?.(Context.default(), request);
      },
      catch: toServiceError,
    });
  }

  ['FeedService.getSyncState'](
    request: FeedService.GetSyncStateRequest,
  ): Effect.Effect<FeedService.GetSyncStateResponse, BaseError> {
    return Effect.tryPromise({
      try: () => this.#getSyncStateImpl(request),
      catch: toServiceError,
    });
  }

  ['FeedService.subscribeSyncState'](
    request: FeedService.GetSyncStateRequest,
  ): EffectStream.Stream<FeedService.GetSyncStateResponse, Error> {
    return this.#recomputeOn(
      this.#feedStore.onSyncStateChanged,
      request.spaceId,
      () => this.#getSyncStateImpl(request),
      syncStateResponseChanged,
    );
  }

  /**
   * Shared by every `subscribeX` RPC: pushes `compute()`'s result on subscribe, then again whenever
   * `event` fires for `spaceId` and `changed` says the recomputed value
   * actually differs from the last one sent. Coalesced, not concurrent -- a signal that arrives
   * mid-recomputation only marks `dirty` rather than starting a second overlapping read, so a slow
   * recomputation can never finish after (and thus emit over) a faster, later one.
   */
  #recomputeOn<T>(
    event: Event<{ spaceId: string }>,
    spaceId: string,
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
      event.on(ctx, (signal) => {
        if (signal.spaceId === spaceId) {
          void recompute();
        }
      });
      return Effect.promise(() => ctx.dispose());
    });
  }

  #getSyncStateImpl(request: FeedService.GetSyncStateRequest): Promise<FeedService.GetSyncStateResponse> {
    const { spaceId } = request;
    assertArgument(SpaceId.isValid(spaceId), 'request.spaceId', 'expected a space id');
    const namespaces =
      request.namespaces != null && request.namespaces.length > 0
        ? request.namespaces
        : Object.values(FeedProtocol.WellKnownNamespaces);
    for (const feedNamespace of namespaces) {
      assertArgument(
        FeedProtocol.isWellKnownNamespace(feedNamespace),
        'request.namespaces',
        'expected well-known feed namespaces',
      );
    }

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
              const { blocksToPull } = yield* this.#feedStore.getSyncState({ spaceId, feedNamespace });
              return {
                namespace: feedNamespace,
                blocksToPull: String(blocksToPull),
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
 * Assumes both responses enumerate namespaces in the same order -- true because `#getSyncStateImpl`
 * always iterates the same fixed `namespaces` list for a given request.
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
