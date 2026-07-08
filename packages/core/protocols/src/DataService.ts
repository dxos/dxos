//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.echo.service.DataService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('subscribe', {
    payload: protoMessage('dxos.echo.service.SubscribeRequest'),
    success: protoMessage('dxos.echo.service.BatchedDocumentUpdates'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateSubscription', {
    payload: protoMessage('dxos.echo.service.UpdateSubscriptionRequest'),
    error: serviceError,
  }),
  Rpc.make('createDocument', {
    payload: protoMessage('dxos.echo.service.CreateDocumentRequest'),
    success: protoMessage('dxos.echo.service.CreateDocumentResponse'),
    error: serviceError,
  }),
  Rpc.make('update', {
    payload: protoMessage('dxos.echo.service.UpdateRequest'),
    error: serviceError,
  }),
  Rpc.make('flush', {
    payload: protoMessage('dxos.echo.service.FlushRequest'),
    error: serviceError,
  }),
  Rpc.make('getDocumentHeads', {
    payload: protoMessage('dxos.echo.service.GetDocumentHeadsRequest'),
    success: protoMessage('dxos.echo.service.GetDocumentHeadsResponse'),
    error: serviceError,
  }),
  Rpc.make('waitUntilHeadsReplicated', {
    payload: protoMessage('dxos.echo.service.WaitUntilHeadsReplicatedRequest'),
    error: serviceError,
  }),
  Rpc.make('reIndexHeads', {
    payload: protoMessage('dxos.echo.service.ReIndexHeadsRequest'),
    error: serviceError,
  }),
  Rpc.make('updateIndexes', {
    error: serviceError,
  }),
  Rpc.make('subscribeSpaceSyncState', {
    payload: protoMessage('dxos.echo.service.GetSpaceSyncStateRequest'),
    success: protoMessage('dxos.echo.service.SpaceSyncState'),
    error: serviceError,
    stream: true,
  }),
).prefix('DataService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
