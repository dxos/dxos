//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import { Encoder, decode as cborXdecode } from 'cbor-x';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AsyncTask, scheduleTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type EdgeConnection, MessageSchema } from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore, SyncClient } from '@dxos/feed';
import { type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { EdgeService } from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import { type Message as RouterMessage } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import type { SqlTransaction } from '@dxos/sql-sqlite';
import { bufferToArray } from '@dxos/util';

const encoder = new Encoder({ tagUint8Array: false, useRecords: false });

const DEFAULT_MESSAGE_BLOCKS_LIMIT = 50;
const DEFAULT_SYNC_CONCURRENCY = 5;
const DEFAULT_POLLING_INTERVAL = 5_000;
const DEFAULT_POLL_REQUEST_THROTTLE_MS = 250;

interface FeedSyncerOptions {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
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
}

export class FeedSyncer extends Resource {
  readonly #syncNamespaces: string[];
  readonly #messageBlocksLimit: number;
  readonly #syncConcurrency: number;
  readonly #pollingInterval: number;
  readonly #pollRequestThrottleMs: number;

  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>;
  readonly #feedStore: FeedStore;
  readonly #edgeClient: EdgeConnection;
  readonly #syncClient: SyncClient;
  readonly #getSpaceIds: () => SpaceId[];

  #spacesToPoll = new Set<SpaceId>();
  /** Last time full poll was completed. */
  #lastFullPoll: number | null = null;
  #throttledPollScheduled = false;
  #lastRequestedPollAt: number | null = null;

  constructor(options: FeedSyncerOptions) {
    super();
    this.#runtime = options.runtime;
    this.#feedStore = options.feedStore;
    this.#edgeClient = options.edgeClient;
    this.#syncClient = new SyncClient({
      peerId: options.peerId,
      feedStore: options.feedStore,
      sendMessage: this.#sendMessage.bind(this),
    });
    this.#getSpaceIds = options.getSpaceIds;
    this.#syncNamespaces = options.syncNamespaces;
    this.#messageBlocksLimit = options.messageBlocksLimit ?? DEFAULT_MESSAGE_BLOCKS_LIMIT;
    this.#syncConcurrency = options.syncConcurrency ?? DEFAULT_SYNC_CONCURRENCY;
    this.#pollingInterval = options.pollingInterval ?? DEFAULT_POLLING_INTERVAL;
    this.#pollRequestThrottleMs = options.pollRequestThrottleMs ?? DEFAULT_POLL_REQUEST_THROTTLE_MS;
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
        const handleMessageEffect = Effect.gen(this, function* () {
          const decoded = yield* Effect.try({
            try: () => cborXdecode(msg.payload!.value),
            catch: (error) => new Error(`Failed to decode feed sync message: ${error}`),
          });
          const payload = yield* Schema.validate(FeedProtocol.ProtocolMessage)(decoded);
          yield* this.#syncClient.handleMessage(payload);
        });

        void RuntimeProvider.runPromise(this.#runtime)(handleMessageEffect);
      }),
    );

    this._ctx.onDispose(
      // NOTE: This will fire immediately if the connection is already open.
      this.#edgeClient.onReconnected(async () => {}),
    );

    this.#feedStore.onNewBlocks.on(this._ctx, () => {
      this.#pushTask.schedule();
    });

    await this.#pollTask.open();
    await this.#pushTask.open();

    this.#resetSpacesToPoll();
    this.#pollTask.schedule();
  }

  protected override async _close(): Promise<void> {
    await this.#pollTask.close();
    await this.#pushTask.close();
  }

  /**
   * Schedules a best-effort pull without blocking the caller.
   */
  schedulePoll(): void {
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
  async syncBlocking(request: FeedProtocol.SyncQueueRequest): Promise<void> {
    const spaceId = request.spaceId as SpaceId | undefined;
    if (!spaceId) {
      throw new Error('syncQueue requires spaceId.');
    }
    const feedNamespace = request.subspaceTag ?? FeedProtocol.WellKnownNamespaces.data;
    if (!FeedProtocol.isWellKnownNamespace(feedNamespace)) {
      throw new Error('syncQueue expected a well-known queue namespace.');
    }

    const shouldPush = request.shouldPush ?? true;
    const shouldPull = request.shouldPull ?? true;
    if (!shouldPush && !shouldPull) {
      return;
    }

    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(this, function* () {
        let done = false;
        while (!done) {
          done = true;
          if (shouldPull) {
            const pullResult = yield* this.#syncClient.pull({
              spaceId,
              feedNamespace,
              limit: this.#messageBlocksLimit,
            });
            done &&= pullResult.done;
          }

          if (shouldPush) {
            const pushResult = yield* this.#syncClient.push({
              spaceId,
              feedNamespace,
              limit: this.#messageBlocksLimit,
            });
            done &&= pushResult.done;
          }
        }
      }),
    );
  }

  #resetSpacesToPoll(): void {
    this.#spacesToPoll.clear();
    this.#getSpaceIds().forEach((spaceId) => {
      this.#spacesToPoll.add(spaceId);
    });
    this.#lastFullPoll = Date.now();
  }

  #sendMessage(message: FeedProtocol.QueryRequest | FeedProtocol.AppendRequest): Effect.Effect<void, unknown, never> {
    return Effect.gen(this, function* () {
      const encoded = encoder.encode(message);
      yield* Effect.tryPromise(async () =>
        this.#edgeClient.send(
          createBuf(MessageSchema, {
            source: {
              identityKey: this.#edgeClient.identityKey,
              peerKey: this.#edgeClient.peerKey,
            },
            serviceId: this.#getTargetServiceId(message),
            payload: { value: bufferToArray(encoded) },
          }),
        ),
      );
    });
  }

  #getTargetServiceId(message: FeedProtocol.QueryRequest | FeedProtocol.AppendRequest): string {
    // TODO(dmaretskyi): Perhaps in the future we will want to include the queue namespace here as well.
    //                   This would require putting it at the top level of the message.
    //                   For now, we let the edge router handle it.
    return FeedProtocol.encodeServiceId(message.feedNamespace, message.spaceId as SpaceId);
  }

  readonly #pollTask = new AsyncTask(async () =>
    Effect.gen(this, function* () {
      yield* Effect.forEach(
        this.#spacesToPoll,
        (spaceId) =>
          Effect.gen(this, function* () {
            let doneForAllNamespaces = true;
            for (const feedNamespace of this.#syncNamespaces) {
              const { done } = yield* this.#syncClient.pull({
                spaceId,
                feedNamespace,
                limit: this.#messageBlocksLimit,
              });
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
    Effect.gen(this, function* () {
      yield* Effect.forEach(
        this.#getSpaceIds(),
        (spaceId) =>
          Effect.gen(this, function* () {
            let doneForAllNamespaces = true;
            for (const feedNamespace of this.#syncNamespaces) {
              const { done } = yield* this.#syncClient.push({
                spaceId,
                feedNamespace,
                limit: this.#messageBlocksLimit,
              });
              if (!done) {
                doneForAllNamespaces = false;
              }
            }
            if (!doneForAllNamespaces) {
              // Keep pushing until all blocks are pushed.
              this.#pushTask.schedule();
            }
          }),
        { concurrency: this.#syncConcurrency },
      );
    }).pipe(RuntimeProvider.runPromise(this.#runtime)),
  );
}
