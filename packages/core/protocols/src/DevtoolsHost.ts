//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.devtools.host.DevtoolsHost`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('events', {
    success: protoMessage('dxos.devtools.host.Event'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('getConfig', {
    success: protoMessage('dxos.devtools.host.GetConfigResponse'),
    error: serviceError,
  }),
  Rpc.make('getStorageInfo', {
    success: protoMessage('dxos.devtools.host.StorageInfo'),
    error: serviceError,
  }),
  Rpc.make('resetStorage', {
    payload: protoMessage('dxos.devtools.host.ResetStorageRequest'),
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
    payload: protoMessage('dxos.devtools.host.EnableDebugLoggingRequest'),
    success: protoMessage('dxos.devtools.host.EnableDebugLoggingResponse'),
    error: serviceError,
  }),
  Rpc.make('disableDebugLogging', {
    payload: protoMessage('dxos.devtools.host.EnableDebugLoggingRequest'),
    success: protoMessage('dxos.devtools.host.EnableDebugLoggingResponse'),
    error: serviceError,
  }),
  Rpc.make('subscribeToKeyringKeys', {
    payload: protoMessage('dxos.devtools.host.SubscribeToKeyringKeysRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToKeyringKeysResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToCredentialMessages', {
    payload: protoMessage('dxos.devtools.host.SubscribeToCredentialMessagesRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToCredentialMessagesResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToSpaces', {
    payload: protoMessage('dxos.devtools.host.SubscribeToSpacesRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToSpacesResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToItems', {
    payload: protoMessage('dxos.devtools.host.SubscribeToItemsRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToItemsResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToFeeds', {
    payload: protoMessage('dxos.devtools.host.SubscribeToFeedsRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToFeedsResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('subscribeToFeedBlocks', {
    payload: protoMessage('dxos.devtools.host.SubscribeToFeedBlocksRequest'),
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
    payload: protoMessage('dxos.devtools.host.GetSpaceSnapshotRequest'),
    success: protoMessage('dxos.devtools.host.GetSpaceSnapshotResponse'),
    error: serviceError,
  }),
  Rpc.make('saveSpaceSnapshot', {
    payload: protoMessage('dxos.devtools.host.SaveSpaceSnapshotRequest'),
    success: protoMessage('dxos.devtools.host.SaveSpaceSnapshotResponse'),
    error: serviceError,
  }),
  Rpc.make('clearSnapshots', {
    payload: protoMessage('dxos.devtools.host.ClearSnapshotsRequest'),
    error: serviceError,
  }),
  Rpc.make('getNetworkPeers', {
    payload: protoMessage('dxos.devtools.host.GetNetworkPeersRequest'),
    success: protoMessage('dxos.devtools.host.GetNetworkPeersResponse'),
    error: serviceError,
  }),
  Rpc.make('subscribeToNetworkTopics', {
    success: protoMessage('dxos.devtools.host.SubscribeToNetworkTopicsResponse'),
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
    payload: protoMessage('dxos.devtools.host.SubscribeToSwarmInfoRequest'),
    success: protoMessage('dxos.devtools.host.SubscribeToSwarmInfoResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('exportSqliteDatabase', {
    success: protoMessage('dxos.devtools.host.ExportSqliteDatabaseResponse'),
    error: serviceError,
  }),
  Rpc.make('runSqliteQuery', {
    payload: protoMessage('dxos.devtools.host.RunSqliteQueryRequest'),
    success: protoMessage('dxos.devtools.host.RunSqliteQueryResponse'),
    error: serviceError,
  }),
).prefix('DevtoolsHost.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
