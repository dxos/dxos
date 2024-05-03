//
// Copyright 2020 DXOS.org
//

export { Config, Defaults, Dynamics, Envs, Local, Remote, Storage } from '@dxos/config';
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
  InvalidInvitationError,
  InvalidInvitationExtensionRoleError,
  AlreadyJoinedError,
  IdentityNotInitializedError,
  InvalidStorageVersionError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  DataCorruptionError,
  EntityNotFoundError,
  UnknownModelError,
} from '@dxos/protocols';

export { Client, type ClientOptions } from './client';
export { DXOS_VERSION } from './version';
