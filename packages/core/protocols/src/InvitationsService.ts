//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { InvitationSchema } from './buf/proto/gen/dxos/client/invitation_pb.ts';
import { QueryInvitationsResponseSchema } from './buf/proto/gen/dxos/client/services_pb.ts';
import { bufMessage, protoMessage, serviceError } from './service-rpc.ts';

//
// RPC message schemas.
//

export const AcceptInvitationRequest = Schema.Struct({
  invitation: bufMessage(InvitationSchema),
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
    payload: bufMessage(InvitationSchema),
    success: bufMessage(InvitationSchema),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('acceptInvitation', {
    payload: AcceptInvitationRequest,
    success: bufMessage(InvitationSchema),
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
    success: bufMessage(QueryInvitationsResponseSchema),
    error: serviceError,
    stream: true,
  }),
).prefix('InvitationsService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `InvitationsService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/InvitationsService') {}
