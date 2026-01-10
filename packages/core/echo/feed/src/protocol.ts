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

export interface FeedSyncMessage {
  spaceId: SpaceId;

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
   * Requested range of blocks.
   * Clients send this to the server and the server replies with blocks in this range.
   */
  requestRange: {
    /**
     * Position.
     * Exclusive.
     */
    after: number | null;

    /**
     * Position.
     * Inclusive.
     */
    to: number | null;
  };

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
}
