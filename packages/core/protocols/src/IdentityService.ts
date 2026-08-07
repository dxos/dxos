//
// Copyright 2026 DXOS.org
//

import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { protoMessage, serviceError } from './service-rpc.ts';
import { publicKey } from './service-schemas.ts';

//
// RPC message schemas.
//

export const CreateIdentityRequest = Schema.Struct({
  profile: Schema.optional(protoMessage('dxos.halo.credentials.ProfileDocument')),
  deviceProfile: Schema.optional(protoMessage('dxos.halo.credentials.DeviceProfileDocument')),
});
export interface CreateIdentityRequest extends Schema.Schema.Type<typeof CreateIdentityRequest> {}

export const RequestRecoveryChallengeResponse = Schema.Struct({
  deviceKey: publicKey,
  controlFeedKey: publicKey,
  challenge: Schema.String,
});
export interface RequestRecoveryChallengeResponse extends Schema.Schema.Type<typeof RequestRecoveryChallengeResponse> {}

export const RecoveryCredentialData = Schema.Struct({
  /**
   * Recovery key used to validate recovery challenge signature.
   */
  recoveryKey: publicKey,
  /**
   * Public key used to identify the recovery key.
   */
  lookupKey: publicKey,
  /**
   * Algorithm used to generate the recovery key.
   */
  algorithm: Schema.String,
});
export interface RecoveryCredentialData extends Schema.Schema.Type<typeof RecoveryCredentialData> {}

export const CreateRecoveryCredentialRequest = Schema.Struct({
  /**
   * If not provided, a new key will be generated.
   */
  data: Schema.optional(RecoveryCredentialData),
});
export interface CreateRecoveryCredentialRequest extends Schema.Schema.Type<typeof CreateRecoveryCredentialRequest> {}

export const CreateRecoveryCredentialResponse = Schema.Struct({
  recoveryCode: Schema.optional(Schema.String),
});
export interface CreateRecoveryCredentialResponse extends Schema.Schema.Type<typeof CreateRecoveryCredentialResponse> {}

export const QueryIdentityResponse = Schema.Struct({
  identity: Schema.optional(protoMessage('dxos.client.services.Identity')),
});
export interface QueryIdentityResponse extends Schema.Schema.Type<typeof QueryIdentityResponse> {}

export const SignPresentationRequest = Schema.Struct({
  presentation: protoMessage('dxos.halo.credentials.Presentation'),
  nonce: Schema.optional(Schema.Uint8Array),
});
export interface SignPresentationRequest extends Schema.Schema.Type<typeof SignPresentationRequest> {}

// TODO(wittjosiah): Align pluralization with other services.
/**
 * Effect RPC definitions for `dxos.client.services.IdentityService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  Rpc.make('createIdentity', {
    payload: CreateIdentityRequest,
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('requestRecoveryChallenge', {
    success: RequestRecoveryChallengeResponse,
    error: serviceError,
  }),
  Rpc.make('recoverIdentity', {
    payload: protoMessage('dxos.client.services.RecoverIdentityRequest'),
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('createRecoveryCredential', {
    payload: CreateRecoveryCredentialRequest,
    success: CreateRecoveryCredentialResponse,
    error: serviceError,
  }),
  Rpc.make('queryIdentity', {
    success: QueryIdentityResponse,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateProfile', {
    payload: protoMessage('dxos.halo.credentials.ProfileDocument'),
    success: protoMessage('dxos.client.services.Identity'),
    error: serviceError,
  }),
  Rpc.make('signPresentation', {
    payload: SignPresentationRequest,
    success: protoMessage('dxos.halo.credentials.Presentation'),
    error: serviceError,
  }),
  Rpc.make('createAuthCredential', {
    success: protoMessage('dxos.halo.credentials.Credential'),
    error: serviceError,
  }),
).prefix('IdentityService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `IdentityService` RPC handlers.
 */
export class Tag extends Context.Tag('@dxos/protocols/rpc/IdentityService')<Tag, Handlers>() {}
