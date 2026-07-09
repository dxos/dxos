//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.InvitationsService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createInvitation', {
    payload: protoMessage('dxos.client.services.Invitation'),
    success: protoMessage('dxos.client.services.Invitation'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('acceptInvitation', {
    payload: protoMessage('dxos.client.services.AcceptInvitationRequest'),
    success: protoMessage('dxos.client.services.Invitation'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('authenticate', {
    payload: protoMessage('dxos.client.services.AuthenticationRequest'),
    error: serviceError,
  }),
  Rpc.make('cancelInvitation', {
    payload: protoMessage('dxos.client.services.CancelInvitationRequest'),
    error: serviceError,
  }),
  Rpc.make('queryInvitations', {
    success: protoMessage('dxos.client.services.QueryInvitationsResponse'),
    error: serviceError,
    stream: true,
  }),
).prefix('InvitationsService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
