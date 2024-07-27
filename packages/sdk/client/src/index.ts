//
// Copyright 2020 DXOS.org
//

export { type ClientServices, type ClientServicesProvider, type ShellRuntime } from '@dxos/client-protocol';
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
export { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
export {
  type AppContextRequest,
  type LayoutRequest,
  type InvitationUrlRequest,
  ShellDisplay,
  ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

export * from './client';
export * from './services';
export { DXOS_VERSION } from './version';
