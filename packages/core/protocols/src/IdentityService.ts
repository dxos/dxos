//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for `dxos.client.services.IdentityService`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createIdentity', {
    payload: protoMessage('dxos.client.services.CreateIdentityRequest'),
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('requestRecoveryChallenge', {
    success: protoMessage('dxos.client.services.RequestRecoveryChallengeResponse'),
    error: serviceError,
  }),
  Rpc.make('recoverIdentity', {
    payload: protoMessage('dxos.client.services.RecoverIdentityRequest'),
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('createRecoveryCredential', {
    payload: protoMessage('dxos.client.services.CreateRecoveryCredentialRequest'),
    success: protoMessage('dxos.client.services.CreateRecoveryCredentialResponse'),
    error: serviceError,
  }),
  Rpc.make('queryIdentity', {
    success: protoMessage('dxos.client.services.QueryIdentityResponse'),
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateProfile', {
    payload: protoMessage('dxos.halo.credentials.ProfileDocument'),
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('signPresentation', {
    payload: protoMessage('dxos.client.services.SignPresentationRequest'),
    success: protoMessage('dxos.halo.credentials.Presentation'),
    error: serviceError,
  }),
  Rpc.make('createAuthCredential', {
    success: protoMessage('dxos.halo.credentials.Credential'),
    error: serviceError,
  }),
).prefix('IdentityService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
