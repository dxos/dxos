//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import { Context, ContextDisposedError } from '@dxos/context';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import type { SqlTransaction } from '@dxos/sql-sqlite';

import { SyncRpcTimeoutError } from './errors';
import type { FeedStore } from './feed-store';

/** Default timeout for feed sync RPCs awaiting an edge response. */
export const DEFAULT_SYNC_RPC_TIMEOUT_MS = 30_000;

type AppendResponse = FeedProtocol.AppendResponse;
type ProtocolMessage = FeedProtocol.ProtocolMessage;
type QueryResponse = FeedProtocol.QueryResponse;
type QueryRequestMessage = Extract<ProtocolMessage, { _tag: 'QueryRequest' }>;
type AppendRequestMessage = Extract<ProtocolMessage, { _tag: 'AppendRequest' }>;
type RequestMessage = QueryRequestMessage | AppendRequestMessage;
type RequestPayload =
  | Omit<QueryRequestMessage, 'senderPeerId' | 'recipientPeerId'>
  | Omit<AppendRequestMessage, 'senderPeerId' | 'recipientPeerId'>;

export type SyncClientOptions = {
  /** This client's peer id. Set as senderPeerId on all requests. */
  peerId: string;
  /** The server's peer id. Set as recipientPeerId on all requests. */
  serverPeerId?: string;
  feedStore: FeedStore;
  /** Send a protocol message to the server. Returns Effect. */
  sendMessage: (ctx: Context, message: RequestMessage) => Effect.Effect<void, unknown, never>;
  /**
   * Max time to wait for a matching protocol response after sending a request, in milliseconds.
   * @default {@link DEFAULT_SYNC_RPC_TIMEOUT_MS}
   */
  rpcTimeoutMs?: number;
};

/**
 * Client-side sync: pull/push by sending protocol messages and handling responses.
 * Sets senderPeerId = peerId and recipientPeerId = serverPeerId on all requests.
 * Uses a map of requestId -> Deferred to match responses to in-flight requests.
 * handleMessage completes the Deferred for the requestId (if any) and removes the handler; no handler = noop.
 */
export class SyncClient {
  readonly #peerId: string;
  readonly #serverPeerId: string | undefined;
  readonly #feedStore: FeedStore;
  readonly #sendMessage: SyncClientOptions['sendMessage'];
  readonly #rpcTimeoutMs: number;
  readonly #handlers = new Map<string, Deferred.Deferred<ProtocolMessage, Error>>();

  constructor(options: SyncClientOptions) {
    this.#peerId = options.peerId;
    this.#serverPeerId = options.serverPeerId;
    this.#feedStore = options.feedStore;
    this.#sendMessage = options.sendMessage;
    this.#rpcTimeoutMs = options.rpcTimeoutMs ?? DEFAULT_SYNC_RPC_TIMEOUT_MS;
  }

  #withPeerIds(payload: RequestPayload): RequestMessage {
    if (payload._tag === 'QueryRequest') {
      return {
        ...payload,
        senderPeerId: this.#peerId,
        recipientPeerId: this.#serverPeerId,
      };
    }
    return {
      ...payload,
      senderPeerId: this.#peerId,
      recipientPeerId: this.#serverPeerId,
    };
  }

  /**
   * Receive a message from the server. If a handler is registered for the message's requestId, complete it and remove; else noop.
   */
  handleMessage(message: ProtocolMessage): Effect.Effect<void, never, never> {
    const requestId = 'requestId' in message && message.requestId != null ? String(message.requestId) : undefined;
    if (requestId == null) {
      log.trace('feed sync client response ignored (no request id)', {
        tag: message._tag,
        senderPeerId: message.senderPeerId,
      });
      return Effect.void;
    }
    const deferred = this.#handlers.get(requestId);
    if (deferred == null) {
      log.trace('feed sync client response ignored (no pending rpc)', {
        requestId,
        tag: message._tag,
        senderPeerId: message.senderPeerId,
      });
      return Effect.void;
    }
    this.#handlers.delete(requestId);
    log('feed sync client rpc completed', {
      requestId,
      tag: message._tag,
      blockCount: 'blocks' in message ? message.blocks.length : undefined,
      positionCount: 'positions' in message ? message.positions.length : undefined,
      error: message._tag === 'Error' ? message.message : undefined,
    });
    if (message._tag === 'Error') {
      return Effect.andThen(Deferred.fail(deferred, new Error(message.message)), () => Effect.void);
    }
    return Effect.andThen(Deferred.succeed(deferred, message), () => Effect.void);
  }

  /** Removes the pending handler entry and unregisters the ctx onDispose hook. Idempotent. */
  #disposeHandler(requestId: string, cleanupDispose: () => void): void {
    cleanupDispose();
    this.#handlers.delete(requestId);
  }

  #awaitRpcResponse(
    requestId: string,
    deferred: Deferred.Deferred<ProtocolMessage, Error>,
    cleanupDispose: () => void,
    meta: { spaceId: SpaceId; feedNamespace: string; rpcTag: string },
  ): Effect.Effect<ProtocolMessage, Error | SyncRpcTimeoutError, never> {
    const self = this;
    const timeoutMs = self.#rpcTimeoutMs;
    return Effect.ensuring(
      Deferred.await(deferred).pipe(
        Effect.timeoutFail({
          duration: timeoutMs,
          onTimeout: () =>
            new SyncRpcTimeoutError({
              requestId,
              spaceId: meta.spaceId,
              feedNamespace: meta.feedNamespace,
              rpcTag: meta.rpcTag,
              timeoutMs,
            }),
        }),
        Effect.tapError((cause) =>
          Effect.sync(() => {
            if (cause instanceof SyncRpcTimeoutError) {
              log('feed sync client rpc timed out', {
                requestId,
                spaceId: meta.spaceId,
                feedNamespace: meta.feedNamespace,
                rpcTag: meta.rpcTag,
                timeoutMs,
              });
            }
          }),
        ),
      ),
      Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose)),
    );
  }

  pull(
    ctx: Context,
    opts: {
      spaceId: SpaceId;
      feedNamespace: string;
      limit?: number;
    },
  ): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    return Effect.gen(function* () {
      const lastPulledPosition = yield* self.#feedStore.getSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
      });
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const cleanupDispose = ctx.disposed
        ? () => {}
        : ctx.onDispose(() => {
            Effect.runFork(Deferred.fail(deferred, new ContextDisposedError()));
          });
      if (ctx.disposed) {
        yield* Deferred.fail(deferred, new ContextDisposedError());
      }
      const request: RequestPayload = {
        _tag: 'QueryRequest',
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        position: lastPulledPosition,
        limit: opts.limit,
      };
      log('feed sync client pull rpc sending', {
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        afterPosition: lastPulledPosition,
        limit: opts.limit,
      });
      yield* self.#sendMessage(ctx, self.#withPeerIds(request)).pipe(
        Effect.tapErrorCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
      );
      const message = yield* self.#awaitRpcResponse(requestId, deferred, cleanupDispose, {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        rpcTag: 'QueryRequest',
      });
      const response = yield* self.#expectResponse<QueryResponse>(requestId, message, 'QueryResponse');
      if (response.blocks.length === 0) {
        log.trace('feed sync client pull done (empty batch)', {
          requestId,
          spaceId: opts.spaceId,
          feedNamespace: opts.feedNamespace,
        });
        return { done: true };
      }
      yield* self.#feedStore.append({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        blocks: response.blocks,
      });

      // Update sync state with the max position from the pulled batch.
      const maxPulledPosition = response.blocks.reduce(
        (max, block) => (block.position != null && block.position > max ? block.position : max),
        lastPulledPosition,
      );
      yield* self.#feedStore.setSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        lastPulledPosition: maxPulledPosition,
      });

      log('feed sync client pull applied batch', {
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        batchSize: response.blocks.length,
        hasMore: response.hasMore,
        maxPulledPosition,
      });
      return { done: false };
    });
  }

  /**
   * Probes remote for blocks after the last pulled position without mutating local storage.
   * Returns the number of blocks in the first batch (0 when caught up with remote).
   */
  peekPull(
    ctx: Context,
    opts: {
      spaceId: SpaceId;
      feedNamespace: string;
      limit?: number;
    },
  ): Effect.Effect<{ blocksToPull: number }, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    return Effect.gen(function* () {
      const lastPulledPosition = yield* self.#feedStore.getSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
      });
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const cleanupDispose = ctx.disposed
        ? () => {}
        : ctx.onDispose(() => {
            Effect.runFork(Deferred.fail(deferred, new ContextDisposedError()));
          });
      if (ctx.disposed) {
        yield* Deferred.fail(deferred, new ContextDisposedError());
      }
      const request: RequestPayload = {
        _tag: 'QueryRequest',
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        position: lastPulledPosition,
        limit: opts.limit,
      };
      yield* self.#sendMessage(ctx, self.#withPeerIds(request)).pipe(
        Effect.tapErrorCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
      );
      const message = yield* self.#awaitRpcResponse(requestId, deferred, cleanupDispose, {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        rpcTag: 'QueryRequest',
      });
      const response = yield* self.#expectResponse<QueryResponse>(requestId, message, 'QueryResponse');
      return { blocksToPull: response.blocks.length };
    });
  }

  push(
    ctx: Context,
    opts: {
      spaceId: SpaceId;
      feedNamespace: string;
      limit?: number;
    },
  ): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    return Effect.gen(function* () {
      const unpositioned = yield* self.#feedStore.query({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        unpositionedOnly: true,
        limit: opts.limit,
      });
      if (unpositioned.blocks.length === 0) {
        log.trace('feed sync client push skipped (nothing to send)', {
          spaceId: opts.spaceId,
          feedNamespace: opts.feedNamespace,
        });
        return { done: true };
      }
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const cleanupDispose = ctx.disposed
        ? () => {}
        : ctx.onDispose(() => {
            Effect.runFork(Deferred.fail(deferred, new ContextDisposedError()));
          });
      if (ctx.disposed) {
        yield* Deferred.fail(deferred, new ContextDisposedError());
      }
      const request: RequestPayload = {
        _tag: 'AppendRequest',
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        blocks: unpositioned.blocks,
      };
      log('feed sync client push rpc sending', {
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        blockCount: unpositioned.blocks.length,
      });
      yield* self.#sendMessage(ctx, self.#withPeerIds(request)).pipe(
        Effect.tapErrorCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
      );
      const message = yield* self.#awaitRpcResponse(requestId, deferred, cleanupDispose, {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        rpcTag: 'AppendRequest',
      });
      const response = yield* self.#expectResponse<AppendResponse>(requestId, message, 'AppendResponse');
      yield* self.#feedStore.setPosition({
        spaceId: opts.spaceId,
        blocks: Array.zipWith(response.positions, unpositioned.blocks, (position, block) => ({
          feedId: block.feedId,
          feedNamespace: opts.feedNamespace,
          actorId: block.actorId,
          sequence: block.sequence,
          position,
        })),
      });
      log('feed sync client push positions applied', {
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        positionCount: response.positions.length,
      });
      return { done: false };
    });
  }

  #expectResponse<T>(requestId: string, message: ProtocolMessage, expectedTag: string): Effect.Effect<T, Error, never> {
    if (message._tag === 'Error') {
      return Effect.fail(new Error(message.message));
    }
    const requestIdMsg = 'requestId' in message ? String(message.requestId) : undefined;
    if (message._tag !== expectedTag || requestIdMsg !== requestId) {
      return Effect.fail(new Error(`Unexpected message: expected ${expectedTag} with requestId ${requestId}`));
    }
    return Effect.succeed(message as T);
  }
}
