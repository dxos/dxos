//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { serviceError } from './service-rpc.ts';
import { mutableArray } from './service-schemas.ts';

//
// RPC message schemas.
//

/**
 * Feed query parameters.
 */
export const FeedQuery = Schema.Struct({
  spaceId: Schema.String,
  feedNamespace: Schema.optional(Schema.String),
  /**
   * Queries the whole space if missing.
   */
  feedIds: Schema.optional(mutableArray(Schema.String)),
  /**
   * Filter items after this cursor. Exclusive.
   */
  after: Schema.optional(Schema.String),
  /**
   * Filter items before this cursor. Exclusive.
   */
  before: Schema.optional(Schema.String),
  /**
   * Filter items after this position. Inclusive.
   * Proto `int64`, represented as a decimal string on the wire.
   */
  beginPosition: Schema.optional(Schema.String),
  /**
   * Filter items before this position. Exclusive.
   * Proto `int64`, represented as a decimal string on the wire.
   */
  endPosition: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
  reverse: Schema.optional(Schema.Boolean),
  // TODO(dmaretskyi): Remove this field -- raw feeds dont index object IDs anymore.
  objectIds: Schema.optional(mutableArray(Schema.String)),
});
export interface FeedQuery extends Schema.Schema.Type<typeof FeedQuery> {}

export const QueryFeedRequest = Schema.Struct({
  query: FeedQuery,
});
export interface QueryFeedRequest extends Schema.Schema.Type<typeof QueryFeedRequest> {}

export const FeedQueryResult = Schema.Struct({
  /**
   * JSON-encoded object payloads. Each entry is a serialized ObjectJSON.
   * We use JSON strings instead of google.protobuf.Struct because Struct
   * coerces `undefined` to `null`, corrupting optional fields.
   */
  objects: Schema.optional(mutableArray(Schema.String)),
  /**
   * Cursor to query the next items. Can be passed to `after` in query to keep querying.
   */
  nextCursor: Schema.String,
  prevCursor: Schema.String,
});
export interface FeedQueryResult extends Schema.Schema.Type<typeof FeedQueryResult> {}

export const InsertIntoFeedRequest = Schema.Struct({
  subspaceTag: Schema.String,
  spaceId: Schema.String,
  feedId: Schema.String,
  /**
   * JSON-encoded object payloads. Each entry is a serialized ObjectJSON.
   */
  objects: Schema.optional(mutableArray(Schema.String)),
});
export interface InsertIntoFeedRequest extends Schema.Schema.Type<typeof InsertIntoFeedRequest> {}

export const DeleteFromFeedRequest = Schema.Struct({
  subspaceTag: Schema.String,
  spaceId: Schema.String,
  feedId: Schema.String,
  objectIds: Schema.optional(mutableArray(Schema.String)),
});
export interface DeleteFromFeedRequest extends Schema.Schema.Type<typeof DeleteFromFeedRequest> {}

export const SyncFeedRequest = Schema.Struct({
  subspaceTag: Schema.String,
  spaceId: Schema.String,
  feedId: Schema.String,
  /**
   * Whether to push local changes to the server. Defaults to true.
   */
  shouldPush: Schema.optional(Schema.Boolean),
  /**
   * Whether to pull remote changes from the server. Defaults to true.
   */
  shouldPull: Schema.optional(Schema.Boolean),
});
export interface SyncFeedRequest extends Schema.Schema.Type<typeof SyncFeedRequest> {}

export const GetSyncStateRequest = Schema.Struct({
  spaceId: Schema.String,
  /**
   * If empty, returns state for all namespaces synced by the client.
   */
  namespaces: Schema.optional(mutableArray(Schema.String)),
});
export interface GetSyncStateRequest extends Schema.Schema.Type<typeof GetSyncStateRequest> {}

export const FeedNamespaceSyncState = Schema.Struct({
  namespace: Schema.String,
  /**
   * Blocks still to pull from remote. 0 when caught up.
   * Proto `int64`, represented as a decimal string on the wire.
   */
  blocksToPull: Schema.String,
  /**
   * Unpositioned blocks still to push to remote. 0 when caught up.
   * Proto `int64`, represented as a decimal string on the wire.
   */
  blocksToPush: Schema.String,
  /**
   * Total blocks stored locally for this namespace in the space.
   * Proto `int64`, represented as a decimal string on the wire.
   */
  totalBlocks: Schema.String,
});
export interface FeedNamespaceSyncState extends Schema.Schema.Type<typeof FeedNamespaceSyncState> {}

export const GetSyncStateResponse = Schema.Struct({
  namespaces: Schema.optional(mutableArray(FeedNamespaceSyncState)),
});
export interface GetSyncStateResponse extends Schema.Schema.Type<typeof GetSyncStateResponse> {}

/**
 * Effect RPC definitions for `dxos.client.services.FeedService`.
 * Service-only payloads use Effect schemas.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('queryFeed', {
    payload: QueryFeedRequest,
    success: FeedQueryResult,
    error: serviceError,
  }),
  Rpc.make('insertIntoFeed', {
    payload: InsertIntoFeedRequest,
    error: serviceError,
  }),
  Rpc.make('deleteFromFeed', {
    payload: DeleteFromFeedRequest,
    error: serviceError,
  }),
  Rpc.make('syncFeed', {
    payload: SyncFeedRequest,
    error: serviceError,
  }),
  Rpc.make('getSyncState', {
    payload: GetSyncStateRequest,
    success: GetSyncStateResponse,
    error: serviceError,
  }),
).prefix('FeedService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
