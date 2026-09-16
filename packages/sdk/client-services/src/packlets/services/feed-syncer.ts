//
// Copyright 2026 DXOS.org
//

import { Encoder, decode as cborXdecode } from 'cbor-x';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { AsyncTask, scheduleTask } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { EchoHostService } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService, MessageSchema } from '@dxos/edge-client';
import { EffectEx, Event, RuntimeProvider } from '@dxos/effect';
import { type FeedStore, SyncClient } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray } from '@dxos/util';

import { StackOpened } from './events.ts';

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });

const DEFAULT_MESSAGE_BLOCKS_LIMIT = 50;
const DEFAULT_SYNC_CONCURRENCY = 5;
const DEFAULT_POLLING_INTERVAL = 5_000;
const DEFAULT_POLL_REQUEST_THROTTLE_MS = 250;
const DEFAULT_PUSH_FAILURE_BACKOFF_MS = 250;
const MAX_PUSH_FAILURE_BACKOFF_MS = 30_000;
const MAX_BLOCKING_SYNC_ITERATIONS = 100;

export type FeedSyncerOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  feedStore: FeedStore;
  edgeClient: EdgeConnection;
  peerId: string;
  getSpaceIds: () => SpaceId[];

  /**
   * Namespaces to sync.
   */
  syncNamespaces: string[];

  /**
   * Maximum number of blocks to sync in a single message.
   * @default 50
   */
  messageBlocksLimit?: number;

  /**
   * Maximum number of spaces to sync concurrently.
   * @default 5
   */
  syncConcurrency?: number;

  /**
   * Interval between full polls.
   * @default 10 seconds
   */
  pollingInterval?: number;

  /**
   * Minimum delay between externally requested best-effort polls.
   * @default 250 ms
   */
  pollRequestThrottleMs?: number;

  /**
   * When false, only wires the edge message handler; poll/push background tasks and
   * `feedStore.onNewBlocks` auto-push are disabled. Use for tests that call `syncBlocking` explicitly.
   * @default true
   */
  backgroundSync?: boolean;

  /**
   * Max time to wait for a feed sync RPC response from edge, in milliseconds.
   * @default 30000 (see `DEFAULT_SYNC_RPC_TIMEOUT_MS` in `@dxos/feed`).
   */
  syncRpcTimeoutMs?: number;
};

/**
 * Effect service tag for {@link FeedSyncer}.
 *
 * undefined if not initialized.
 */
export class FeedSyncerService extends EffectContext.Service<FeedSyncerService, FeedSyncer | undefined>()(
  '@dxos/client-services/FeedSyncer',
) {}

export class FeedSyncer extends Resource {
  readonly #syncNamespaces: string[];
  readonly #messageBlocksLimit: number;
  readonly #syncConcurrency: number;
  readonly #pollingInterval: number;
  readonly #pollRequestThrottleMs: number;
  readonly #backgroundSync: boolean;

  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  readonly #feedStore: FeedStore;
  readonly #edgeClient: EdgeConnection;
  readonly #syncClient: SyncClient;
  readonly #getSpaceIds: () => SpaceId[];

  #spacesToPoll = new Set<SpaceId>();
  /** Last time full poll was completed. */
  #lastFullPoll: number | null = null;
  #throttledPollScheduled = false;
  #lastRequestedPollAt: number | null = null;
  #pushFailureBackoffMs = DEFAULT_PUSH_FAILURE_BACKOFF_MS;

  constructor(options: FeedSyncerOptions) {
    super();
    this.#runtime = options.runtime;
    this.#feedStore = options.feedStore;
    this.#edgeClient = options.edgeClient;
    this.#syncClient = new SyncClient({
      peerId: options.peerId,
      feedStore: options.feedStore,
      sendMessage: this.#sendMessage.bind(this),
      rpcTimeoutMs: options.syncRpcTimeoutMs,
    });
    this.#getSpaceIds = options.getSpaceIds;
    this.#syncNamespaces = options.syncNamespaces;
    this.#messageBlocksLimit = options.messageBlocksLimit ?? DEFAULT_MESSAGE_BLOCKS_LIMIT;
    this.#syncConcurrency = options.syncConcurrency ?? DEFAULT_SYNC_CONCURRENCY;
    this.#pollingInterval = options.pollingInterval ?? DEFAULT_POLLING_INTERVAL;
    this.#pollRequestThrottleMs = options.pollRequestThrottleMs ?? DEFAULT_POLL_REQUEST_THROTTLE_MS;
    this.#backgroundSync = options.backgroundSync ?? true;
  }

  protected override async _open(): Promise<void> {
    this._ctx.onDispose(
      this.#edgeClient.onMessage((msg: RouterMessage) => {
        if (!msg.serviceId) {
          return;
        }
        const service = msg.serviceId.split(':')[0];
        if (service !== EdgeService.QUEUE_REPLICATOR) {
          return;
        }
        log('feed sync edge ingress', {
          serviceId: msg.serviceId,
          payloadByteLength: msg.payload?.value?.byteLength,
        });
        const handleMessageEffect = Effect.gen({ self: this }, function* () {
          const decoded = yield* Effect.try({
            try: () => cborXdecode(msg.payload!.value),
            catch: (error) => new Error(`Failed to decode feed sync message: ${error}`),
          });
          // v4 dropped `Schema.validate`; decoding through the type side is the equivalent.
          const payload = yield* Schema.decodeEffect(Schema.toType(FeedProtocol.ProtocolMessage))(decoded);
          yield* this.#syncClient.handleMessage(payload);
        }).pipe(
          Effect.tapError((cause) =>
            Effect.sync(() =>
              log('feed sync edge message handling failed', {
                serviceId: msg.serviceId,
                payloadByteLength: msg.payload?.value?.byteLength,
                cause: cause instanceof Error ? cause.message : String(cause),
              }),
            ),
          ),
        );

        void RuntimeProvider.runPromise(this.#runtime)(handleMessageEffect);
      }),
    );

    if (this.#backgroundSync) {
      // Tasks must be opened before registering listeners that call `schedule()`:
      //   * `onNewBlocks` can fire from any `feedStore.append` happening on a separate
      //     microtask while `_open()` is still awaiting.
      //   * The edge client invokes `onReconnected` as a microtask when already connected.
      //   `AsyncTask.schedule()` throws if the task is not yet open.
      await this.#pollTask.open();
      await this.#pushTask.open();

      this.#feedStore.onNewBlocks.on(this._ctx, () => {
        this.#pushTask.schedule();
      });
    }

    this._ctx.onDispose(
      // NOTE: Fires immediately (as a microtask) if the connection is already open, and again
      // on every subsequent reconnect.
      this.#edgeClient.onReconnected(async () => {
        log('feed sync edge reconnected', {
          peerKey: this.#edgeClient.peerKey,
          identityDid: this.#edgeClient.identityDid,
        });
        if (this.#backgroundSync) {
          this.#resetSpacesToPoll();
          this.#pollTask.schedule();
          this.#pushTask.schedule();
        }
      }),
    );

    // Only kick the initial round when the socket is already up. While it is not, each send parks on
    // the ready trigger; the `onReconnected` handler above schedules exactly this same work the
    // moment it connects, so a host that gates its dial until after boot loses nothing here.
    if (this.#backgroundSync && this.#edgeClient.status.state === EdgeStatus_ConnectionState.CONNECTED) {
      this.#resetSpacesToPoll();
      this.#pollTask.schedule();
      // Flush blocks written before the syncer opened: `onNewBlocks` only fires on append,
      // so existing unpositioned blocks would otherwise never be pushed.
      this.#pushTask.schedule();
    }
  }

  protected override async _close(): Promise<void> {
    if (this.#backgroundSync) {
      await this.#pollTask.close();
      await this.#pushTask.close();
    }
  }

  /**
   * Schedules a best-effort pull without blocking the caller.
   */
  schedulePoll(): void {
    if (!this.#backgroundSync) {
      return;
    }
    this.#resetSpacesToPoll();
    if (this.#throttledPollScheduled) {
      return;
    }

    const now = Date.now();
    const delay =
      this.#lastRequestedPollAt == null
        ? 0
        : Math.max(this.#pollRequestThrottleMs - (now - this.#lastRequestedPollAt), 0);
    this.#throttledPollScheduled = true;
    scheduleTask(
      this._ctx,
      () => {
        this.#throttledPollScheduled = false;
        this.#lastRequestedPollAt = Date.now();
        this.#pollTask.schedule();
      },
      delay,
    );
  }

  /**
   * Performs queue sync and blocks until there are no pending sync batches.
   */
  async syncBlocking(
    ctx: Context,
    {
      spaceId,
      subspaceTag,
      shouldPush = true,
      shouldPull = true,
    }: {
      spaceId: SpaceId;
      subspaceTag: string;
      shouldPush?: boolean;
      shouldPull?: boolean;
    },
  ): Promise<void> {
    invariant(SpaceId.isValid(spaceId));
    invariant(FeedProtocol.isWellKnownNamespace(subspaceTag));
    if (!shouldPush && !shouldPull) {
      return;
    }

    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen({ self: this }, function* () {
        let done = false;
        let iterations = 0;
        while (!done) {
          done = true;
          if (shouldPull) {
            const pullResult = yield* this.#syncClient.pull(ctx, {
              spaceId,
              feedNamespace: subspaceTag,
              limit: this.#messageBlocksLimit,
            });
            done &&= pullResult.done;
          }

          if (shouldPush) {
            const pushResult = yield* this.#syncClient.push(ctx, {
              spaceId,
              feedNamespace: subspaceTag,
              limit: this.#messageBlocksLimit,
            });
            done &&= pushResult.done;
          }
          iterations++;
          if (iterations > MAX_BLOCKING_SYNC_ITERATIONS) {
            throw new Error('Blocking sync exceeded max iterations.');
          }
        }
      }),
    );
  }

  #schedulePushRetry({ hadFailure, needsMore }: { hadFailure: boolean; needsMore: boolean }): void {
    if (!needsMore) {
      this.#pushFailureBackoffMs = DEFAULT_PUSH_FAILURE_BACKOFF_MS;
      return;
    }
    if (hadFailure) {
      const delayMs = this.#pushFailureBackoffMs;
      this.#pushFailureBackoffMs = Math.min(this.#pushFailureBackoffMs * 2, MAX_PUSH_FAILURE_BACKOFF_MS);
      log('feed sync push retry scheduled with backoff', { delayMs });
      scheduleTask(this._ctx, () => this.#pushTask.schedule(), delayMs);
      return;
    }
    this.#pushFailureBackoffMs = DEFAULT_PUSH_FAILURE_BACKOFF_MS;
    this.#pushTask.schedule();
  }

  #resetSpacesToPoll(): void {
    this.#spacesToPoll.clear();
    this.#getSpaceIds().forEach((spaceId) => {
      this.#spacesToPoll.add(spaceId);
    });
    this.#lastFullPoll = Date.now();
  }

  #sendMessage(
    ctx: Context,
    message: FeedProtocol.QueryRequest | FeedProtocol.AppendRequest,
  ): Effect.Effect<void, unknown, never> {
    return Effect.gen({ self: this }, function* () {
      const encoded = encoder.encode(message);
      const serviceId = this.#getTargetServiceId(message);
      const rpcTag = 'blocks' in message ? 'AppendRequest' : 'QueryRequest';
      log('feed sync edge rpc outgoing', {
        tag: rpcTag,
        serviceId,
        payloadByteLength: encoded.byteLength,
        spaceId: message.spaceId,
        feedNamespace: message.feedNamespace,
        requestId: message.requestId,
      });
      yield* Effect.tryPromise(async () =>
        this.#edgeClient.send(
          ctx,
          createBuf(MessageSchema, {
            source: {
              identityDid: this.#edgeClient.identityDid,
              peerKey: this.#edgeClient.peerKey,
            },
            serviceId,
            payload: { value: bufferToArray(encoded) },
          }),
        ),
      ).pipe(
        Effect.tapError((cause) =>
          Effect.sync(() =>
            log('feed sync edge send failed', {
              serviceId,
              tag: rpcTag,
              cause: cause instanceof Error ? cause.message : String(cause),
            }),
          ),
        ),
      );
    });
  }

  #logSyncFailure(
    operation: 'pull' | 'push',
    { spaceId, feedNamespace, cause }: { spaceId: SpaceId; feedNamespace: string; cause: unknown },
  ): void {
    log('feed sync operation failed', {
      operation,
      spaceId,
      feedNamespace,
      cause: cause instanceof Error ? cause.message : String(cause),
      errorTag: cause instanceof Error ? cause.name : undefined,
    });
  }

  #getTargetServiceId(message: FeedProtocol.QueryRequest | FeedProtocol.AppendRequest): string {
    // TODO(dmaretskyi): Perhaps in the future we will want to include the queue namespace here as well.
    //                   This would require putting it at the top level of the message.
    //                   For now, we let the edge router handle it.
    return FeedProtocol.encodeServiceId(message.feedNamespace, message.spaceId as SpaceId);
  }

  readonly #pollTask = new AsyncTask(async () =>
    Effect.gen({ self: this }, function* () {
      yield* Effect.forEach(
        this.#spacesToPoll,
        (spaceId) =>
          Effect.gen({ self: this }, function* () {
            let doneForAllNamespaces = true;
            for (const feedNamespace of this.#syncNamespaces) {
              const { done } = yield* this.#syncClient
                .pull(this._ctx, {
                  spaceId,
                  feedNamespace,
                  limit: this.#messageBlocksLimit,
                })
                .pipe(
                  Effect.catch((cause) =>
                    Effect.gen({ self: this }, function* () {
                      this.#logSyncFailure('pull', { spaceId, feedNamespace, cause });
                      return { done: false };
                    }),
                  ),
                );
              if (!done) {
                doneForAllNamespaces = false;
              }
            }
            if (doneForAllNamespaces) {
              this.#spacesToPoll.delete(spaceId);
            }
          }),
        { concurrency: this.#syncConcurrency },
      );

      // If its time to do a full poll, reset the spaces to poll and schedule the next poll immediately.
      if (this.#lastFullPoll == null || Date.now() - this.#lastFullPoll > this.#pollingInterval) {
        this.#resetSpacesToPoll();
        this.#pollTask.schedule();
      } else if (this.#spacesToPoll.size > 0) {
        // If there are some spaces still syncing, poll them immediately.
        this.#pollTask.schedule();
      } else {
        // All spaces sync, and there's time before the next full poll, schedule it later.
        this.#resetSpacesToPoll();
        scheduleTask(
          this._ctx,
          () => this.#pollTask.schedule(),
          Math.max(this.#pollingInterval - (Date.now() - (this.#lastFullPoll ?? 0)), 0),
        );
      }
    }).pipe(RuntimeProvider.runPromise(this.#runtime)),
  );

  readonly #pushTask = new AsyncTask(async () =>
    Effect.gen({ self: this }, function* () {
      yield* Effect.forEach(
        this.#getSpaceIds(),
        (spaceId) =>
          Effect.gen({ self: this }, function* () {
            let needsMorePush = false;
            let hadPushFailure = false;
            for (const feedNamespace of this.#syncNamespaces) {
              const { done } = yield* this.#syncClient
                .push(this._ctx, {
                  spaceId,
                  feedNamespace,
                  limit: this.#messageBlocksLimit,
                })
                .pipe(
                  Effect.tap(() =>
                    Effect.sync(() => {
                      this.#pushFailureBackoffMs = DEFAULT_PUSH_FAILURE_BACKOFF_MS;
                    }),
                  ),
                  Effect.catch((cause) =>
                    Effect.gen({ self: this }, function* () {
                      this.#logSyncFailure('push', { spaceId, feedNamespace, cause });
                      hadPushFailure = true;
                      return { done: false };
                    }),
                  ),
                );
              if (!done) {
                needsMorePush = true;
              }
            }
            this.#schedulePushRetry({ hadFailure: hadPushFailure, needsMore: needsMorePush });
          }),
        { concurrency: this.#syncConcurrency },
      );
    }).pipe(RuntimeProvider.runPromise(this.#runtime)),
  );
}

export type FeedSyncerLayerOptions = Pick<
  FeedSyncerOptions,
  | 'peerId'
  | 'syncNamespaces'
  | 'messageBlocksLimit'
  | 'syncConcurrency'
  | 'pollingInterval'
  | 'pollRequestThrottleMs'
  | 'backgroundSync'
  | 'syncRpcTimeoutMs'
>;

/**
 * Effect Layer constructing a {@link FeedSyncer} from ambient SQL, echo host, and edge services.
 *
 * The feed store is sourced from the {@link EchoHostService} (breaking the EchoHost <-> FeedSyncer
 * cycle). Only included when an edge connection is configured, so it resolves the edge tag directly.
 */
export const FeedSyncerLayer = (
  options: FeedSyncerLayerOptions,
): Layer.Layer<FeedSyncerService, never, Event.Bus | SqlClient.SqlClient | EchoHostService | EdgeConnectionService> =>
  Layer.effect(
    FeedSyncerService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
      const echoHost = yield* EchoHostService;
      const edgeClient = yield* EdgeConnectionService;
      const feedSyncer = new FeedSyncer({
        runtime,
        feedStore: echoHost.feedStore,
        edgeClient,
        getSpaceIds: () => echoHost.spaceIds,
        ...options,
      });

      // The echo host falls back to a no-op sync while these are unset, so only this layer sets them.
      echoHost.setFeedSyncHandlers({
        syncFeed: (ctx, request) =>
          feedSyncer.syncBlocking(ctx, {
            spaceId: request.spaceId as SpaceId,
            subspaceTag: request.subspaceTag,
            shouldPush: request.shouldPush,
            shouldPull: request.shouldPull,
          }),
      });

      const ctx = yield* EffectEx.contextFromScope();
      yield* Effect.addFinalizer(() => Effect.promise(() => feedSyncer.close()));
      yield* Event.on(
        StackOpened,
        Effect.fn('FeedSyncer.onStackOpened')(function* () {
          yield* Effect.promise(() => feedSyncer.open(ctx));
        }),
      );
      return feedSyncer;
    }),
  );
