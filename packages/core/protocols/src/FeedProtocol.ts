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
 * Natural key of a block: the tuple that names the same block in every store, whatever position
 * each store holds it at.
 */
export const BlockKey = Schema.Struct({
  feedId: Schema.String,
  actorId: Schema.String,
  sequence: Schema.Number,
});
export interface BlockKey extends Schema.Schema.Type<typeof BlockKey> {}

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

  /**
   * Highest position the serving store holds in the queried namespace, or -1 when it holds none.
   *
   * A client whose pull cursor is above this is caching an ordering the store has lost -- its
   * storage was rolled back, and it will re-issue those positions to other blocks -- so nothing
   * above the cursor will ever arrive and everything written since sits below it. Only set by a
   * position authority; absent on responses from servers that predate the field.
   */
  maxPosition: Schema.optional(Schema.Number),

  /**
   * Key of the block the serving store holds at the requested `position`, or `null` when it holds
   * none there.
   *
   * A client holding a different block at its cursor is caching an ordering the store has lost: its
   * storage was rolled back and has since been written past the cursor, so neither `maxPosition`
   * nor the blocks above the cursor reveal it. Only set by a position authority answering a
   * `position` at or above 0; absent on responses from servers that predate the field.
   */
  cursorBlock: Schema.optional(Schema.NullOr(BlockKey)),
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

  /**
   * Namespace the subscription covers. When set with an empty `feedIds`, the subscription is
   * namespace-wide — the client does not learn feed ids until it pulls, so it cannot enumerate
   * them at subscribe time.
   */
  feedNamespace: Schema.optional(Schema.String),
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
 * Server-initiated notification that a namespace has gained blocks beyond `position`.
 *
 * Carries no block data: the recipient re-pulls through the ordinary cursor path, so a hint that is
 * dropped, duplicated or reordered costs latency rather than correctness. Sending blocks here
 * instead would duplicate the position and `serverToken` reconciliation that `pull` already owns,
 * and would make an undelivered frame a consistency problem rather than a slow one.
 */
export const FeedAdvanced = Schema.Struct({
  /**
   * Space the advanced namespace belongs to.
   */
  spaceId: Schema.String,

  /**
   * Namespace that gained blocks.
   */
  feedNamespace: Schema.String,

  /**
   * Highest position the server holds for the namespace, when known. Advisory only — the recipient
   * compares it against its own cursor to skip a redundant pull, and pulls regardless if absent.
   */
  position: Schema.optional(Schema.Number),
});
export interface FeedAdvanced extends Schema.Schema.Type<typeof FeedAdvanced> {}

/**
 * Machine-readable reasons an `Error` reply may carry, for a caller to act on rather than retry.
 */
export const ErrorCode = {
  /** The space no longer exists on the server, so nothing addressed to it will ever be answered. */
  SPACE_DELETED: 'space_deleted',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

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
  Schema.TaggedStruct('FeedAdvanced', FeedAdvanced.fields),
  Schema.TaggedStruct('Error', {
    /**
     * Correlation identifier of the request that failed, so the caller can fail that request at
     * once instead of waiting out its timeout. Absent from servers that predate the field.
     */
    requestId: Schema.optional(Schema.String),

    /**
     * Human-readable error message.
     */
    message: Schema.String,

    /**
     * One of {@link ErrorCode}, when the caller should act on the failure instead of retrying it.
     * Typed as a string so a client decodes a code it does not know yet and treats the reply as an
     * ordinary error.
     */
    code: Schema.optional(Schema.String),
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
 * EDGE cannot call this until it pins a build that contains it: the published `@dxos/protocols` it
 * currently runs reads the two segments positionally and throws on the space-id-first encoding. It
 * therefore carries its own `decodeQueueServiceId` (dxos/edge#1021), which this function replaces.
 *
 * TODO(DX-1152): once EDGE bumps `@dxos/protocols` to a build carrying this, delete its
 *   `decodeQueueServiceId` and call this from `router.ts` again.
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
