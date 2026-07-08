//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.SpacesService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createSpace', {
    payload: protoMessage('dxos.client.services.CreateSpaceRequest'),
    success: protoMessage('dxos.client.services.Space'),
    error: serviceError,
  }),
  Rpc.make('updateSpace', {
    payload: protoMessage('dxos.client.services.UpdateSpaceRequest'),
    error: serviceError,
  }),
  Rpc.make('querySpaces', {
    success: protoMessage('dxos.client.services.QuerySpacesResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateMemberRole', {
    payload: protoMessage('dxos.client.services.UpdateMemberRoleRequest'),
    error: serviceError,
  }),
  Rpc.make('admitContact', {
    payload: protoMessage('dxos.client.services.AdmitContactRequest'),
    error: serviceError,
  }),
  Rpc.make('joinBySpaceKey', {
    payload: protoMessage('dxos.client.services.JoinBySpaceKeyRequest'),
    success: protoMessage('dxos.client.services.JoinSpaceResponse'),
    error: serviceError,
  }),
  Rpc.make('postMessage', {
    payload: protoMessage('dxos.client.services.PostMessageRequest'),
    error: serviceError,
  }),
  Rpc.make('subscribeMessages', {
    payload: protoMessage('dxos.client.services.SubscribeMessagesRequest'),
    success: protoMessage('dxos.mesh.teleport.gossip.GossipMessage'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('writeCredentials', {
    payload: protoMessage('dxos.client.services.WriteCredentialsRequest'),
    error: serviceError,
  }),
  Rpc.make('queryCredentials', {
    payload: protoMessage('dxos.client.services.QueryCredentialsRequest'),
    success: protoMessage('dxos.halo.credentials.Credential'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('createEpoch', {
    payload: protoMessage('dxos.client.services.CreateEpochRequest'),
    success: protoMessage('dxos.client.services.CreateEpochResponse'),
    error: serviceError,
  }),
  Rpc.make('exportSpace', {
    payload: protoMessage('dxos.client.services.ExportSpaceRequest'),
    success: protoMessage('dxos.client.services.ExportSpaceResponse'),
    error: serviceError,
  }),
  Rpc.make('importSpace', {
    payload: protoMessage('dxos.client.services.ImportSpaceRequest'),
    success: protoMessage('dxos.client.services.ImportSpaceResponse'),
    error: serviceError,
  }),
).prefix('SpacesService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
