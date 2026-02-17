//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { type FeedProtocol } from '@dxos/protocols';
import type { SqlTransaction } from '@dxos/sql-sqlite';

import type { FeedStore } from './feed-store';

type AppendRequest = FeedProtocol.AppendRequest;
type ProtocolMessage = FeedProtocol.ProtocolMessage;
type QueryRequest = FeedProtocol.QueryRequest;
type QueryResponse = FeedProtocol.QueryResponse;

export type SyncServerOptions = {
  /** This server's peer id. Set as senderPeerId on all replies. */
  peerId: string;
  feedStore: FeedStore;
  /** Send a protocol message to a client. Receives full message (recipient is set by server). Returns Effect. */
  sendMessage: (message: ProtocolMessage) => Effect.Effect<void, unknown, never>;
};

/**
 * Server-side sync: receives protocol messages, runs query/append against the store, sends responses.
 * Reusable for many peers: sets senderPeerId = peerId and recipientPeerId = incoming message's senderPeerId on replies.
 */
export class SyncServer {
  readonly #peerId: string;
  readonly #feedStore: FeedStore;
  readonly #sendMessage: (message: ProtocolMessage) => Effect.Effect<void, unknown, never>;

  constructor(options: SyncServerOptions) {
    this.#peerId = options.peerId;
    this.#feedStore = options.feedStore;
    this.#sendMessage = options.sendMessage;
  }

  /**
   * Receive a message from a client. Handles QueryRequest and AppendRequest; sends response via sendMessage with correct peer ids.
   */
  handleMessage(
    message: ProtocolMessage,
  ): Effect.Effect<void, unknown, SqlClient.SqlClient | SqlTransaction.SqlTransaction> {
    const self = this;
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
          yield* self.#sendMessage(withPeerIds({ _tag: 'QueryResponse', ...response }));
        }).pipe(
          Effect.catchAll((err: unknown) =>
            self.#sendMessage(
              withPeerIds({
                _tag: 'Error',
                message: err instanceof Error ? err.message : String(err),
              } as Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>),
            ),
          ),
        );
      }
      case 'AppendRequest': {
        const req = message as AppendRequest;
        return Effect.gen(function* () {
          const response = yield* self.#feedStore.append(req);
          yield* self.#sendMessage(withPeerIds({ _tag: 'AppendResponse', ...response }));
        }).pipe(
          Effect.catchAll((err: unknown) =>
            self.#sendMessage(
              withPeerIds({
                _tag: 'Error',
                message: err instanceof Error ? err.message : String(err),
              } as Omit<ProtocolMessage, 'senderPeerId' | 'recipientPeerId'>),
            ),
          ),
        );
      }
      default:
        return Effect.void;
    }
  }
}
