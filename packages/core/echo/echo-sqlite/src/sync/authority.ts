//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';

import { Context } from '@dxos/context';
import { FeedStore, SyncServer } from '@dxos/feed';
import { FeedProtocol } from '@dxos/protocols';

import { AUTHORITY_PEER_ID } from './protocol.ts';

export type SpaceAuthorityOptions = {
  /** Delivers a message to one connected client. */
  send: (connectionId: string, message: FeedProtocol.ProtocolMessage) => void;
  /** Every connected client, so an append can be announced to the others. */
  connections: () => Iterable<string>;
};

/**
 * The authority for one space: the feed store that positions every block, answering the clients'
 * pulls and pushes. It reads block metadata only and never loads a block's data. Transport-agnostic:
 * a Durable Object feeds it socket frames, tests feed it in-memory messages.
 */
export class SpaceAuthority {
  readonly #feedStore = new FeedStore({ localActorId: AUTHORITY_PEER_ID, assignPositions: true });
  readonly #options: SpaceAuthorityOptions;

  constructor(options: SpaceAuthorityOptions) {
    this.#options = options;
  }

  get feedStore(): FeedStore {
    return this.#feedStore;
  }

  migrate(): Effect.Effect<void, unknown, SqlClient.SqlClient> {
    return this.#feedStore.migrate();
  }

  /**
   * Handles one message from a client. A push that appended blocks is announced to every other
   * client as `FeedAdvanced`, which they answer by pulling.
   */
  handle(
    connectionId: string,
    message: FeedProtocol.ProtocolMessage,
  ): Effect.Effect<void, unknown, SqlClient.SqlClient> {
    const options = this.#options;
    const server = new SyncServer({
      peerId: AUTHORITY_PEER_ID,
      feedStore: this.#feedStore,
      sendMessage: (_ctx, reply) =>
        Effect.sync(() => {
          options.send(connectionId, reply);
          if (reply._tag === 'AppendResponse' && message._tag === 'AppendRequest' && reply.positions.length > 0) {
            const advanced: FeedProtocol.ProtocolMessage = {
              _tag: 'FeedAdvanced',
              senderPeerId: AUTHORITY_PEER_ID,
              recipientPeerId: undefined,
              spaceId: message.spaceId,
              feedNamespace: message.feedNamespace,
              position: Math.max(...reply.positions),
            };
            for (const other of options.connections()) {
              if (other !== connectionId) {
                options.send(other, advanced);
              }
            }
          }
        }),
    });
    return server.handleMessage(Context.default(), message);
  }
}
