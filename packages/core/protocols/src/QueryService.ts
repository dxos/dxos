//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
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
  /** The client's data subscriptions: rows of documents they hold ship without their JSON and stored changes. */
  subscriptionIds: Schema.optional(mutableArray(Schema.String)),
});
export interface QueryRequest extends Schema.Schema.Type<typeof QueryRequest> {}

/**
 * The state the index evaluated a row at: a document's heads, or a feed block's position. Equal heads mean
 * the client holds exactly what the index evaluated, so its own re-check would reproduce the verdict.
 */
export const RowVersion = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('automerge'),
    documentId: Schema.String,
    heads: mutableArray(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal('feed'),
    /** The block's global position; the primary order of feed versions. */
    insertionId: Schema.Number,
  }),
]);
export type RowVersion = Schema.Schema.Type<typeof RowVersion>;

/**
 * One hop of a traversal the index took to reach a row. `holder` is the object whose document records the
 * edge (the `from` side for a reference or a parent pointer, the `to` side for an incoming reference or a
 * child, the relation for a relation endpoint), so the client re-checks the edge against that document.
 */
export const PathEdge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  kind: Schema.Literals(['ref', 'incoming-ref', 'relation-source', 'relation-target', 'parent', 'child']),
  /** The reference's property path, escaped; absent for an edge that is not a reference. */
  property: Schema.optional(Schema.String),
  holder: Schema.String,
  /** The holder's heads when the index read the edge; equal local heads skip the re-check. */
  holderHeads: Schema.optional(mutableArray(Schema.String)),
});
export type PathEdge = Schema.Schema.Type<typeof PathEdge>;

/**
 * One member's share of a collapsed group's scalar aggregates, so a client can replace the share of a
 * member it holds with its local value instead of trusting a count or sum that predates its write.
 */
export const ManifestEntry = Schema.Struct({
  id: Schema.String,
  version: Schema.optional(RowVersion),
  /** JSON-encoded map of aggregate name to this member's value: 1 for a count, the property for the rest. */
  contribution: Schema.String,
});
export type ManifestEntry = Schema.Schema.Type<typeof ManifestEntry>;

export const QueryResult = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  documentId: Schema.optional(Schema.String),
  queueId: Schema.optional(Schema.String),
  queueNamespace: Schema.optional(Schema.String),
  rank: Schema.Number,
  /**
   * In the ECHO JSON object format. Sent for a feed row, and for a document row the client can back
   * with {@link heads} and {@link bytes}.
   */
  // TODO(dmaretskyi): Rename to `objectJson` — it holds one object's JSON, not the document's — as the boot cache's `WorkingSetRow` does.
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
  /**
   * JSON-encoded plain record for a result that is not an entity (an Automerge change selected by
   * `Filter.changes`); no object fields are sent, and `id` is the record's own identity.
   */
  recordJson: Schema.optional(Schema.String),
  /** Heads of the document the index read a document row's {@link documentJson} at. */
  heads: Schema.optional(mutableArray(Schema.String)),
  /**
   * The document's Automerge bytes as storage holds them, which may be ahead of {@link heads}; sent with
   * {@link documentJson} for a document that holds only this object. The client loads them when it first
   * writes to the object, and makes every write of that update at {@link heads} when the bytes hold them.
   */
  bytes: Schema.optional(Schema.Uint8Array),
  /** Unix ms of the object's creation, sent with a document row's {@link bytes}. */
  createdAt: Schema.optional(Schema.Number),
  /** Unix ms of the object's last change, sent with a document row's {@link bytes}. */
  updatedAt: Schema.optional(Schema.Number),
  /** The state the index evaluated this row at; absent when it does not know it. */
  version: Schema.optional(RowVersion),
  /** Every derivation of a traversal hit, deduped by edge; absent when the answer exceeded its budget. */
  paths: Schema.optional(mutableArray(mutableArray(PathEdge))),
  /** Every member of a collapsed group with its share of the group's scalar aggregates, within budget. */
  manifest: Schema.optional(mutableArray(ManifestEntry)),
});
export interface QueryResult extends Schema.Schema.Type<typeof QueryResult> {}

export const QueryResponse = Schema.Struct({
  queryId: Schema.optional(Schema.String),
  results: Schema.optional(mutableArray(QueryResult)),
  /**
   * The reactive query re-ran and its result is the one last sent; `results` is omitted. Lets a client
   * learn its earlier answer is current again without a resend.
   */
  unchanged: Schema.optional(Schema.Boolean),
  /** Paths or manifests were left out of this answer because they exceeded its byte budget. */
  truncated: Schema.optional(Schema.Literals(['paths', 'manifest'])),
  /** Time (ms) the host spent evaluating this answer, excluding time queued behind other work; absent from an old host. */
  executionTime: Schema.optional(Schema.Number),
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

/**
 * Effect service tag for the `QueryService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/QueryService') {}
