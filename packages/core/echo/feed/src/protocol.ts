import { SpaceId } from '@dxos/keys';
import { Effect, Schema } from 'effect';

export const Block = Schema.Struct({
  actorId: Schema.String,
  sequence: Schema.Number,
  predActorId: Schema.NullOr(Schema.String),
  predSequence: Schema.NullOr(Schema.Number),
  position: Schema.NullOr(Schema.Number),
  timestamp: Schema.Number,
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
