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
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context, Resource } from '@dxos/context';
import { EchoHostService } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService, MessageSchema } from '@dxos/edge-client';
import { EffectEx, Hook, RuntimeProvider } from '@dxos/effect';
import { type FeedStore, SyncClient, SyncSpaceDeletedError } from '@dxos/feed';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { SystemError } from '@dxos/protocols';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray } from '@dxos/util';

import * as Events from '../../Events.ts';

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });

const DEFAULT_MESSAGE_BLOCKS_LIMIT = 50;
const DEFAULT_SYNC_CONCURRENCY = 5;
const DEFAULT_POLLING_INTERVAL = 5_000;
/**
 * Full-poll interval used once the server has answered the subscribe handshake, and is therefore
 * pushing {@link FeedProtocol.FeedAdvanced} hints. Hints carry the latency, so the poll degrades to
 * a reconcile that only has to catch hints lost to an un-acked send or a socket closing mid-frame.
 */
const DEFAULT_RECONCILE_POLLING_INTERVAL = 30_000;
/** Re-subscribe this long before the server's stated expiry, so a refresh never races the lapse. */
const SUBSCRIPTION_REFRESH_MARGIN_MS = 5 * 60_000;
const DEFAULT_POLL_REQUEST_THROTTLE_MS = 250;
const DEFAULT_FAILURE_BACKOFF_MS = 250;
const MAX_FAILURE_BACKOFF_MS = 30_000;
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
   * Interval between full polls while the server is not known to push hints.
   * @default 5 seconds
   */
  pollingInterval?: number;

  /**
   * Interval between full polls once the server has answered the subscribe handshake and is pushing
   * {@link FeedProtocol.FeedAdvanced} hints.
   * @default 30 seconds
   */
  reconcilePollingInterval?: number;

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
  readonly #reconcilePollingInterval: number;
  readonly #pollRequestThrottleMs: number;
  readonly #backgroundSync: boolean;

  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  readonly #feedStore: FeedStore;
  readonly #edgeClient: EdgeConnection;
  readonly #syncClient: SyncClient;
  readonly #getSpaceIds: () => SpaceId[];

  #spacesToPoll = new Set<SpaceId>();
  /**
   * Spaces the server reported deleted on this connection. Nothing addressed to them is answered, so
   * a request only waits out its timeout and holds the run for every other space; they are left out
   * until the next reconnect, when the report is trusted afresh.
   */
  readonly #deletedSpaces = new Set<SpaceId>();
  /** Last time full poll was completed. */
  #lastFullPoll: number | null = null;
  #throttledPollScheduled = false;
  #lastRequestedPollAt: number | null = null;
  #pushFailureBackoffMs = DEFAULT_FAILURE_BACKOFF_MS;
  #pullFailureBackoffMs = DEFAULT_FAILURE_BACKOFF_MS;

  /**
   * True once the server answered a `SubscribeRequest` on the current connection, which is the only
   * evidence that it will push hints. An older EDGE ignores the request, so the interval must stay
   * at {@link #pollingInterval} rather than relaxing on a hint that will never arrive. Cleared on
   * reconnect, since the next socket may land on a different build.
   */
  #serverPushesHints = false;
  /** Earliest `expiresAt` across live subscriptions; drives the refresh task. */
  #subscriptionExpiresAt: number | null = null;

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
    this.#reconcilePollingInterval = options.reconcilePollingInterval ?? DEFAULT_RECONCILE_POLLING_INTERVAL;
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
            catch: (error) => new SystemError({ message: 'Failed to decode feed sync message.', cause: error }),
          });
          // v4 dropped `Schema.validate`; decoding through the type side is the equivalent.
          const payload = yield* Schema.decodeEffect(Schema.toType(FeedProtocol.ProtocolMessage))(decoded);
          // Server-initiated messages carry no `requestId`, so `SyncClient.handleMessage` — which
          // matches responses to in-flight RPCs — would discard them.
          if (payload._tag === 'FeedAdvanced') {
            this.#onFeedAdvanced(payload);
            return;
          }
          if (payload._tag === 'SubscribeResponse') {
            this.#onSubscribeResponse(payload);
            return;
          }
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
        // A reconnect may land on a different EDGE build, and any subscription the previous socket
        // held is gone with it, so the capability has to be re-established rather than assumed.
        this.#serverPushesHints = false;
        this.#subscriptionExpiresAt = null;
        this.#deletedSpaces.clear();
        if (this.#backgroundSync) {
          this.#sendSubscriptions();
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
      this.#sendSubscriptions();
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
   * Full-poll interval currently in force.
   *
   * A server that never answers the subscribe handshake will never hint, so the tight interval is
   * the only thing keeping remote writes visible against it.
   */
  get #currentPollingInterval(): number {
    return this.#serverPushesHints ? this.#reconcilePollingInterval : this.#pollingInterval;
  }

  /**
   * Announce interest in every synced namespace of every known space.
   *
   * Namespace-wide (empty `feedIds`): the client cannot enumerate a namespace's feed ids until it
   * has pulled them, so per-feed subscription would miss exactly the feeds it has not seen yet.
   */
  #sendSubscriptions(): void {
    for (const spaceId of this.#getSpaceIds()) {
      for (const feedNamespace of this.#syncNamespaces) {
        this.#sendServerBoundMessage(
          {
            _tag: 'SubscribeRequest',
            spaceId,
            feedNamespace,
            feedIds: [],
            senderPeerId: this.#edgeClient.peerKey,
            recipientPeerId: undefined,
          },
          FeedProtocol.encodeServiceId(feedNamespace, spaceId),
        );
      }
    }
  }

  /**
   * Fire-and-forget send of a message the server does not answer with a correlated RPC response.
   *
   * Failure is logged and dropped: the reconcile poll is the backstop for every hint path, so a
   * subscribe that does not land costs freshness rather than correctness.
   */
  #sendServerBoundMessage(message: FeedProtocol.ProtocolMessage, serviceId: string): void {
    const send = Effect.tryPromise(async () =>
      this.#edgeClient.send(
        this._ctx,
        createBuf(MessageSchema, {
          source: {
            identityDid: this.#edgeClient.identityDid,
            peerKey: this.#edgeClient.peerKey,
          },
          serviceId,
          payload: { value: bufferToArray(encoder.encode(message)) },
        }),
      ),
    ).pipe(
      Effect.tapError((cause) =>
        Effect.sync(() =>
          log('feed sync server-bound send failed', {
            tag: message._tag,
            serviceId,
            cause: cause instanceof Error ? cause.message : String(cause),
          }),
        ),
      ),
      Effect.ignore,
    );
    void EffectEx.runPromise(send);
  }

  /**
   * The server accepted a subscription, which is this client's only evidence that it is running a
   * build that pushes hints — an older EDGE drops `SubscribeRequest` without replying.
   */
  #onSubscribeResponse(message: Extract<FeedProtocol.ProtocolMessage, { _tag: 'SubscribeResponse' }>): void {
    const wasPushing = this.#serverPushesHints;
    this.#serverPushesHints = true;
    if (this.#subscriptionExpiresAt == null || message.expiresAt < this.#subscriptionExpiresAt) {
      this.#subscriptionExpiresAt = message.expiresAt;
      this.#scheduleSubscriptionRefresh();
    }
    if (!wasPushing) {
      log('feed sync switched to push-driven reconcile', {
        reconcilePollingInterval: this.#reconcilePollingInterval,
        expiresAt: message.expiresAt,
      });
    }
  }

  /**
   * The server says a namespace gained blocks. Queue exactly that space for the next pull rather
   * than resetting every space, so an active space cannot drag the whole workspace into a full poll.
   */
  #onFeedAdvanced(message: Extract<FeedProtocol.ProtocolMessage, { _tag: 'FeedAdvanced' }>): void {
    if (!this.#backgroundSync) {
      return;
    }
    const { spaceId } = message;
    if (!SpaceId.isValid(spaceId)) {
      log.warn('feed sync hint carried an invalid space id', { spaceId: message.spaceId });
      return;
    }
    // A well-formed id is not yet one this client tracks, and the hint is server-supplied: without
    // this the server could drive pulls for arbitrary spaces.
    if (!this.#getSpaceIds().includes(spaceId)) {
      log.warn('feed sync hint named an untracked space', { spaceId });
      return;
    }
    log('feed sync hint received', {
      spaceId,
      feedNamespace: message.feedNamespace,
      position: message.position,
    });
    this.#spacesToPoll.add(spaceId);
    this.#pollTask.schedule();
  }

  /** Re-announce subscriptions before the server's stated expiry lapses. */
  #scheduleSubscriptionRefresh(): void {
    if (this.#subscriptionExpiresAt == null) {
      return;
    }
    const remaining = this.#subscriptionExpiresAt - Date.now();
    if (remaining <= 0) {
      return;
    }
    // Halving is what keeps a short-lived subscription from refreshing at zero delay, which would
    // spin subscribe/response as fast as the socket allows.
    const margin = Math.min(SUBSCRIPTION_REFRESH_MARGIN_MS, remaining / 2);
    const delay = remaining - margin;
    scheduleTask(
      this._ctx,
      () => {
        this.#subscriptionExpiresAt = null;
        this.#sendSubscriptions();
      },
      delay,
    );
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
      this.#pushFailureBackoffMs = DEFAULT_FAILURE_BACKOFF_MS;
      return;
    }
    if (hadFailure) {
      const delayMs = this.#pushFailureBackoffMs;
      this.#pushFailureBackoffMs = Math.min(this.#pushFailureBackoffMs * 2, MAX_FAILURE_BACKOFF_MS);
      log('feed sync push retry scheduled with backoff', { delayMs });
      scheduleTask(this._ctx, () => this.#pushTask.schedule(), delayMs);
      return;
    }
    this.#pushFailureBackoffMs = DEFAULT_FAILURE_BACKOFF_MS;
    this.#pushTask.schedule();
  }

  /**
   * Delays the next poll after a failed pull. A pull that fails the same way on every attempt
   * would otherwise re-run the moment it returns, since a space that is not done is polled again
   * immediately -- a tight loop of requests against the very server that is failing them.
   */
  #schedulePollRetry(): void {
    const delayMs = this.#pullFailureBackoffMs;
    this.#pullFailureBackoffMs = Math.min(this.#pullFailureBackoffMs * 2, MAX_FAILURE_BACKOFF_MS);
    log('feed sync poll retry scheduled with backoff', { delayMs });
    scheduleTask(this._ctx, () => this.#pollTask.schedule(), delayMs);
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

  /**
   * Stops syncing a space for the rest of this connection once the server reports it deleted: the
   * namespace counts as done, and the other namespaces are not asked. Logged once, since both tasks
   * may report it.
   */
  #dropDeletedSpace(spaceId: SpaceId, feedNamespace: string, cause: SyncSpaceDeletedError): void {
    if (this.#deletedSpaces.has(spaceId)) {
      return;
    }
    this.#deletedSpaces.add(spaceId);
    this.#spacesToPoll.delete(spaceId);
    log.warn('feed sync stopped for a space the server reports deleted', {
      spaceId,
      feedNamespace,
      cause: cause.message,
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
      let hadPullFailure = false;
      yield* Effect.forEach(
        this.#spacesToPoll,
        (spaceId) =>
          Effect.gen({ self: this }, function* () {
            let doneForAllNamespaces = true;
            for (const feedNamespace of this.#syncNamespaces) {
              if (this.#deletedSpaces.has(spaceId)) {
                break;
              }
              const { done } = yield* this.#syncClient
                .pull(this._ctx, {
                  spaceId,
                  feedNamespace,
                  limit: this.#messageBlocksLimit,
                })
                .pipe(
                  Effect.catch((cause) =>
                    Effect.sync(() => {
                      if (cause instanceof SyncSpaceDeletedError) {
                        this.#dropDeletedSpace(spaceId, feedNamespace, cause);
                        return { done: true };
                      }
                      this.#logSyncFailure('pull', { spaceId, feedNamespace, cause });
                      hadPullFailure = true;
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

      // A failed pull only swaps the immediate re-poll for the back-off; the full-poll bookkeeping
      // below still runs, or the failing space would become the only one ever polled again.
      const scheduleNext = hadPullFailure ? () => this.#schedulePollRetry() : () => this.#pollTask.schedule();
      if (!hadPullFailure) {
        this.#pullFailureBackoffMs = DEFAULT_FAILURE_BACKOFF_MS;
      }

      // If its time to do a full poll, reset the spaces to poll and schedule the next poll immediately.
      if (this.#lastFullPoll == null || Date.now() - this.#lastFullPoll > this.#currentPollingInterval) {
        this.#resetSpacesToPoll();
        scheduleNext();
      } else if (this.#spacesToPoll.size > 0) {
        // If there are some spaces still syncing, poll them immediately.
        scheduleNext();
      } else {
        // All spaces sync, and there's time before the next full poll, schedule it later.
        this.#resetSpacesToPoll();
        scheduleTask(
          this._ctx,
          () => this.#pollTask.schedule(),
          Math.max(this.#currentPollingInterval - (Date.now() - (this.#lastFullPoll ?? 0)), 0),
        );
      }
    }).pipe(RuntimeProvider.runPromise(this.#runtime)),
  );

  readonly #pushTask = new AsyncTask(async () =>
    Effect.gen({ self: this }, function* () {
      const outcomes = yield* Effect.forEach(
        this.#getSpaceIds(),
        (spaceId) =>
          Effect.gen({ self: this }, function* () {
            let needsMore = false;
            let hadFailure = false;
            for (const feedNamespace of this.#syncNamespaces) {
              if (this.#deletedSpaces.has(spaceId)) {
                break;
              }
              const { done } = yield* this.#syncClient
                .push(this._ctx, {
                  spaceId,
                  feedNamespace,
                  limit: this.#messageBlocksLimit,
                })
                .pipe(
                  Effect.catch((cause) =>
                    Effect.sync(() => {
                      if (cause instanceof SyncSpaceDeletedError) {
                        this.#dropDeletedSpace(spaceId, feedNamespace, cause);
                        return { done: true };
                      }
                      this.#logSyncFailure('push', { spaceId, feedNamespace, cause });
                      hadFailure = true;
                      return { done: false };
                    }),
                  ),
                );
              if (!done) {
                needsMore = true;
              }
            }
            return { hadFailure, needsMore };
          }),
        { concurrency: this.#syncConcurrency },
      );
      // One decision per run: decided per space, a space that pushed fine reset the back-off a
      // failing one was growing, so the failing one was retried at the minimum delay forever.
      this.#schedulePushRetry({
        hadFailure: outcomes.some((outcome) => outcome.hadFailure),
        needsMore: outcomes.some((outcome) => outcome.needsMore),
      });
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
): Layer.Layer<
  FeedSyncerService,
  never,
  Hook.Controller | SqlClient.SqlClient | EchoHostService | EdgeConnectionService
> =>
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
      yield* Hook.on(
        Events.StackOpened,
        Effect.fn('FeedSyncer.onStackOpened')(function* () {
          yield* Effect.promise(() => feedSyncer.open(ctx));
        }),
      );
      return feedSyncer;
    }),
  );

/** Eager: nothing asks for its tag — it syncs feeds with the edge in the background. */
export const FeedSyncerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, SqlClient.SqlClient, EchoHostService, EdgeConnectionService],
    provides: [FeedSyncerService],
    eager: true,
  },
  () =>
    FeedSyncerLayer({
      peerId: '',
      syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
    }),
);
