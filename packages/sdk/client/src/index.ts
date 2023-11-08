//
// Copyright 2020 DXOS.org
//

export { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';
export { PublicKey, type PublicKeyLike } from '@dxos/keys';
// TODO(wittjosiah): Should all api errors be exported here?
export {
  ApiError,
  SystemError,
  DatabaseError,
  RpcClosedError,
  RpcNotOpenError,
  CancelledError,
  InvalidConfigError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  DataCorruptionError,
  InvalidInvitationExtensionRoleError,
  IdentityNotInitializedError,
  InvalidInvitationError,
  InvalidStorageVersionError,
  SpaceNotFoundError,
  EntityNotFoundError,
  UnknownModelError,
} from '@dxos/protocols';

export { Client, type ClientOptions } from './client';
