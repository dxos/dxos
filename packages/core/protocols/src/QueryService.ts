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
// These are hand-authored Effect schemas rather than `protoMessage(...)` wrappers: encoding the query
// wire through the protobuf codec routes large string fields (notably `QueryResult.documentJson`) through
// `@protobufjs/utf8.read`, which corrupts >8KB strings containing astral characters (emoji, some CJK) by
// injecting a lone surrogate. Effect schemas carry strings verbatim over the structured-clone transport.
// See QueryService.test.ts.
//

/**
 * Index match strategy (`dxos.echo.indexing.IndexKind.Kind`).
 */
export const IndexKindKind = Schema.Enums({
  SCHEMA_MATCH: 0,
  FIELD_MATCH: 1,
  FULL_TEXT: 2,
  VECTOR: 3,
  GRAPH: 4,
});
export type IndexKindKind = Schema.Schema.Type<typeof IndexKindKind>;

export const IndexKind = Schema.Struct({
  kind: IndexKindKind,
  field: Schema.optional(Schema.String),
});
export interface IndexKind extends Schema.Schema.Type<typeof IndexKind> {}

export const IndexConfig = Schema.Struct({
  indexes: Schema.optional(mutableArray(IndexKind)),
  /**
   * Is indexing enabled (FEATURE FLAG).
   * If not set, the default is false.
   */
  enabled: Schema.optional(Schema.Boolean),
});
export interface IndexConfig extends Schema.Schema.Type<typeof IndexConfig> {}

/**
 * Query result delivery mode (`dxos.echo.query.QueryReactivity`).
 */
export const QueryReactivity = Schema.Enums({
  /** Returns a single result. */
  ONE_SHOT: 0,
  /** Returns the initial result and then incremental reactive updates when the data source changes. */
  REACTIVE: 1,
});
export type QueryReactivity = Schema.Schema.Type<typeof QueryReactivity>;

export const QueryRequest = Schema.Struct({
  queryId: Schema.optional(Schema.String),
  reactivity: QueryReactivity,
  /**
   * JSON-encoded `QueryAST.Query`.
   */
  query: Schema.String,
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

export const QueryResult = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  documentId: Schema.optional(Schema.String),
  queueId: Schema.optional(Schema.String),
  queueNamespace: Schema.optional(Schema.String),
  rank: Schema.Number,
  /**
   * In the ECHO JSON object format.
   */
  documentJson: Schema.optional(Schema.String),
  /**
   * JSON-encoded group key (an object keyed by the aggregate's group-field names). Present iff the query has an aggregate clause.
   */
  groupKey: Schema.optional(Schema.String),
  /**
   * Number of records in this record's group within the result set. Present iff the query has an aggregate clause.
   */
  groupCount: Schema.optional(Schema.Number),
});
export interface QueryResult extends Schema.Schema.Type<typeof QueryResult> {}

export const QueryResponse = Schema.Struct({
  queryId: Schema.optional(Schema.String),
  results: Schema.optional(mutableArray(QueryResult)),
});
export interface QueryResponse extends Schema.Schema.Type<typeof QueryResponse> {}

/**
 * Effect RPC definitions for `dxos.echo.query.QueryService`.
 * Payloads use hand-authored Effect schemas (not protobuf) so large string fields survive the wire intact.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('setConfig', {
    payload: IndexConfig,
    error: serviceError,
  }),
  Rpc.make('execQuery', {
    payload: QueryRequest,
    success: QueryResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('reindex', {
    error: serviceError,
  }),
).prefix('QueryService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
