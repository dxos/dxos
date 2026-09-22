//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

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
export const IndexKindKind = Schema.Enum({
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
export const QueryReactivity = Schema.Enum({
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
  /**
   * JSON-encoded map of aggregate name to scalar value. Present iff this record stands for a whole
   * group rather than one object: the query declared no `items` aggregate, so the host collapsed the
   * group and no object fields (`documentJson`, `documentId`, `queueId`) are sent; `id` is then the
   * serialized group key.
   */
  aggregates: Schema.optional(Schema.String),
});
export interface QueryResult extends Schema.Schema.Type<typeof QueryResult> {}

export const QueryResponse = Schema.Struct({
  queryId: Schema.optional(Schema.String),
  results: Schema.optional(mutableArray(QueryResult)),
});
export interface QueryResponse extends Schema.Schema.Type<typeof QueryResponse> {}

/**
 * One entity as the client holds it in its in-process registry.
 */
export const RegistryEntry = Schema.Struct({
  /**
   * The entity in the ECHO JSON object format.
   *
   * The whole entry: the host reads the entity's own `@meta` to file it, so there is no key on the
   * wire for a client to compose — and no second source of truth for what an entity is called.
   * Two versions of one entity are two identities, and so two index entries; a re-registration of
   * one identity replaces it.
   */
  objectJson: Schema.String,
});
export interface RegistryEntry extends Schema.Schema.Type<typeof RegistryEntry> {}

/**
 * The client's registry, whole. A snapshot rather than a delta: the registry is small and is
 * rebuilt from code on every start, so sending all of it lets the host diff by content digest and
 * removes the need to track removals on the client.
 */
export const RegistryUpdateRequest = Schema.Struct({
  /**
   * Identifies the client this snapshot describes. Several clients (browser tabs, workers) share
   * one host, so the host holds the union of their registries and only drops an entry once no
   * client still carries it — without this, each client's snapshot would delete the others'.
   */
  clientId: Schema.String,
  entries: mutableArray(RegistryEntry),
  /**
   * The client is going away, so this empty snapshot withdraws its claim rather than unregistering
   * the entities. The host drops the client's ownership but keeps the rows: they are a durable
   * cache that the next session re-adopts by digest, and reclaiming them on every clean shutdown
   * would re-index the whole registry at each boot. Rows no client re-adopts are reclaimed by the
   * reconciliation on the first snapshot of the next host session.
   */
  releasing: Schema.optional(Schema.Boolean),
});
export interface RegistryUpdateRequest extends Schema.Schema.Type<typeof RegistryUpdateRequest> {}

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
  Rpc.make('updateRegistry', {
    payload: RegistryUpdateRequest,
    error: serviceError,
  }),
).prefix('QueryService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `QueryService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/QueryService') {}
