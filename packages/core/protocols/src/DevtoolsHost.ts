//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { protoTimestamp, publicKey, timeframe } from './service-schemas.ts';

//
// RPC message schemas.
//

export const GetConfigResponse = Schema.Struct({
  // JSON-encoded configuration object.
  config: Schema.String,
});
export interface GetConfigResponse extends Schema.Schema.Type<typeof GetConfigResponse> {}

export const ResetStorageRequest = Schema.Struct({});
export interface ResetStorageRequest extends Schema.Schema.Type<typeof ResetStorageRequest> {}

export const EnableDebugLoggingRequest = Schema.Struct({
  namespaces: Schema.optional(Schema.String),
});
export interface EnableDebugLoggingRequest extends Schema.Schema.Type<typeof EnableDebugLoggingRequest> {}

export const EnableDebugLoggingResponse = Schema.Struct({
  enabledNamespaces: Schema.optional(Schema.String),
});
export interface EnableDebugLoggingResponse extends Schema.Schema.Type<typeof EnableDebugLoggingResponse> {}

export const SubscribeToKeyringKeysRequest = Schema.Struct({});
export interface SubscribeToKeyringKeysRequest extends Schema.Schema.Type<typeof SubscribeToKeyringKeysRequest> {}

export const KeyRecord = Schema.Struct({
  publicKey: Schema.Uint8Array,
  privateKey: Schema.optional(Schema.Uint8Array),
});
export interface KeyRecord extends Schema.Schema.Type<typeof KeyRecord> {}

export const SubscribeToKeyringKeysResponse = Schema.Struct({
  keys: Schema.optional(Schema.mutable(Schema.Array(KeyRecord))),
});
export interface SubscribeToKeyringKeysResponse extends Schema.Schema.Type<typeof SubscribeToKeyringKeysResponse> {}

export const SubscribeToCredentialMessagesRequest = Schema.Struct({
  spaceKey: Schema.optional(publicKey),
});
export interface SubscribeToCredentialMessagesRequest extends Schema.Schema.Type<
  typeof SubscribeToCredentialMessagesRequest
> {}

export const SubscribeToCredentialMessagesResponse = Schema.Struct({
  messages: Schema.optional(Schema.mutable(Schema.Array(protoMessage('dxos.halo.signed.SignedMessage')))),
});
export interface SubscribeToCredentialMessagesResponse extends Schema.Schema.Type<
  typeof SubscribeToCredentialMessagesResponse
> {}

export const SubscribeToSpacesRequest = Schema.Struct({
  spaceKeys: Schema.optional(Schema.mutable(Schema.Array(publicKey))),
});
export interface SubscribeToSpacesRequest extends Schema.Schema.Type<typeof SubscribeToSpacesRequest> {}

export const SubscribeToItemsRequest = Schema.Struct({});
export interface SubscribeToItemsRequest extends Schema.Schema.Type<typeof SubscribeToItemsRequest> {}

export const SubscribeToItemsResponse = Schema.Struct({
  data: Schema.String,
});
export interface SubscribeToItemsResponse extends Schema.Schema.Type<typeof SubscribeToItemsResponse> {}

export const SubscribeToFeedsRequest = Schema.Struct({
  feedKeys: Schema.optional(Schema.mutable(Schema.Array(publicKey))),
});
export interface SubscribeToFeedsRequest extends Schema.Schema.Type<typeof SubscribeToFeedsRequest> {}

export const SubscribeToFeedBlocksRequest = Schema.Struct({
  spaceKey: Schema.optional(publicKey),
  feedKey: Schema.optional(publicKey),
  maxBlocks: Schema.optional(Schema.Number),
});
export interface SubscribeToFeedBlocksRequest extends Schema.Schema.Type<typeof SubscribeToFeedBlocksRequest> {}

export const GetSpaceSnapshotRequest = Schema.Struct({
  spaceKey: publicKey,
});
export interface GetSpaceSnapshotRequest extends Schema.Schema.Type<typeof GetSpaceSnapshotRequest> {}

export const MutationMeta = Schema.Struct({
  feedKey: Schema.optional(publicKey),
  seq: Schema.optional(Schema.Number),
  memberKey: Schema.optional(publicKey),
  timeframe: Schema.optional(timeframe),
  /**
   * If this mutation was created by this client, this field will be set to the tag in the mutation.
   */
  clientTag: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
});
export interface MutationMeta extends Schema.Schema.Type<typeof MutationMeta> {}

export const Genesis = Schema.Struct({
  modelType: Schema.String,
  modelVersion: Schema.optional(Schema.String),
});
export interface Genesis extends Schema.Schema.Type<typeof Genesis> {}

export const Snapshot = Schema.Struct({
  deleted: Schema.optional(Schema.Boolean),
  parentId: Schema.optional(Schema.String),
  /**
   * Set the model to the provided snapshot.
   */
  model: Schema.optional(protoMessage('google.protobuf.Any')),
});
export interface Snapshot extends Schema.Schema.Type<typeof Snapshot> {}

export const Action = Schema.Enums({
  NOOP: 0,
  DELETE: 1,
  RESTORE: 2,
});
export type Action = Schema.Schema.Type<typeof Action>;

export const Mutation = Schema.Struct({
  meta: Schema.optional(MutationMeta),
  /**
   * Set parent id
   */
  parentId: Schema.optional(Schema.String),
  action: Schema.optional(Action),
  model: Schema.optional(protoMessage('google.protobuf.Any')),
});
export interface Mutation extends Schema.Schema.Type<typeof Mutation> {}

/**
 * Wrapper for all ECHO messages.
 */
export const EchoObject = Schema.Struct({
  objectId: Schema.String,
  /**
   * Metadata for the genesis mutation.
   */
  meta: Schema.optional(MutationMeta),
  /**
   * Present in mutations creating new items and snapshots.
   */
  genesis: Schema.optional(Genesis),
  snapshot: Schema.optional(Snapshot),
  /**
   * May be present in snapshots. In that case the mutations must be applied on top of the snapshot.
   */
  mutations: Schema.optional(Schema.mutable(Schema.Array(Mutation))),
});
export interface EchoObject extends Schema.Schema.Type<typeof EchoObject> {}

/**
 * Database Snapshot
 */
export const EchoSnapshot = Schema.Struct({
  items: Schema.optional(Schema.mutable(Schema.Array(EchoObject))),
});
export interface EchoSnapshot extends Schema.Schema.Type<typeof EchoSnapshot> {}

/**
 * Snapshots define full space state at a given point in time.
 * They must have enough information to be able to recover the space state without reading the feed messages.
 *
 * Each snapshot is identified by a space key and a timeframe.
 * The timeframe defines the set of feed messages that have already been processed.
 * When loading from the snapshot, application would skip all of the feed messages up to (and including) the provided timeframe.
 */
export const SpaceSnapshot = Schema.Struct({
  spaceKey: Schema.Uint8Array,
  timeframe: Schema.optional(timeframe),
  timestamp: Schema.optional(Schema.Number),
  database: EchoSnapshot,
});
export interface SpaceSnapshot extends Schema.Schema.Type<typeof SpaceSnapshot> {}

export const GetSpaceSnapshotResponse = Schema.Struct({
  snapshot: Schema.optional(SpaceSnapshot),
});
export interface GetSpaceSnapshotResponse extends Schema.Schema.Type<typeof GetSpaceSnapshotResponse> {}

export const SaveSpaceSnapshotRequest = Schema.Struct({
  spaceKey: publicKey,
});
export interface SaveSpaceSnapshotRequest extends Schema.Schema.Type<typeof SaveSpaceSnapshotRequest> {}

export const SaveSpaceSnapshotResponse = Schema.Struct({
  snapshot: Schema.optional(SpaceSnapshot),
});
export interface SaveSpaceSnapshotResponse extends Schema.Schema.Type<typeof SaveSpaceSnapshotResponse> {}

export const ClearSnapshotsRequest = Schema.Struct({});
export interface ClearSnapshotsRequest extends Schema.Schema.Type<typeof ClearSnapshotsRequest> {}

export const GetNetworkPeersRequest = Schema.Struct({
  topic: Schema.Uint8Array,
});
export interface GetNetworkPeersRequest extends Schema.Schema.Type<typeof GetNetworkPeersRequest> {}

export const PeerInfo = Schema.Struct({
  id: publicKey,
  state: Schema.String,
  connections: Schema.optional(Schema.mutable(Schema.Array(Schema.Uint8Array))),
});
export interface PeerInfo extends Schema.Schema.Type<typeof PeerInfo> {}

export const GetNetworkPeersResponse = Schema.Struct({
  peers: Schema.optional(Schema.mutable(Schema.Array(PeerInfo))),
});
export interface GetNetworkPeersResponse extends Schema.Schema.Type<typeof GetNetworkPeersResponse> {}

export const Topic = Schema.Struct({
  topic: publicKey,
  label: Schema.optional(Schema.String),
});
export interface Topic extends Schema.Schema.Type<typeof Topic> {}

export const SubscribeToNetworkTopicsResponse = Schema.Struct({
  topics: Schema.optional(Schema.mutable(Schema.Array(Topic))),
});
export interface SubscribeToNetworkTopicsResponse extends Schema.Schema.Type<typeof SubscribeToNetworkTopicsResponse> {}

export const SubscribeToSwarmInfoRequest = Schema.Struct({});
export interface SubscribeToSwarmInfoRequest extends Schema.Schema.Type<typeof SubscribeToSwarmInfoRequest> {}

export const ConnectionEvent = Schema.Struct({
  type: Schema.String,
  newState: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export interface ConnectionEvent extends Schema.Schema.Type<typeof ConnectionEvent> {}

export const StreamStats = Schema.Struct({
  id: Schema.Number,
  tag: Schema.String,
  contentType: Schema.optional(Schema.String),
  bytesSent: Schema.Number,
  bytesReceived: Schema.Number,
  bytesSentRate: Schema.optional(Schema.Number),
  bytesReceivedRate: Schema.optional(Schema.Number),
  writeBufferSize: Schema.optional(Schema.Number),
});
export interface StreamStats extends Schema.Schema.Type<typeof StreamStats> {}

export const ConnectionInfo = Schema.Struct({
  state: Schema.String,
  sessionId: publicKey,
  remotePeerId: publicKey,
  transport: Schema.optional(Schema.String),
  protocolExtensions: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  events: Schema.optional(Schema.mutable(Schema.Array(ConnectionEvent))),
  streams: Schema.optional(Schema.mutable(Schema.Array(StreamStats))),
  closeReason: Schema.optional(Schema.String),
  identity: Schema.optional(Schema.String),
  readBufferSize: Schema.optional(Schema.Number),
  writeBufferSize: Schema.optional(Schema.Number),
  lastUpdate: Schema.optional(protoTimestamp),
  transportDetails: Schema.optional(Schema.String),
  transportBytesSent: Schema.optional(Schema.Number),
  transportBytesReceived: Schema.optional(Schema.Number),
  transportPacketsSent: Schema.optional(Schema.Number),
  transportPacketsReceived: Schema.optional(Schema.Number),
});
export interface ConnectionInfo extends Schema.Schema.Type<typeof ConnectionInfo> {}

export const SwarmInfo = Schema.Struct({
  id: publicKey,
  topic: publicKey,
  label: Schema.optional(Schema.String),
  isActive: Schema.Boolean,
  connections: Schema.optional(Schema.mutable(Schema.Array(ConnectionInfo))),
});
export interface SwarmInfo extends Schema.Schema.Type<typeof SwarmInfo> {}

export const SubscribeToSwarmInfoResponse = Schema.Struct({
  data: Schema.optional(Schema.mutable(Schema.Array(SwarmInfo))),
});
export interface SubscribeToSwarmInfoResponse extends Schema.Schema.Type<typeof SubscribeToSwarmInfoResponse> {}

export const ExportSqliteDatabaseResponse = Schema.Struct({
  data: Schema.Uint8Array,
});
export interface ExportSqliteDatabaseResponse extends Schema.Schema.Type<typeof ExportSqliteDatabaseResponse> {}

export const RunSqliteQueryRequest = Schema.Struct({
  query: Schema.String,
  params: Schema.optional(Schema.String),
});
export interface RunSqliteQueryRequest extends Schema.Schema.Type<typeof RunSqliteQueryRequest> {}

export const RunSqliteQueryResponse = Schema.Struct({
  rows: Schema.String,
  error: Schema.optional(Schema.String),
});
export interface RunSqliteQueryResponse extends Schema.Schema.Type<typeof RunSqliteQueryResponse> {}

/**
 * Effect RPC definitions for `dxos.devtools.host.DevtoolsHost`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  // Subscribe to server-to-client events.
  Rpc.make('events', {
    success: protoMessage('dxos.devtools.host.Event'),
    error: serviceError,
    stream: true,
  }),
  // Get client config.
  Rpc.make('getConfig', {
    success: GetConfigResponse,
    error: serviceError,
  }),
  Rpc.make('getStorageInfo', {
    success: protoMessage('dxos.devtools.host.StorageInfo'),
    error: serviceError,
  }),
  Rpc.make('resetStorage', {
    payload: ResetStorageRequest,
    error: serviceError,
  }),
  Rpc.make('getBlobs', {
    success: protoMessage('dxos.devtools.host.GetBlobsResponse'),
    error: serviceError,
  }),
  Rpc.make('getSnapshots', {
    success: protoMessage('dxos.devtools.host.GetSnapshotsResponse'),
    error: serviceError,
  }),
  Rpc.make('enableDebugLogging', {
    payload: EnableDebugLoggingRequest,
    success: EnableDebugLoggingResponse,
    error: serviceError,
  }),
  Rpc.make('disableDebugLogging', {
    payload: EnableDebugLoggingRequest,
    success: EnableDebugLoggingResponse,
    error: serviceError,
  }),
  Rpc.make('subscribeToKeyringKeys', {
    payload: SubscribeToKeyringKeysRequest,
    success: SubscribeToKeyringKeysResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToCredentialMessages', {
    payload: SubscribeToCredentialMessagesRequest,
    success: SubscribeToCredentialMessagesResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToSpaces', {
    payload: SubscribeToSpacesRequest,
    success: protoMessage('dxos.devtools.host.SubscribeToSpacesResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToItems', {
    payload: SubscribeToItemsRequest,
    success: SubscribeToItemsResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToFeeds', {
    payload: SubscribeToFeedsRequest,
    success: protoMessage('dxos.devtools.host.SubscribeToFeedsResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToFeedBlocks', {
    payload: SubscribeToFeedBlocksRequest,
    success: protoMessage('dxos.devtools.host.SubscribeToFeedBlocksResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToMetadata', {
    success: protoMessage('dxos.devtools.host.SubscribeToMetadataResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('getSpaceSnapshot', {
    payload: GetSpaceSnapshotRequest,
    success: GetSpaceSnapshotResponse,
    error: serviceError,
  }),
  Rpc.make('saveSpaceSnapshot', {
    payload: SaveSpaceSnapshotRequest,
    success: SaveSpaceSnapshotResponse,
    error: serviceError,
  }),
  Rpc.make('clearSnapshots', {
    payload: ClearSnapshotsRequest,
    error: serviceError,
  }),
  Rpc.make('getNetworkPeers', {
    payload: GetNetworkPeersRequest,
    success: GetNetworkPeersResponse,
    error: serviceError,
  }),
  Rpc.make('subscribeToNetworkTopics', {
    success: SubscribeToNetworkTopicsResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToSignalStatus', {
    success: protoMessage('dxos.devtools.host.SubscribeToSignalStatusResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToSignal', {
    success: protoMessage('dxos.devtools.host.SignalResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToSwarmInfo', {
    payload: SubscribeToSwarmInfoRequest,
    success: SubscribeToSwarmInfoResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('exportSqliteDatabase', {
    success: ExportSqliteDatabaseResponse,
    error: serviceError,
  }),
  Rpc.make('runSqliteQuery', {
    payload: RunSqliteQueryRequest,
    success: RunSqliteQueryResponse,
    error: serviceError,
  }),
).prefix('DevtoolsHost.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
