//
// Copyright 2026 DXOS.org
//

export {
  type DeleteFromFeedRequest,
  type FeedNamespaceSyncState,
  type FeedQuery,
  type GetSyncStateRequest,
  type GetSyncStateResponse,
  type InsertIntoFeedRequest,
  type QueryFeedRequest,
  type FeedQueryResult as QueryResult,
  type SyncFeedRequest,
} from './FeedService.ts';

export const KEY_QUEUE_POSITION = 'org.dxos.key.queue-position';

import * as Schema from 'effect/Schema';
import * as Tuple from 'effect/Tuple';

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
  prevActorId: Schema.NullOr(Schema.String),

  /**
   * Sequence of the immediate predecessor block, if any.
   */
  prevSequence: Schema.NullOr(Schema.Number),

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
   * Serialized application payload. Ciphertext when a cypher sealed the block (see `encryptionKeyId`).
   */
  data: Schema.Uint8Array,

  /**
   * Hex-encoded public key naming the key that sealed `data`, when the block is encrypted at rest.
   * Absent on plaintext blocks.
   */
  encryptionKeyId: Schema.optional(Schema.String),

  /**
   * 96-bit GCM nonce used to seal `data`. Present iff `encryptionKeyId` is.
   */
  iv: Schema.optional(Schema.Uint8Array),

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
    Schema.Union([
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
    ]),
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

  /**
   * Token identifying the store the client believes it is talking to, as last reported in
   * {@link QueryResponse.serverToken}.
   *
   * When it does not match the serving store's own token — the server was swapped or its storage
   * wiped — every `position` the client remembers names a slot in a store that no longer exists, so
   * the server ignores `position` and serves the namespace from the start. That keeps recovery to
   * the same single round-trip as an ordinary pull. Omitted by clients that predate the token, for
   * which the server keeps honouring `position` verbatim.
   */
  expectedServerToken: Schema.optional(Schema.String),
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

  /**
   * Identity of the store that assigned the positions in this response. Stable for the life of the
   * store's storage and regenerated when that storage is recreated, which is how a client detects
   * that its remembered positions are no longer meaningful.
   *
   * Only set by a position authority (a server); absent on responses from a store that does not
   * assign positions, and on responses from servers that predate the token.
   */
  serverToken: Schema.optional(Schema.String),
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

  /**
   * Identity of the store that assigned `positions`. See {@link QueryResponse.serverToken}.
   */
  serverToken: Schema.optional(Schema.String),
});
export interface AppendResponse extends Schema.Schema.Type<typeof AppendResponse> {}

/**
 * Tagged transport message union for queue protocol RPC traffic.
 *
 * The routing envelope is distributed over the members with `mapMembers`, which is what Effect 4
 * replaced the union-distributing `Schema.extend` with.
 */
export const ProtocolMessage = Schema.Union([
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
]).mapMembers(
  Tuple.map(
    Schema.fieldsAssign({
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
 * Encodes queue replicator service identifier as `<service>:<spaceId>:<namespace>`.
 *
 * The space id comes first, matching every other replicator (`<service>:<spaceId>`). It used to
 * come second, which meant EDGE could not read the addressed space at a shared segment index and
 * fell back to a KV lookup per frame on its highest-volume path.
 */
export const encodeServiceId = (namespace: string, spaceId: SpaceId) =>
  `${EdgeService.QUEUE_REPLICATOR}:${spaceId}:${namespace}`;

/**
 * Decodes and validates queue replicator service identifier.
 *
 * Accepts the legacy `<service>:<namespace>:<spaceId>` ordering as well, since clients on the old
 * encoding stay in the field until Composer production has rolled over. The two are told apart by
 * which segment is a valid space id, so neither needs a version marker.
 *
 * TODO(DX-1152): drop the legacy ordering once the space-id-first encoding has reached Composer
 *   production, along with the matching fallback in EDGE's `resolveServiceSpaceId`.
 */
export const decodeServiceId = (
  serviceId: string,
): { namespace: keyof typeof WellKnownNamespaces; spaceId: SpaceId } => {
  const [service, first, second] = serviceId.split(':');
  invariant(service === EdgeService.QUEUE_REPLICATOR, `Invalid service: ${service}`);
  const [namespace, spaceId] = SpaceId.isValid(first) ? [second, first] : [first, second];
  invariant(isWellKnownNamespace(namespace), `Invalid namespace: ${namespace}`);
  invariant(SpaceId.isValid(spaceId), `Invalid spaceId: ${spaceId}`);
  return { namespace: namespace as keyof typeof WellKnownNamespaces, spaceId };
};
