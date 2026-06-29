//
// Copyright 2020 DXOS.org
//

export { type ClientServices, type ClientServicesProvider, type ShellRuntime } from '@dxos/client-protocol';
export { Config, ConfigService, Defaults, Dynamics, Envs, Local, Remote, Storage } from '@dxos/config';
export { PublicKey, type PublicKeyLike } from '@dxos/keys';
export {
  AlreadyJoinedError,
  ApiError,
  CancelledError,
  DatabaseError,
  DataCorruptionError,
  EntityNotFoundError,
  IdentityNotInitializedError,
  InvalidConfigError,
  InvalidInvitationError,
  InvalidInvitationExtensionRoleError,
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
  type InvitationUrlRequest,
  type LayoutRequest,
  ShellDisplay,
  ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

// TODO(burdon): Use "export *" and @internal to restrict exports.
// TODO(wittjosiah): Should all api errors be exported here?

// For some reason the * re-export from ./client gets removed by TSC. Looks like a compiler bug.
export { Client } from './client';
export * from './client';
export * from './edge';
export * from './services';
export * from './version';
