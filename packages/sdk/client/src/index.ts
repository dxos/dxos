//
// Copyright 2020 DXOS.org
//

export { Config, Defaults, Dynamics, Envs, Local, Remote, Storage } from '@dxos/config';
export { PublicKey, type PublicKeyLike } from '@dxos/keys';
// TODO(wittjosiah): Should all api errors be exported here?
export {
  AlreadyJoinedError,
  ApiError,
  CancelledError,
  DataCorruptionError,
  DatabaseError,
  EntityNotFoundError,
  InvalidConfigError,
  InvalidInvitationError,
  InvalidInvitationExtensionRoleError,
  IdentityNotInitializedError,
  InvalidStorageVersionError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  RpcClosedError,
  RpcNotOpenError,
  SystemError,
  UnknownModelError,
} from '@dxos/protocols';

export { Client, type ClientOptions } from './client';
export { DXOS_VERSION } from './version';
