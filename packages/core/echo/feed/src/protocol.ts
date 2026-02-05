//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { SpaceId } from '@dxos/keys';

export const FeedCursor = Schema.String.pipe(Schema.brand('@dxos/feed/FeedCursor'));
export type FeedCursor = Schema.Schema.Type<typeof FeedCursor>;

export const Block = Schema.Struct({
  /**
   * Appears on blocks returned from query.
   */
  feedId: Schema.UndefinedOr(Schema.String),

  /**
   * Appears on blocks returned from query.
   */
  feedNamespace: Schema.UndefinedOr(Schema.String),

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
  // TODO(dmaretskyi): Remove. Use cursors.
  insertionId: Schema.optional(Schema.Number),
});
export interface Block extends Schema.Schema.Type<typeof Block> {}

//
// RPC Schemas
//

// Request is a union of query by subscription or query by feedIds
export const QueryRequest = Schema.Struct({
  requestId: Schema.optional(Schema.String),

  spaceId: SpaceId,

  query: Schema.Union(
    Schema.Struct({
      feedIds: Schema.Array(Schema.String),
    }),
    Schema.Struct({
      subscriptionId: Schema.String,
    }),
    Schema.Struct({
      feedNamespace: Schema.optional(Schema.String),
    }),
  ),
  /**
   * Get changes following this cursor (exclusive).
   *
   * Must not be used with `position`.
   */
  cursor: Schema.optional(FeedCursor),

  /**
   * Get changes following this position.
   * Returned blocks have strictly greater position than this.
   *
   * Must not be used with `cursor`.
   */
  position: Schema.optional(Schema.Number),

  /**
   * Only return blocks that are not positionned.
   *
   * Must not be used with `cursor` or `position`.
   */
  unpositionedOnly: Schema.optional(Schema.Boolean),

  limit: Schema.optional(Schema.Number),
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

// Response is a stream/array of blocks
export const QueryResponse = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  nextCursor: FeedCursor,
  hasMore: Schema.Boolean,
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

  spaceId: Schema.String,

  blocks: Schema.Array(Block),
});
export interface AppendRequest extends Schema.Schema.Type<typeof AppendRequest> {}

export const AppendResponse = Schema.Struct({
  requestId: Schema.optional(Schema.String),
  positions: Schema.Array(Schema.Number),
});
export interface AppendResponse extends Schema.Schema.Type<typeof AppendResponse> {}

export const ProtocolMessage = Schema.Union(
  Schema.TaggedStruct('QueryRequest', QueryRequest.fields),
  Schema.TaggedStruct('QueryResponse', QueryResponse.fields),
  Schema.TaggedStruct('SubscribeRequest', SubscribeRequest.fields),
  Schema.TaggedStruct('SubscribeResponse', SubscribeResponse.fields),
  Schema.TaggedStruct('AppendRequest', AppendRequest.fields),
  Schema.TaggedStruct('AppendResponse', AppendResponse.fields),
  Schema.TaggedStruct('Error', {
    message: Schema.String,
  }),
);
export type ProtocolMessage = Schema.Schema.Type<typeof ProtocolMessage>;

export const WellKnownNamespaces = {
  data: 'data',
  trace: 'trace',
} as const;

export const isWellKnownNamespace = (namespace: string) =>
  Object.values(WellKnownNamespaces).includes(namespace as any);
