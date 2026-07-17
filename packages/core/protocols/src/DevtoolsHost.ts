//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { mutableArray, protoTimestamp, publicKey } from './service-schemas.ts';

//
// RPC message schemas.
//

export const GetConfigResponse = Schema.Struct({
  /** JSON-encoded configuration object. */
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
  keys: Schema.optional(mutableArray(KeyRecord)),
});
export interface SubscribeToKeyringKeysResponse extends Schema.Schema.Type<typeof SubscribeToKeyringKeysResponse> {}

export const SubscribeToCredentialMessagesRequest = Schema.Struct({
  spaceKey: Schema.optional(publicKey),
});
export interface SubscribeToCredentialMessagesRequest extends Schema.Schema.Type<
  typeof SubscribeToCredentialMessagesRequest
> {}

export const SubscribeToCredentialMessagesResponse = Schema.Struct({
  messages: Schema.optional(mutableArray(protoMessage('dxos.halo.signed.SignedMessage'))),
});
export interface SubscribeToCredentialMessagesResponse extends Schema.Schema.Type<
  typeof SubscribeToCredentialMessagesResponse
> {}

export const SubscribeToSpacesRequest = Schema.Struct({
  spaceKeys: mutableArray(publicKey),
});
export interface SubscribeToSpacesRequest extends Schema.Schema.Type<typeof SubscribeToSpacesRequest> {}

export const SubscribeToItemsRequest = Schema.Struct({});
export interface SubscribeToItemsRequest extends Schema.Schema.Type<typeof SubscribeToItemsRequest> {}

export const SubscribeToItemsResponse = Schema.Struct({
  /** JSON-encoded payload. */
  data: Schema.String,
});
export interface SubscribeToItemsResponse extends Schema.Schema.Type<typeof SubscribeToItemsResponse> {}

export const SubscribeToFeedsRequest = Schema.Struct({
  feedKeys: mutableArray(publicKey),
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

// The space snapshot subgraph (`SpaceSnapshot` / `EchoSnapshot` / `EchoObject` / …) embeds the
// `Timeframe` proto substitution (a class with a `frames()` accessor). That class cannot be modeled
// as an inline Effect struct, so the snapshot responses stay protobuf-encoded (`protoMessage`).

export const SaveSpaceSnapshotRequest = Schema.Struct({
  spaceKey: publicKey,
});
export interface SaveSpaceSnapshotRequest extends Schema.Schema.Type<typeof SaveSpaceSnapshotRequest> {}

export const ClearSnapshotsRequest = Schema.Struct({});
export interface ClearSnapshotsRequest extends Schema.Schema.Type<typeof ClearSnapshotsRequest> {}

export const GetNetworkPeersRequest = Schema.Struct({
  topic: Schema.Uint8Array,
});
export interface GetNetworkPeersRequest extends Schema.Schema.Type<typeof GetNetworkPeersRequest> {}

export const PeerInfo = Schema.Struct({
  id: publicKey,
  /** PeerState enum. */
  state: Schema.String,
  connections: Schema.optional(mutableArray(Schema.Uint8Array)),
});
export interface PeerInfo extends Schema.Schema.Type<typeof PeerInfo> {}

export const GetNetworkPeersResponse = Schema.Struct({
  peers: Schema.optional(mutableArray(PeerInfo)),
});
export interface GetNetworkPeersResponse extends Schema.Schema.Type<typeof GetNetworkPeersResponse> {}

export const Topic = Schema.Struct({
  topic: publicKey,
  label: Schema.optional(Schema.String),
});
export interface Topic extends Schema.Schema.Type<typeof Topic> {}

export const SubscribeToNetworkTopicsResponse = Schema.Struct({
  topics: Schema.optional(mutableArray(Topic)),
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
  protocolExtensions: Schema.optional(mutableArray(Schema.String)),
  events: Schema.optional(mutableArray(ConnectionEvent)),
  streams: Schema.optional(mutableArray(StreamStats)),
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
  connections: Schema.optional(mutableArray(ConnectionInfo)),
});
export interface SwarmInfo extends Schema.Schema.Type<typeof SwarmInfo> {}

export const SubscribeToSwarmInfoResponse = Schema.Struct({
  data: Schema.optional(mutableArray(SwarmInfo)),
});
export interface SubscribeToSwarmInfoResponse extends Schema.Schema.Type<typeof SubscribeToSwarmInfoResponse> {}

export const ExportSqliteDatabaseResponse = Schema.Struct({
  data: Schema.Uint8Array,
});
export interface ExportSqliteDatabaseResponse extends Schema.Schema.Type<typeof ExportSqliteDatabaseResponse> {}

export const RunSqliteQueryRequest = Schema.Struct({
  query: Schema.String,
  /** JSON-encoded array of query parameters. */
  params: Schema.optional(Schema.String),
});
export interface RunSqliteQueryRequest extends Schema.Schema.Type<typeof RunSqliteQueryRequest> {}

export const RunSqliteQueryResponse = Schema.Struct({
  /** JSON-encoded array of row objects. */
  rows: Schema.String,
  error: Schema.optional(Schema.String),
});
export interface RunSqliteQueryResponse extends Schema.Schema.Type<typeof RunSqliteQueryResponse> {}

/**
 * Effect RPC definitions for `dxos.devtools.host.DevtoolsHost`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  /** Subscribe to server-to-client events. */
  Rpc.make('events', {
    success: protoMessage('dxos.devtools.host.Event'),
    error: serviceError,
    stream: true,
  }),
  /** Get client config. */
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
    success: protoMessage('dxos.devtools.host.GetSpaceSnapshotResponse'),
    error: serviceError,
  }),
  Rpc.make('saveSpaceSnapshot', {
    payload: SaveSpaceSnapshotRequest,
    success: protoMessage('dxos.devtools.host.SaveSpaceSnapshotResponse'),
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
