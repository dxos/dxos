//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type { SpaceId } from '@dxos/keys';
import type { SqlTransaction } from '@dxos/sql-sqlite';
import { Array } from 'effect';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import type { FeedStore } from './feed-store';
import type { AppendRequest, AppendResponse, ProtocolMessage, QueryRequest, QueryResponse } from './protocol';

export type SyncClientOptions = {
  /** This client's peer id. Set as senderPeerId on all requests. */
  peerId: string;
  feedStore: FeedStore;
  /** Send a protocol message to the server. Returns Effect. */
  sendMessage: (message: ProtocolMessage) => Effect.Effect<void, unknown, never>;
};

/**
 * Client-side sync: pull/push by sending protocol messages and handling responses.
 * Sets senderPeerId = peerId and recipientPeerId = serverPeerId on all requests.
 * Uses a map of requestId -> Deferred to match responses to in-flight requests.
 * handleMessage completes the Deferred for the requestId (if any) and removes the handler; no handler = noop.
 */
export class SyncClient {
  readonly #peerId: string;
  readonly #feedStore: FeedStore;
  readonly #sendMessage: (message: ProtocolMessage) => Effect.Effect<void, unknown, never>;
  readonly #handlers = new Map<string, Deferred.Deferred<ProtocolMessage, Error>>();

  constructor(options: SyncClientOptions) {
    this.#peerId = options.peerId;
    this.#feedStore = options.feedStore;
    this.#sendMessage = options.sendMessage;
  }

  #withPeerIds(payload: Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>): ProtocolMessage {
    return {
      ...payload,
      senderPeerId: this.#peerId,
      recipientPeerId: undefined,
    } as ProtocolMessage;
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
      const maxPosition = yield* self.#feedStore.getMaxPosition({
        spaceId: opts.spaceId,
        feedNamespace: opts.feedNamespace,
      });
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const request: QueryRequest = {
        requestId,
        spaceId: opts.spaceId,
        query: { feedNamespace: opts.feedNamespace },
        position: maxPosition,
        limit: opts.limit,
      };
      yield* self.#sendMessage(self.#withPeerIds({ _tag: 'QueryRequest', ...request }));
      const message = yield* Deferred.await(deferred);
      const response = yield* self.#expectResponse<QueryResponse>(requestId, message, 'QueryResponse');
      if (response.blocks.length === 0) {
        return { done: true };
      }
      yield* self.#feedStore.append({
        spaceId: opts.spaceId,
        blocks: response.blocks,
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
        query: { feedNamespace: opts.feedNamespace },
        unpositionedOnly: true,
        limit: opts.limit,
      });
      if (unpositioned.blocks.length === 0) {
        return { done: true };
      }
      const requestId = crypto.randomUUID();
      const deferred = yield* Deferred.make<ProtocolMessage, Error>();
      self.#handlers.set(requestId, deferred);
      const request: AppendRequest = {
        requestId,
        spaceId: opts.spaceId,
        blocks: unpositioned.blocks,
      };
      yield* self.#sendMessage(self.#withPeerIds({ _tag: 'AppendRequest', ...request }));
      const message = yield* Deferred.await(deferred);
      const response = yield* self.#expectResponse<AppendResponse>(requestId, message, 'AppendResponse');
      yield* self.#feedStore.setPosition({
        spaceId: opts.spaceId,
        blocks: Array.zipWith(response.positions, unpositioned.blocks, (position, block) => ({
          feedId: block.feedId,
          feedNamespace: block.feedNamespace,
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
