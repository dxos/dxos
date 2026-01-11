import { SpaceId } from '@dxos/keys';
import { Effect, Schema } from 'effect';

export const Block = Schema.Struct({
  /**
   * Unique identifier of the peer that created the block.
   */
  actorId: Schema.String,

  /**
   * Sequence number of the block in the feed.
   */
  sequence: Schema.Number,

  /**
   * Unique identifier of the peer that created the predecessor block.
   */
  predActorId: Schema.NullOr(Schema.String),

  /**
   * Sequence number of the predecessor block.
   */
  predSequence: Schema.NullOr(Schema.Number),

  /**
   * Global position of the block in the replication log.
   * `null` if the block has not been assigned a position yet.
   */
  position: Schema.NullOr(Schema.Number),

  /**
   * Unix timestamp in milliseconds when the block was created.
   */
  timestamp: Schema.Number,

  /**
   * The content of the block.
   */
  data: Schema.Uint8Array,
});
export interface Block extends Schema.Schema.Type<typeof Block> {}

export namespace FeedSyncMessage {
  export interface Base<Type extends string> {
    type: Type;
    spaceId: SpaceId;
    messageId: string;
    replyTo: string | null;
  }

  export interface Request extends Base<'request'> {
    /**
     * Memoized cursor by the other peer.
     * Server stores a cache of cursors that map to a vector of feed positions.
     */
    cursor: string | null;

    /**
     * Vector of feeds to request.
     */
    vector:
      | [
          feedId: string,
          /**
           * Position.
           * Exclusive.
           */
          after: number | null,

          /**
           * Position.
           * Inclusive.
           */
          to: number | null,
        ][]
      | null;
  }

  export interface Sync extends Base<'sync'> {
    feeds: {
      /**
       * Feed intifier. ULID.
       */
      feedId: string;

      /**
       * Last block with position that we have.
       * null if we don't have blocks with position.
       */
      havePosition: number | null;

      /**
       * Blocks that this peer is sending to the other peer.
       * Server sends blocks that have position.
       * Client pushes blocks that don't have position.
       */
      blocks: Block[];

      /**
       * Acks for the blocks this peer has recieved from the other peer.
       * The server will reply with acks when the client pushes data.
       * The clients don't need to send acks to the server.
       */
      acks: {
        actorId: number;
        sequence: number;
        position: number;
      }[];
    }[];
  }

  export interface Error extends Base<'error'> {
    error:
      | {
          type: 'invalid-cursor';
          cursor: string;
        }
      | {
          type: 'unknown';
        };
    message?: string;
  }
}
