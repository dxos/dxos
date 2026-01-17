import { SpaceId } from '@dxos/keys';
import { Schema } from 'effect';

export const Block = Schema.Struct({
  actorId: Schema.String,
  sequence: Schema.Number,
  predActorId: Schema.NullOr(Schema.String),
  predSequence: Schema.NullOr(Schema.Number),
  position: Schema.NullOr(Schema.Number),
  timestamp: Schema.Number,
  data: Schema.Uint8Array,
  /**
   * Local insertion ID.
   * Not replicated.
   */
  insertionId: Schema.optional(Schema.Number),
});
export interface Block extends Schema.Schema.Type<typeof Block> {}

//
// RPC Schemas
//

// Request is a union of query by subscription or query by feedIds
export const QueryRequest = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  // TODO(dmaretskyi): Make required.
  spaceId: Schema.optional(Schema.String),
  query: Schema.Union(
    Schema.Struct({
      feedIds: Schema.Array(Schema.String),
    }),
    Schema.Struct({
      subscriptionId: Schema.String,
    }),
  ),
  /**
   * Get changes following this position (exclusive).
   * Use -1 to get all changes.
   */
  cursor: Schema.Number,
  limit: Schema.optional(Schema.Number),
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

// Response is a stream/array of blocks
export const QueryResponse = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  blocks: Schema.Array(Block),
});
export interface QueryResponse extends Schema.Schema.Type<typeof QueryResponse> {}

export const SubscribeRequest = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  feedIds: Schema.Array(Schema.String),
  spaceId: Schema.optional(Schema.String),
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const SubscribeResponse = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  subscriptionId: Schema.String,
  expiresAt: Schema.Number,
});
export interface SubscribeResponse extends Schema.Schema.Type<typeof SubscribeResponse> {}

export const AppendRequest = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  namespace: Schema.optional(Schema.String),
  blocks: Schema.Array(Block),
  // TODO(dmaretskyi): Make required.
  spaceId: Schema.optional(Schema.String),
  feedId: Schema.optional(Schema.String),
});
export interface AppendRequest extends Schema.Schema.Type<typeof AppendRequest> {}

export const AppendResponse = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  positions: Schema.Array(Schema.Number),
});
export interface AppendResponse extends Schema.Schema.Type<typeof AppendResponse> {}
