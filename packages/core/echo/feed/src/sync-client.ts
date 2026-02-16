//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';
import { type QueueProtocol } from '@dxos/protocols';
import type { SqlTransaction } from '@dxos/sql-sqlite';

import type { FeedStore } from './feed-store';

type AppendResponse = QueueProtocol.AppendResponse;
type ProtocolMessage = QueueProtocol.ProtocolMessage;
type QueryResponse = QueueProtocol.QueryResponse;
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
  sendMessage: (message: RequestMessage) => Effect.Effect<void, unknown, never>;
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
  readonly #handlers = new Map<string, Deferred.Deferred<ProtocolMessage, Error>>();

  constructor(options: SyncClientOptions) {
    this.#peerId = options.peerId;
    this.#serverPeerId = options.serverPeerId;
    this.#feedStore = options.feedStore;
    this.#sendMessage = options.sendMessage;
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
    if (requestId == null) return Effect.void;
    const deferred = this.#handlers.get(requestId);
    if (deferred == null) return Effect.void;
    this.#handlers.delete(requestId);
    if (message._tag === 'Error') {
      return Effect.andThen(Deferred.fail(deferred, new Error(message.message)), () => Effect.void);
    }
    return Effect.andThen(Deferred.succeed(deferred, message), () => Effect.void);
  }

  pull(opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    limit?: number;
  }): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    return Effect.gen(function* () {
      const lastPulledPosition = yield* self.#feedStore.getSyncState({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
      });
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const request: RequestPayload = {
        _tag: 'QueryRequest',
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        position: lastPulledPosition,
        limit: opts.limit,
      };
      yield* self.#sendMessage(self.#withPeerIds(request));
      const message = yield* Deferred.await(deferred);
      const response = yield* self.#expectResponse<QueryResponse>(requestId, message, 'QueryResponse');
      if (response.blocks.length === 0) {
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

      return { done: false };
    });
  }

  push(opts: {
    spaceId: SpaceId;
    feedNamespace: string;
    limit?: number;
  }): Effect.Effect<{ done: boolean }, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    return Effect.gen(function* () {
      const unpositioned = yield* self.#feedStore.query({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        unpositionedOnly: true,
        limit: opts.limit,
      });
      if (unpositioned.blocks.length === 0) {
        return { done: true };
      }
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const request: RequestPayload = {
        _tag: 'AppendRequest',
        requestId,
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
        blocks: unpositioned.blocks,
      };
      yield* self.#sendMessage(self.#withPeerIds(request));
      const message = yield* Deferred.await(deferred);
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
