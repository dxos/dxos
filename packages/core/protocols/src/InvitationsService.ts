//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';

//
// RPC message schemas.
//

export const AcceptInvitationRequest = Schema.Struct({
  invitation: protoMessage('dxos.client.services.Invitation'),
  deviceProfile: Schema.optional(protoMessage('dxos.halo.credentials.DeviceProfileDocument')),
});
export interface AcceptInvitationRequest extends Schema.Schema.Type<typeof AcceptInvitationRequest> {}

export const AuthenticationRequest = Schema.Struct({
  invitationId: Schema.String,
  authCode: Schema.String,
});
export interface AuthenticationRequest extends Schema.Schema.Type<typeof AuthenticationRequest> {}

export const CancelInvitationRequest = Schema.Struct({
  invitationId: Schema.String,
});
export interface CancelInvitationRequest extends Schema.Schema.Type<typeof CancelInvitationRequest> {}

/**
 * Effect RPC definitions for `dxos.client.services.InvitationsService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createInvitation', {
    payload: protoMessage('dxos.client.services.Invitation'),
    success: protoMessage('dxos.client.services.Invitation'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('acceptInvitation', {
    payload: AcceptInvitationRequest,
    success: protoMessage('dxos.client.services.Invitation'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('authenticate', {
    payload: AuthenticationRequest,
    error: serviceError,
  }),
  Rpc.make('cancelInvitation', {
    payload: CancelInvitationRequest,
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

/**
 * Effect service tag for the `InvitationsService` RPC handlers.
 */
export class Tag extends Context.Tag('@dxos/protocols/rpc/InvitationsService')<Tag, Handlers>() {}
