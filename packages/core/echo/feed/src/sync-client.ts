//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Context, ContextDisposedError } from '@dxos/context';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';

import { SyncRpcTimeoutError } from './errors.ts';
import type { FeedStore } from './feed-store.ts';

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
  /**
   * Namespaces whose pull cursor was rewound to the start and have not yet pulled through to the
   * end. Keyed `spaceId:feedNamespace`; see {@link #replayNamespace}.
   */
  readonly #replaying = new Set<string>();

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
        Effect.timeoutOrElse({
          duration: timeoutMs,
          // v4's `orElse` returns an Effect, where v3's `onTimeout` returned the error value.
          orElse: () =>
            Effect.fail(
              new SyncRpcTimeoutError({
                requestId,
                spaceId: meta.spaceId,
                feedNamespace: meta.feedNamespace,
                rpcTag: meta.rpcTag,
                timeoutMs,
              }),
            ),
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
  ): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient> {
    const self = this;
    return Effect.gen(function* () {
      const { lastPulledPosition, serverToken } = yield* self.#feedStore.getSyncState({
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
        expectedServerToken: serverToken,
      };
      log('feed sync client pull rpc sending', {
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        afterPosition: lastPulledPosition,
        limit: opts.limit,
      });
      yield* self.#sendMessage(ctx, self.#withPeerIds(request)).pipe(
        Effect.tapCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
      );
      const message = yield* self.#awaitRpcResponse(requestId, deferred, cleanupDispose, {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        rpcTag: 'QueryRequest',
      });
      const response = yield* self.#expectResponse<QueryResponse>(requestId, message, 'QueryResponse');
      const reconciliation = yield* self.#reconcileServerToken(
        { ...opts, lastPulledPosition },
        serverToken,
        response.serverToken,
      );
      // On a reset the server ignored the stale `position`, so the batch restarts the namespace.
      const basePosition = reconciliation === 'reset' ? -1 : lastPulledPosition;
      // Positions only come from the server, so a local one above its high-water mark is a row the
      // server lost; unpositioned, the block is pushed again rather than waiting for the server to
      // re-issue that slot to something else.
      const cleared =
        response.maxPosition != null
          ? yield* self.#feedStore.clearPositionsAbove({
              spaceId: opts.spaceId,
              feedNamespace: opts.feedNamespace,
              position: response.maxPosition,
            })
          : 0;
      if (response.blocks.length === 0) {
        // Nothing above the cursor and the server's high-water mark below it: the server lost what
        // this cursor was pulled from, so it will never serve anything above it, and everything it
        // has written since sits below it.
        if (response.maxPosition != null && basePosition > response.maxPosition) {
          // Unconditional, even mid-replay: the server shrank again underneath this one.
          self.#replaying.delete(self.#namespaceKey(opts));
          yield* self.#replayNamespace(opts, response.serverToken, {
            requestId,
            reason: 'cursor beyond the server',
            lastPulledPosition: basePosition,
            maxPosition: response.maxPosition,
            cleared,
          });
          return { done: false };
        }
        if (cleared > 0) {
          const rewound = yield* self.#replayNamespace(opts, response.serverToken, {
            requestId,
            reason: 'positions above the server',
            lastPulledPosition: basePosition,
            maxPosition: response.maxPosition,
            cleared,
          });
          if (rewound) {
            return { done: false };
          }
        }
        self.#replaying.delete(self.#namespaceKey(opts));
        log.trace('feed sync client pull done (empty batch)', {
          requestId,
          spaceId: opts.spaceId,
          feedNamespace: opts.feedNamespace,
        });
        return { done: true };
      }
      const { displaced } = yield* self.#feedStore.append({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        blocks: response.blocks,
      });
      // The server handed out positions this replica had already given to other blocks, so the
      // server lost them and re-issued them -- along with anything it wrote since, which sits below
      // the cursor and would otherwise never be pulled.
      if (displaced > 0 || cleared > 0) {
        const rewound = yield* self.#replayNamespace(opts, response.serverToken, {
          requestId,
          reason: displaced > 0 ? 'positions re-issued' : 'positions above the server',
          lastPulledPosition: basePosition,
          maxPosition: response.maxPosition,
          displaced,
          cleared,
        });
        if (rewound) {
          return { done: false };
        }
      }

      // Update sync state with the max position from the pulled batch.
      const maxPulledPosition = response.blocks.reduce(
        (max, block) => (block.position != null && block.position > max ? block.position : max),
        basePosition,
      );
      yield* self.#feedStore.setSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        lastPulledPosition: maxPulledPosition,
        serverToken: response.serverToken,
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
  ): Effect.Effect<{ blocksToPull: number }, unknown, SqlClient.SqlClient> {
    const self = this;
    return Effect.gen(function* () {
      const { lastPulledPosition, serverToken } = yield* self.#feedStore.getSyncState({
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
        expectedServerToken: serverToken,
      };
      yield* self.#sendMessage(ctx, self.#withPeerIds(request)).pipe(
        Effect.tapCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
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
  ): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient> {
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
        Effect.tapCause(() => Effect.sync(() => self.#disposeHandler(requestId, cleanupDispose))),
      );
      const message = yield* self.#awaitRpcResponse(requestId, deferred, cleanupDispose, {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        rpcTag: 'AppendRequest',
      });
      const response = yield* self.#expectResponse<AppendResponse>(requestId, message, 'AppendResponse');
      // Pairing a short reply with the batch would leave the tail unpositioned and the push looping
      // without a diagnostic; a responder that assigns no positions is not a position authority.
      if (response.positions.length !== unpositioned.blocks.length) {
        return yield* Effect.fail(
          new Error(
            `AppendResponse carried ${response.positions.length} positions for ${unpositioned.blocks.length} blocks (spaceId=${opts.spaceId} feedNamespace=${opts.feedNamespace} requestId=${requestId}).`,
          ),
        );
      }
      // Positions in the response belong to the responding server, so any stale local ones have to
      // go before they are applied.
      const { lastPulledPosition, serverToken } = yield* self.#feedStore.getSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
      });
      // Reconciling here too means a client that only ever writes still notices the next swap:
      // a first observation with nothing pulled records the token, and a mismatch drops the stale
      // positions before the response's -- which belong to the responding server -- are applied.
      const reconciliation = yield* self.#reconcileServerToken(
        { ...opts, lastPulledPosition },
        serverToken,
        response.serverToken,
      );
      const { displaced } = yield* self.#feedStore.setPosition({
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
        displaced,
      });
      // A block this replica had to push was not on the server, so a position for it at or below
      // the cursor is one the server issued after losing whatever the cursor was pulled from; the
      // same goes for a position another local block already held.
      const cursor = reconciliation === 'unchanged' ? lastPulledPosition : -1;
      const lowestPosition = Math.min(...response.positions);
      if (displaced > 0 || lowestPosition <= cursor) {
        yield* self.#replayNamespace(opts, response.serverToken, {
          requestId,
          reason: displaced > 0 ? 'positions re-issued' : 'position below the cursor',
          lastPulledPosition: cursor,
          lowestPosition,
          displaced,
        });
      }
      return { done: false };
    });
  }

  #namespaceKey(opts: { spaceId: SpaceId; feedNamespace: string }): string {
    return `${opts.spaceId}:${opts.feedNamespace}`;
  }

  /**
   * Rewinds the pull cursor to the start so the namespace is pulled through again, keeping the
   * positions already held: a re-pulled block the replica has at the same position is a no-op, one
   * held elsewhere adopts the server's position, and a block found squatting on a re-issued slot is
   * cleared and pushed again. This is the recovery for a server whose storage was rolled back after
   * it had handed out positions -- unlike a swapped server it keeps its token, so the token check
   * never fires, and without it a replica keeps colliding with the server's re-issued positions
   * forever.
   *
   * Idempotent while the replay runs: every page of a replay can surface another re-issued slot,
   * and restarting on each would pull the namespace once per page.
   */
  #replayNamespace(
    opts: { spaceId: SpaceId; feedNamespace: string },
    serverToken: string | undefined,
    details: Record<string, unknown>,
  ): Effect.Effect<boolean, unknown, SqlClient.SqlClient> {
    const key = this.#namespaceKey(opts);
    if (this.#replaying.has(key)) {
      return Effect.succeed(false);
    }
    this.#replaying.add(key);
    log.warn('feed sync replica ordering is out of step with the serving store, replaying namespace', {
      spaceId: opts.spaceId,
      feedNamespace: opts.feedNamespace,
      ...details,
    });
    return this.#feedStore
      .setSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        lastPulledPosition: -1,
        serverToken,
      })
      .pipe(Effect.as(true));
  }

  /**
   * Reconciles the token the server reports against the one the local sync state was written under,
   * dropping everything derived from a server that is no longer there.
   *
   * - `'unchanged'`: the tokens agree, or the server reports none (it predates the token). A first
   *   token over untokened progress is only recorded: whether that progress came from this server
   *   is settled by the ordering itself -- a replaced server re-issues positions the client holds
   *   or reports a high-water mark below its cursor, and either replays the namespace. Wiping the
   *   namespace on the first token instead made every client re-pull and re-push its whole history
   *   the day the servers started reporting tokens, which is what saturated their sockets.
   * - `'reset'`: they disagree, so the server was swapped or wiped. The request carried the stale
   *   token, so the response already restarts the namespace and the caller applies it as-is. Every
   *   position is dropped: the ordering was another store's, and the blocks are re-pushed.
   */
  #reconcileServerToken(
    opts: { spaceId: SpaceId; feedNamespace: string; lastPulledPosition: number },
    storedToken: string | undefined,
    reportedToken: string | undefined,
  ): Effect.Effect<'unchanged' | 'reset', unknown, SqlClient.SqlClient> {
    const self = this;
    return Effect.gen(function* () {
      if (reportedToken == null || reportedToken === storedToken) {
        return 'unchanged';
      }
      if (storedToken == null) {
        yield* self.#feedStore.setSyncState({
          spaceId: opts.spaceId,
          feedNamespace: opts.feedNamespace,
          lastPulledPosition: opts.lastPulledPosition,
          serverToken: reportedToken,
        });
        return 'unchanged';
      }
      log.warn("feed sync positions are not the serving store's, resyncing namespace from scratch", {
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        storedToken,
        reportedToken,
        lastPulledPosition: opts.lastPulledPosition,
      });
      yield* self.#feedStore.resetSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        serverToken: reportedToken,
      });
      return 'reset';
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
