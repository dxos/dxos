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
});
export interface Block extends Schema.Schema.Type<typeof Block> {}

//
// RPC Schemas
//

export const QueryRequest = Schema.Union(
  Schema.Struct({
    requestId: Schema.String,
    feedIds: Schema.Array(Schema.String),
    cursor: Schema.Number, // Global position cursor
  }),
  Schema.Struct({
    requestId: Schema.String,
    subscriptionId: Schema.String,
    cursor: Schema.Number,
  }),
);
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

// Response is a stream/array of blocks
export const QueryResponse = Schema.Struct({
  requestId: Schema.String,
  blocks: Schema.Array(Block),
});
export interface QueryResponse extends Schema.Schema.Type<typeof QueryResponse> {}

export const SubscribeRequest = Schema.Struct({
  requestId: Schema.String,
  feedIds: Schema.Array(Schema.String),
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const SubscribeResponse = Schema.Struct({
  requestId: Schema.String,
  subscriptionId: Schema.String,
  expiresAt: Schema.Number,
});
export interface SubscribeResponse extends Schema.Schema.Type<typeof SubscribeResponse> {}

export const AppendRequest = Schema.Struct({
  requestId: Schema.String,
  namespace: Schema.optional(Schema.String),
  blocks: Schema.Array(Block),
});
export interface AppendRequest extends Schema.Schema.Type<typeof AppendRequest> {}

export const AppendResponse = Schema.Struct({
  requestId: Schema.String,
  positions: Schema.Array(Schema.Number),
});
export interface AppendResponse extends Schema.Schema.Type<typeof AppendResponse> {}
