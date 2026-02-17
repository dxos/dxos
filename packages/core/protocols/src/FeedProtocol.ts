//
// Copyright 2026 DXOS.org
//

export {
  type QueueService,
  type QueueQuery,
  type QueueQueryResult as QueryResult,
  type QueryQueueRequest,
  type InsertIntoQueueRequest,
  type DeleteFromQueueRequest,
} from './proto/gen/dxos/client/services.js';

export const KEY_QUEUE_POSITION = 'dxos.org/key/queue-position';

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

import { EdgeService } from './edge/edge.js';

/**
 * Opaque pagination cursor for feed queries.
 */
export const FeedCursor = Schema.String.pipe(Schema.brand('@dxos/feed/FeedCursor'));
export type FeedCursor = Schema.Schema.Type<typeof FeedCursor>;

/**
 * Replicated queue block payload and ordering metadata.
 */
export const Block = Schema.Struct({
  /**
   * Appears on blocks returned from query.
   */
  feedId: Schema.UndefinedOr(Schema.String),

  /**
   * Actor that produced this block.
   */
  actorId: Schema.String,

  /**
   * Per-feed monotonic sequence assigned by the actor.
   */
  sequence: Schema.Number,

  /**
   * Actor of the immediate predecessor block, if any.
   */
  predActorId: Schema.NullOr(Schema.String),

  /**
   * Sequence of the immediate predecessor block, if any.
   */
  predSequence: Schema.NullOr(Schema.Number),

  /**
   * Globally ordered position assigned by a position authority.
   * Unlike `sequence` (per-feed causal order), this enables merged incremental reads across feeds.
   */
  position: Schema.NullOr(Schema.Number),

  /**
   * Milliseconds since Unix epoch when the block was created.
   */
  timestamp: Schema.Number,

  /**
   * Serialized application payload.
   */
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

/**
 * Query parameters for retrieving blocks from one namespace in one space.
 */
export const QueryRequest = Schema.Struct({
  /**
   * Optional request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Target space identifier.
   */
  spaceId: SpaceId,

  /**
   * Feed namespace to query.
   */
  feedNamespace: Schema.String,

  query: Schema.optional(
    Schema.Union(
      Schema.Struct({
        /**
         * Explicit list of feed IDs to read from.
         */
        feedIds: Schema.Array(Schema.String),
      }),
      Schema.Struct({
        /**
         * Existing subscription to resolve feed IDs from.
         */
        subscriptionId: Schema.String,
      }),
    ),
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
   * Only return blocks that are not positioned.
   *
   * Must not be used with `cursor` or `position`.
   */
  unpositionedOnly: Schema.optional(Schema.Boolean),

  /**
   * Maximum number of blocks to return.
   */
  limit: Schema.optional(Schema.Number),
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

/**
 * Result payload for a query operation.
 */
export const QueryResponse = Schema.Struct({
  /**
   * Echoed request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Cursor to continue reading from this result boundary.
   */
  nextCursor: FeedCursor,

  /**
   * Indicates whether more matching blocks are available.
   */
  hasMore: Schema.Boolean,

  /**
   * Returned blocks for the current page.
   */
  blocks: Schema.Array(Block),
});
export interface QueryResponse extends Schema.Schema.Type<typeof QueryResponse> {}

/**
 * Parameters for creating or refreshing a feed subscription.
 */
export const SubscribeRequest = Schema.Struct({
  /**
   * Optional request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Optional space scope for the subscription.
   */
  spaceId: Schema.optional(Schema.String),

  /**
   * Feeds to include in the subscription.
   */
  feedIds: Schema.Array(Schema.String),
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

/**
 * Response payload for subscription creation.
 */
export const SubscribeResponse = Schema.Struct({
  /**
   * Echoed request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Identifier to use in subsequent subscription queries.
   */
  subscriptionId: Schema.String,

  /**
   * Expiration timestamp in milliseconds since Unix epoch.
   */
  expiresAt: Schema.Number,
});
export interface SubscribeResponse extends Schema.Schema.Type<typeof SubscribeResponse> {}

/**
 * Request payload for appending one or more blocks.
 */
export const AppendRequest = Schema.Struct({
  /**
   * Optional request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Target space identifier.
   */
  spaceId: Schema.String,

  /**
   * Namespace that all appended blocks belong to.
   */
  feedNamespace: Schema.String,

  /**
   * Blocks to append.
   */
  blocks: Schema.Array(Block),
});
export interface AppendRequest extends Schema.Schema.Type<typeof AppendRequest> {}

/**
 * Result payload for append operations.
 */
export const AppendResponse = Schema.Struct({
  /**
   * Echoed request correlation identifier.
   */
  requestId: Schema.optional(Schema.String),

  /**
   * Assigned global positions for appended blocks.
   */
  positions: Schema.Array(Schema.Number),
});
export interface AppendResponse extends Schema.Schema.Type<typeof AppendResponse> {}

/**
 * Tagged transport message union for queue protocol RPC traffic.
 */
export const ProtocolMessage = Schema.Union(
  Schema.TaggedStruct('QueryRequest', QueryRequest.fields),
  Schema.TaggedStruct('QueryResponse', QueryResponse.fields),
  Schema.TaggedStruct('SubscribeRequest', SubscribeRequest.fields),
  Schema.TaggedStruct('SubscribeResponse', SubscribeResponse.fields),
  Schema.TaggedStruct('AppendRequest', AppendRequest.fields),
  Schema.TaggedStruct('AppendResponse', AppendResponse.fields),
  Schema.TaggedStruct('Error', {
    /**
     * Human-readable error message.
     */
    message: Schema.String,
  }),
).pipe(
  Schema.extend(
    Schema.Struct({
      senderPeerId: Schema.UndefinedOr(Schema.String),
      /**
       * Could be undefined if the recipient could be assumed from the context.
       */
      recipientPeerId: Schema.UndefinedOr(Schema.String),
    }),
  ),
);
export type ProtocolMessage = Schema.Schema.Type<typeof ProtocolMessage>;

/**
 * Reserved namespaces with protocol-level semantics.
 */
export const WellKnownNamespaces = {
  data: 'data',
  trace: 'trace',
} as const;

export const isWellKnownNamespace = (namespace: string) =>
  Object.values(WellKnownNamespaces).includes(namespace as any);

/**
 * Encodes queue replicator service identifier as `<service>:<namespace>:<spaceId>`.
 */
export const encodeServiceId = (namespace: string, spaceId: SpaceId) =>
  `${EdgeService.QUEUE_REPLICATOR}:${namespace}:${spaceId}`;

/**
 * Decodes and validates queue replicator service identifier.
 */
export const decodeServiceId = (
  serviceId: string,
): { namespace: keyof typeof WellKnownNamespaces; spaceId: SpaceId } => {
  const [service, namespace, spaceId] = serviceId.split(':');
  invariant(service === EdgeService.QUEUE_REPLICATOR, `Invalid service: ${service}`);
  invariant(isWellKnownNamespace(namespace), `Invalid namespace: ${namespace}`);
  invariant(SpaceId.isValid(spaceId), `Invalid spaceId: ${spaceId}`);
  return { namespace: namespace as keyof typeof WellKnownNamespaces, spaceId };
};
