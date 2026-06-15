//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';
import type { SqlTransaction } from '@dxos/sql-sqlite';

import type { FeedStore } from './feed-store';

type AppendRequest = FeedProtocol.AppendRequest;
type ProtocolMessage = FeedProtocol.ProtocolMessage;
type QueryRequest = FeedProtocol.QueryRequest;
type QueryResponse = FeedProtocol.QueryResponse;

const inboundSummary = (message: ProtocolMessage) => ({
  tag: message._tag,
  senderPeerId: message.senderPeerId,
  recipientPeerId: message.recipientPeerId,
  requestId: 'requestId' in message ? message.requestId : undefined,
  spaceId: 'spaceId' in message ? message.spaceId : undefined,
  feedNamespace: 'feedNamespace' in message ? message.feedNamespace : undefined,
  blockCount: 'blocks' in message ? message.blocks.length : undefined,
  position: 'position' in message ? message.position : undefined,
  limit: 'limit' in message ? message.limit : undefined,
});

export type SyncServerOptions = {
  /** This server's peer id. Set as senderPeerId on all replies. */
  peerId: string;
  feedStore: FeedStore;
  /** Send a protocol message to a client. Receives full message (recipient is set by server). Returns Effect. */
  sendMessage: (ctx: Context, message: ProtocolMessage) => Effect.Effect<void, unknown, never>;
};

/**
 * Server-side sync: receives protocol messages, runs query/append against the store, sends responses.
 * Reusable for many peers: sets senderPeerId = peerId and recipientPeerId = incoming message's senderPeerId on replies.
 */
export class SyncServer {
  readonly #peerId: string;
  readonly #feedStore: FeedStore;
  readonly #sendMessage: SyncServerOptions['sendMessage'];

  constructor(options: SyncServerOptions) {
    this.#peerId = options.peerId;
    this.#feedStore = options.feedStore;
    this.#sendMessage = options.sendMessage;
  }

  /**
   * Receive a message from a client. Handles QueryRequest and AppendRequest; sends response via sendMessage with correct peer ids.
   */
  handleMessage(
    ctx: Context,
    message: ProtocolMessage,
  ): Effect.Effect<void, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
    log('feed sync server received message', {
      peerId: self.#peerId,
      ...inboundSummary(message),
    });
    const recipientPeerId = message.senderPeerId;
    const withPeerIds = (payload: Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>): ProtocolMessage =>
      ({
        ...payload,
        senderPeerId: self.#peerId,
        recipientPeerId,
      }) as ProtocolMessage;
    switch (message._tag) {
      case 'QueryRequest': {
        const req = message as QueryRequest;
        return Effect.gen(function* () {
          const response: QueryResponse = yield* self.#feedStore.query(req);
          log('feed sync server query completed', {
            peerId: self.#peerId,
            recipientPeerId,
            requestId: req.requestId,
            spaceId: req.spaceId,
            feedNamespace: req.feedNamespace,
            returnedBlocks: response.blocks.length,
            hasMore: response.hasMore,
          });
          yield* self.#sendMessage(ctx, withPeerIds({ _tag: 'QueryResponse', ...response }));
        }).pipe(
          Effect.catchAll((err: unknown) => {
            log('feed sync server query failed', {
              peerId: self.#peerId,
              recipientPeerId,
              requestId: req.requestId,
              spaceId: req.spaceId,
              feedNamespace: req.feedNamespace,
              cause: err instanceof Error ? err.message : String(err),
            });
            return self.#sendMessage(
              ctx,
              withPeerIds({
                _tag: 'Error',
                message: err instanceof Error ? err.message : String(err),
              } as Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>),
            );
          }),
        );
      }
      case 'AppendRequest': {
        const req = message as AppendRequest;
        return Effect.gen(function* () {
          const response = yield* self.#feedStore.append(req);
          log('feed sync server append completed', {
            peerId: self.#peerId,
            recipientPeerId,
            requestId: req.requestId,
            spaceId: req.spaceId,
            feedNamespace: req.feedNamespace,
            blockCount: req.blocks.length,
            assignedPositions: response.positions.length,
          });
          yield* self.#sendMessage(ctx, withPeerIds({ _tag: 'AppendResponse', ...response }));
        }).pipe(
          Effect.catchAll((err: unknown) => {
            log('feed sync server append failed', {
              peerId: self.#peerId,
              recipientPeerId,
              requestId: req.requestId,
              spaceId: req.spaceId,
              feedNamespace: req.feedNamespace,
              blockCount: req.blocks.length,
              cause: err instanceof Error ? err.message : String(err),
            });
            return self.#sendMessage(
              ctx,
              withPeerIds({
                _tag: 'Error',
                message: err instanceof Error ? err.message : String(err),
              } as Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>),
            );
          }),
        );
      }
      default:
        log('feed sync server ignoring unsupported message', {
          peerId: self.#peerId,
          tag: message._tag,
        });
        return Effect.void;
    }
  }
}
